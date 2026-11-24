/**
 * Dijkstra's Shortest Path Algorithm Adapter
 *
 * Finds the shortest path between two nodes in a weighted graph.
 * Uses a greedy approach, always exploring the closest unvisited node.
 */

import { DijkstraIcon } from "../icons";
import type { AlgorithmEvent } from "../engine";
import { AlgorithmAdapter, AlgorithmInput, AlgorithmType } from "../types";
import { noRoute } from "./refusals";

const PSEUDOCODE = [
  "dist[·] ← ∞, dist[source] ← 0",
  "queue ← { source }",
  "while queue is not empty:",
  "    u ← queue.extractMin()",
  "    if u = target: stop",
  "    for each edge (u, v, w):",
  "        if dist[u] + w < dist[v]:",
  "            dist[v] ← dist[u] + w",
  "            prev[v] ← u, queue.insert(v)",
  "walk prev[] back from target",
];

/**
 * Pseudocode line of each kind of event. A relaxation is one event, so it points at the
 * distance it changes; the line under it runs in the same step.
 */
const LINE = { start: 0, loop: 2, extract: 3, stop: 4, check: 6, relax: 7, walk: 9 } as const;

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
      type: "settle", node: current, value: min, via: prev.get(current), line: current === end ? LINE.stop : LINE.extract, group,
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

  refusal: noRoute("Path is not possible for the given vertices."),
};

export default dijkstraAdapter;
