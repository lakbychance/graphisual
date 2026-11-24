/**
 * The old coarse steps the landing pages still play, derived from the engine's events exactly as
 * the adapters did before the app moved to frames (task 0.4). One step per visited node (or
 * relaxation, for Bellman-Ford), then one step per edge of the answer.
 * TEMPORARY: delete this file with `engine.ts` in task 0.5, when the pages use frames too.
 */
import { algorithmRegistry, type AlgorithmInput, type DataStructureState } from "@/algorithms";
import { nid } from "@/algorithms/traceHelpers";
import { frameAt, stepEnds, type AlgorithmEvent, type SettleEvent } from "@/algorithms/engine";
import { EDGE_TYPE } from "@/constants/graph";

export enum StepType {
  VISIT = "visit",
  RESULT = "result",
  CYCLE = "cycle",
}

export interface LegacyStep {
  type: StepType;
  /** The edge the step walks (`from` is -1 for a step that names only a node). */
  edge: { from: number; to: number };
  trace?: { message: string; dataStructure?: DataStructureState };
}

type Steps = Generator<LegacyStep, void, undefined>;

/** Nodes the run knows about, in the order Dijkstra's scans them for the closest one. */
function nodeOrder({ adjacencyList, startNodeId, endNodeId }: AlgorithmInput): number[] {
  const order = [...adjacencyList.keys()];
  for (const id of [startNodeId, endNodeId]) if (id !== undefined && !order.includes(id)) order.push(id);
  return order;
}

function* routeSteps(start: number, path: number[]): Steps {
  yield { type: StepType.RESULT, edge: { from: -1, to: start } };
  for (let i = 1; i < path.length; i++) yield { type: StepType.RESULT, edge: { from: path[i - 1], to: path[i] } };
}

function* dijkstraSteps(events: AlgorithmEvent[], input: AlgorithmInput): Steps {
  const { adjacencyList, startNodeId: start } = input;
  const order = nodeOrder(input);

  // Unsettled nodes with a known distance, closest first (scan order breaks ties).
  const queueOf = (settled: readonly number[], dist: ReadonlyMap<number, number>) =>
    order
      .filter((id) => !settled.includes(id) && (dist.get(id) ?? Infinity) !== Infinity)
      .map((id) => ({ id, value: dist.get(id) as number }))
      .sort((a, b) => a.value - b.value);

  let from = 0;
  for (const end of stepEnds(events, "overview")) {
    const group = events.slice(from, end);
    from = end;
    const [first] = group;

    if (first.type === "answer" && first.kind === "route") {
      if (first.path) yield* routeSteps(start, first.path);
      return;
    }
    if (first.type !== "settle") continue;

    const settle: SettleEvent = first;
    const node = settle.node;
    const value = settle.value as number;
    const frame = frameAt(events, end);

    if (settle.target && settle.via === undefined) {
      yield {
        type: StepType.VISIT,
        edge: { from: -1, to: node },
        trace: {
          message: `**Start and destination are the same** (node ${nid(node)})`,
          dataStructure: { type: "priority-queue", items: [], processing: { id: node, value: 0 } },
        },
      };
      continue;
    }

    if (settle.target) {
      // The old app checked the destination's edges before stopping, so its last queue shows them.
      const dist = new Map(frame.dist);
      for (const edge of adjacencyList.get(node) ?? []) {
        if (frame.settled.includes(edge.to) || !order.includes(edge.to)) continue;
        if (value + edge.weight < (dist.get(edge.to) ?? Infinity)) dist.set(edge.to, value + edge.weight);
      }
      yield {
        type: StepType.VISIT,
        edge: { from: settle.via ?? -1, to: node },
        trace: {
          message: `**Found destination node ${nid(node)}!**`,
          dataStructure: { type: "priority-queue", items: queueOf(frame.settled, dist), processing: { id: node, value } },
        },
      };
      continue;
    }

    const updated = group.flatMap((e) => (e.type === "relax" ? [e.to] : []));
    const lead = settle.via === undefined ? `**Starting at node ${nid(node)}**` : `**Visiting node ${nid(node)}**`;
    yield {
      type: StepType.VISIT,
      edge: { from: settle.via ?? -1, to: node },
      trace: {
        message: updated.length > 0 ? `${lead}, updated **${updated.map(nid).join(", ")}**` : lead,
        dataStructure: {
          type: "priority-queue",
          items: queueOf(frame.settled, frame.dist),
          processing: { id: node, value },
          justAdded: updated.length > 0 ? updated : undefined,
        },
      },
    };
  }
}

function* searchSteps(events: AlgorithmEvent[], kind: "queue" | "stack"): Steps {
  let from = 0;
  for (const end of stepEnds(events, "overview")) {
    const group = events.slice(from, end);
    from = end;
    const [first] = group;

    if (first.type === "answer") {
      if (first.kind === "route" && first.path) yield* routeSteps(first.start, first.path);
      return;
    }
    if (first.type !== "settle") continue;

    const node = first.node;
    const items = frameAt(events, end).queue.map((item) => ({ id: item.id }));
    if (first.target) {
      yield first.via === undefined
        ? {
          type: StepType.VISIT,
          edge: { from: -1, to: node },
          trace: {
            message: `**Start and destination are the same** (node ${nid(node)})`,
            dataStructure: { type: kind, items: [], processing: { id: node } },
          },
        }
        : {
          type: StepType.VISIT,
          edge: { from: first.via, to: node },
          trace: { message: `**Found destination node ${nid(node)}!**`, dataStructure: { type: kind, items, processing: { id: node } } },
        };
      continue;
    }

    const added = group.flatMap((e) => (e.type === "enqueue" ? [e.node] : []));
    // The stack pushes last-first; the old app listed what was pushed in the neighbours' own order.
    if (kind === "stack") added.reverse();
    const what = kind === "queue" ? "added" : "pushed";
    yield {
      type: StepType.VISIT,
      edge: { from: first.via ?? -1, to: node },
      trace: {
        message: added.length > 0
          ? `**Visiting node ${nid(node)}**, ${what} **${added.map(nid).join(", ")}** to ${kind}`
          : `**Visiting node ${nid(node)}**`,
        dataStructure: { type: kind, items, processing: { id: node }, justAdded: added.length > 0 ? added : undefined },
      },
    };
  }
}

function* primsSteps(events: AlgorithmEvent[], input: AlgorithmInput): Steps {
  // The order the old app scanned keys in: the graph's nodes, then any node first given a key later.
  const order = [...input.adjacencyList.keys()];
  if (!order.includes(input.startNodeId)) order.push(input.startNodeId);
  const key = new Map<number, number>();
  const tree = new Set<number>();
  let total = 0;

  for (let i = 0; i < events.length; i++) {
    const settle = events[i];
    if (settle.type !== "settle") continue;
    const node = settle.node;
    const weight = settle.via === undefined ? 0 : (settle.value as number);
    tree.add(node);
    total += weight;
    const updated: number[] = [];
    for (let j = i + 1; j < events.length && events[j].group === settle.group; j++) {
      const e = events[j];
      if (e.type !== "relax") continue;
      if (!order.includes(e.to)) order.push(e.to);
      key.set(e.to, e.next);
      updated.push(e.to);
    }

    let message = settle.via === undefined
      ? `**Starting at node ${nid(node)}**`
      : `**Adding edge ${nid(settle.via)}→${nid(node)}** (weight: ${weight})`;
    if (updated.length > 0) message += `, updated **${updated.map(nid).join(", ")}**`;
    message += `\nMST: **${tree.size}** nodes, total weight: **${total}**`;

    yield {
      type: StepType.VISIT,
      edge: { from: settle.via ?? -1, to: node },
      trace: {
        message,
        dataStructure: {
          type: "priority-queue",
          items: order
            .filter((id) => !tree.has(id) && key.has(id))
            .map((id) => ({ id, value: key.get(id) as number }))
            .sort((a, b) => a.value - b.value),
          processing: { id: node, value: weight },
          justAdded: updated.length > 0 ? updated : undefined,
        },
      },
    };
  }
}

function* cycleDetectionSteps(events: AlgorithmEvent[]): Steps {
  const recursion: number[] = [];
  const items = () => recursion.map((id) => ({ id }));
  for (const event of events) {
    if (event.type === "settle") {
      recursion.push(event.node);
      yield {
        type: StepType.VISIT,
        edge: { from: event.via ?? -1, to: event.node },
        trace: {
          message: `**Exploring node ${nid(event.node)}**. Recursion depth: ${recursion.length}`,
          dataStructure: { type: "recursion-stack", items: items(), processing: { id: event.node }, justAdded: [event.node] },
        },
      };
    } else if (event.type === "finish") {
      recursion.pop();
    } else if (event.type === "classify" && event.kind === "back") {
      const { from, to } = event;
      yield {
        type: StepType.VISIT,
        edge: { from, to },
        trace: {
          message: `**Cycle detected!** Back edge **${nid(from)}→${nid(to)}** found\nNode **${nid(to)}** is in recursion stack`,
          dataStructure: { type: "recursion-stack", items: items(), processing: { id: to } },
        },
      };
    } else if (event.type === "answer" && event.kind === "cycle" && event.cycle) {
      // The old app listed the tree edges from the deepest one up, then the edge that closes the cycle.
      const { cycle } = event;
      for (let i = cycle.length - 1; i > 0; i--) yield { type: StepType.CYCLE, edge: { from: cycle[i - 1], to: cycle[i] } };
      yield { type: StepType.CYCLE, edge: { from: cycle[cycle.length - 1], to: cycle[0] } };
    }
  }
}

function* bellmanFordSteps(events: AlgorithmEvent[], input: AlgorithmInput): Steps {
  const { startNodeId: start, endNodeId: end } = input;
  const reached = new Set<number>();
  for (const event of events) {
    if (event.type === "start") {
      reached.add(event.node);
      yield start === end
        ? {
          type: StepType.VISIT,
          edge: { from: -1, to: start },
          trace: {
            message: `**Start and destination are the same** (node ${nid(start)})`,
            dataStructure: { type: "distances", items: [{ id: start, value: 0 }] },
          },
        }
        : {
          type: StepType.VISIT,
          edge: { from: -1, to: start },
          trace: {
            message: `**Starting at node ${nid(start)}** (distance: 0)\n**1** node reachable`,
            dataStructure: { type: "distances", items: [], processing: { id: start, value: 0 } },
          },
        };
    } else if (event.type === "relax") {
      const { from, to, old, next } = event;
      reached.add(to);
      const found = to === end ? "**Found destination!** " : "";
      yield {
        type: StepType.VISIT,
        edge: { from, to },
        trace: {
          message: `Iteration ${event.group}: ${found}Relaxed **${nid(from)}→${nid(to)}**, d: **${old === Infinity ? "∞" : old}→${next}**\n**${reached.size}** nodes reachable`,
          dataStructure: { type: "distances", items: [], processing: { id: to, value: next } },
        },
      };
    } else if (event.type === "answer" && event.kind === "route" && event.path) {
      yield* routeSteps(start, event.path);
    }
  }
}

const hasDirectedEdge = ({ adjacencyList }: AlgorithmInput) =>
  [...adjacencyList.values()].some((edges) => edges.some((edge) => edge.type === EDGE_TYPE.DIRECTED));

/** Pathfinding algorithms and the old message when no route was found. */
const NO_ROUTE: Record<string, string> = {
  dijkstra: "Path is not possible for the given vertices.",
  "bellman-ford": "Path is not possible or negative cycle detected.",
  "bfs-pathfinding": "No path found between the selected nodes.",
  "dfs-pathfinding": "No path found between the selected nodes.",
};

/** Runs an algorithm and returns the old app's steps and error, as `adapter.execute()` did. */
export function legacyExecute(algorithmId: string, input: AlgorithmInput): { steps: LegacyStep[]; error?: string } {
  const adapter = algorithmRegistry.get(algorithmId);
  if (!adapter) return { steps: [], error: `Unknown algorithm "${algorithmId}"` };
  if (algorithmId in NO_ROUTE && input.endNodeId === undefined) return { steps: [], error: "End node is required for pathfinding." };
  if (algorithmId === "prims" && hasDirectedEdge(input)) return { steps: [], error: "MST requires an undirected graph. Found directed edges." };

  const events = adapter.events(input);
  const steps = [...(() => {
    switch (algorithmId) {
      case "dijkstra": return dijkstraSteps(events, input);
      case "bellman-ford": return bellmanFordSteps(events, input);
      case "prims": return primsSteps(events, input);
      case "cycle-detection": return cycleDetectionSteps(events);
      case "bfs": case "bfs-pathfinding": return searchSteps(events, "queue");
      default: return searchSteps(events, "stack");
    }
  })()];

  if (algorithmId in NO_ROUTE) {
    const found = steps.some((s) => s.type === StepType.RESULT);
    if (!found && input.startNodeId !== input.endNodeId) return { steps, error: NO_ROUTE[algorithmId] };
  } else if (algorithmId === "prims") {
    if (steps.filter((s) => s.type === StepType.VISIT).length !== input.nodes.length) {
      return { steps, error: "Graph is not connected. MST requires a connected graph." };
    }
  } else if (algorithmId === "cycle-detection" && !steps.some((s) => s.type === StepType.CYCLE)) {
    return { steps, error: "No cycle found in the graph." };
  }
  return { steps };
}
