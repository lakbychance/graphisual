/**
 * Dijkstra's Shortest Path Algorithm Adapter
 *
 * Finds the shortest path between two nodes in a weighted graph.
 * Uses a greedy approach, always exploring the closest unvisited node.
 */

import { DijkstraIcon } from "../icons";
import { nid } from "../traceHelpers";
import { frameAt, stepEnds, type AlgorithmEvent, type SettleEvent } from "../engine";
import {
  AlgorithmAdapter,
  AlgorithmInput,
  AlgorithmResult,
  AlgorithmType,
  AlgorithmGenerator,
  StepType,
} from "../types";

const PSEUDOCODE = [
  "dist[source] ← 0",
  "queue ← { source }",
  "while queue is not empty:",
  "    u ← queue.extractMin()",
  "    if u = target: stop",
  "    for each edge (u, v, w):",
  "        if dist[u] + w < dist[v]:",
  "            dist[v] ← dist[u] + w",
  "            queue.insert(v)",
  "walk prev[] back from target",
];

/** Pseudocode line of each kind of event. */
const LINE = { start: 1, loop: 2, extract: 3, check: 6, relax: 7, walk: 9 } as const;

/** Nodes the run knows about, in the order it scans them for the closest one. */
function nodeOrder({ adjacencyList, startNodeId, endNodeId }: AlgorithmInput): number[] {
  const order = [...adjacencyList.keys()];
  for (const id of [startNodeId, endNodeId]) if (id !== undefined && !order.includes(id)) order.push(id);
  return order;
}

/** Everything Dijkstra's does on this input, as events. Empty when there is no destination. */
function dijkstraEvents(input: AlgorithmInput): AlgorithmEvent[] {
  const { adjacencyList, startNodeId: start, endNodeId: end } = input;
  if (end === undefined) return [];

  const order = nodeOrder(input);
  const dist = new Map<number, number>(order.map((id) => [id, id === start ? 0 : Infinity]));
  const prev = new Map<number, number>();
  const unsettled = new Set(order);
  let group = 0;
  const events: AlgorithmEvent[] = [{ type: "enqueue", node: start, value: 0, line: LINE.start, group }];

  for (;;) {
    group += 1;
    // The closest unsettled node; on a tie the first one in scan order.
    let current: number | null = null;
    let min = Infinity;
    for (const id of unsettled) {
      const d = dist.get(id) ?? Infinity;
      if (d < min) { min = d; current = id; }
    }
    if (current === null) {
      events.push({ type: "answer", kind: "route", start, target: end, path: null, line: LINE.loop, group });
      return events;
    }

    const ties = [...unsettled].filter((id) => id !== current && dist.get(id) === min);
    unsettled.delete(current);
    events.push({
      type: "settle", node: current, value: min, via: prev.get(current), line: LINE.extract, group,
      ...(ties.length > 0 && { ties }),
      ...(current === end && { target: true }),
    });

    if (current === end) {
      const path = [end];
      for (let at = prev.get(end); at !== undefined; at = prev.get(at)) path.unshift(at);
      events.push({ type: "answer", kind: "route", start, target: end, path, cost: min, line: LINE.walk, group: group + 1 });
      return events;
    }

    for (const edge of adjacencyList.get(current) ?? []) {
      const old = dist.get(edge.to);
      if (old === undefined) continue; // an edge to a node outside the graph
      const base = { from: current, to: edge.to, weight: edge.weight, group };
      if (!unsettled.has(edge.to)) {
        events.push({ type: "skip", ...base, reason: "settled", line: LINE.check });
        continue;
      }
      const value = min + edge.weight;
      if (value < old) {
        dist.set(edge.to, value);
        prev.set(edge.to, current);
        events.push({ type: "relax", ...base, old, next: value, queue: true, line: LINE.relax });
      } else {
        events.push({ type: "skip", ...base, reason: "not-shorter", value, current: old, line: LINE.check });
      }
    }
  }
}

/**
 * Today's app steps, derived from the events: one VISIT step per settled node (with the queue
 * after its edges are checked), then RESULT steps along the route. Replaced by frames in task 0.4.
 */
function* legacySteps(events: AlgorithmEvent[], input: AlgorithmInput): AlgorithmGenerator {
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
      if (!first.path) return;
      yield { type: StepType.RESULT, edge: { from: -1, to: start } };
      for (let i = 1; i < first.path.length; i++) {
        yield { type: StepType.RESULT, edge: { from: first.path[i - 1], to: first.path[i] } };
      }
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
      // The app has always checked the destination's edges before stopping, so its last queue shows them.
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

const dijkstraAdapter: AlgorithmAdapter = {
  metadata: {
    id: "dijkstra",
    name: "Dijkstra's",
    type: AlgorithmType.PATHFINDING,
    tagline: "Find the shortest path",
    icon: DijkstraIcon,
    inputStepHints: ["Select the source node", "Now select the destination node"],
  },

  pseudocode: PSEUDOCODE,
  events: dijkstraEvents,

  /**
   * Generator for step-through mode.
   */
  generator: (input) => legacySteps(dijkstraEvents(input), input),

  /**
   * Synchronous execution using generator internally.
   */
  execute: (input: AlgorithmInput): AlgorithmResult => {
    // Validate end node
    if (input.endNodeId === undefined) {
      return { steps: [], error: "End node is required for pathfinding." };
    }

    const steps = [...dijkstraAdapter.generator(input)];
    const foundPath = steps.some((s) => s.type === StepType.RESULT);

    if (!foundPath && input.startNodeId !== input.endNodeId) {
      return { steps, error: "Path is not possible for the given vertices." };
    }

    return { steps };
  },
};

export default dijkstraAdapter;
