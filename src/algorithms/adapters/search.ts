/**
 * The search shared by BFS, DFS and their pathfinding versions: take a node from the frontier,
 * visit it, and add each neighbour not seen before. A queue gives breadth first, a stack depth first.
 *
 * Nodes are marked seen when they join the frontier, so each joins at most once. The stack
 * pushes a node's neighbours last-first, so the first neighbour ends up on top.
 */
import { nid } from "../traceHelpers";
import { frameAt, stepEnds, type AlgorithmEvent } from "../engine";
import { AlgorithmInput, AlgorithmGenerator, StepType } from "../types";

export type FrontierKind = "queue" | "stack";

/** Pseudocode line of each kind of event. `stop` and `walk` only for pathfinding. */
export interface SearchLines {
  start: number;
  loop: number;
  take: number;
  check: number;
  add: number;
  stop?: number;
  walk?: number;
}

/**
 * Everything the search does on this input, as events. With a `target` it stops when the target
 * is taken from the frontier and answers with the route; without one it visits everything reachable.
 */
export function searchEvents(input: AlgorithmInput, kind: FrontierKind, lines: SearchLines, target?: number): AlgorithmEvent[] {
  const { adjacencyList, nodes, startNodeId: start } = input;
  const seen = new Set([start]);
  const visited: number[] = [];
  const parent = new Map<number, number>();
  const frontier = [start];
  let group = 0;
  const events: AlgorithmEvent[] = [{ type: "enqueue", node: start, line: lines.start, group }];

  for (;;) {
    group += 1;
    const node = kind === "queue" ? frontier.shift() : frontier.pop();
    if (node === undefined) {
      if (target === undefined) {
        const unreached = nodes.map((n) => n.id).filter((id) => !visited.includes(id));
        events.push({ type: "answer", kind: "order", start, order: visited, unreached, line: lines.loop, group });
      } else {
        events.push({ type: "answer", kind: "route", start, target, path: null, line: lines.loop, group });
      }
      return events;
    }

    visited.push(node);
    if (node === target) {
      events.push({ type: "settle", node, via: parent.get(node), target: true, line: lines.stop ?? lines.take, group });
      const path = [node];
      for (let at = parent.get(node); at !== undefined; at = parent.get(at)) path.unshift(at);
      events.push({ type: "answer", kind: "route", start, target, path, line: lines.walk ?? lines.loop, group: group + 1 });
      return events;
    }
    events.push({ type: "settle", node, via: parent.get(node), line: lines.take, group });

    const edges = adjacencyList.get(node) ?? [];
    for (const edge of kind === "queue" ? edges : [...edges].reverse()) {
      const to = edge.to;
      if (seen.has(to)) {
        events.push({ type: "skip", from: node, to, reason: visited.includes(to) ? "visited" : "queued", line: lines.check, group });
        continue;
      }
      seen.add(to);
      parent.set(to, node);
      frontier.push(to);
      events.push({ type: "enqueue", node: to, from: node, line: lines.add, group });
    }
  }
}

/**
 * Today's app steps, derived from the events: one VISIT step per visited node (with the frontier
 * after its neighbours are added), then RESULT steps along the route. Replaced by frames in task 0.4.
 */
export function* legacySearchSteps(events: AlgorithmEvent[], kind: FrontierKind): AlgorithmGenerator {
  let from = 0;
  for (const end of stepEnds(events, "overview")) {
    const group = events.slice(from, end);
    from = end;
    const [first] = group;

    if (first.type === "answer") {
      if (first.kind !== "route" || !first.path) return;
      yield { type: StepType.RESULT, edge: { from: -1, to: first.start } };
      for (let i = 1; i < first.path.length; i++) {
        yield { type: StepType.RESULT, edge: { from: first.path[i - 1], to: first.path[i] } };
      }
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
    // The stack pushes last-first; the app lists what was pushed in the neighbours' own order.
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
