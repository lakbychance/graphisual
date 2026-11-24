/**
 * Bellman-Ford Algorithm Adapter
 *
 * Finds the shortest path from a source to all vertices.
 * Unlike Dijkstra, it can handle negative edge weights.
 * Also detects negative weight cycles.
 */

import { BellmanFordIcon } from "../icons";
import { nid } from "../traceHelpers";
import type { AlgorithmEvent } from "../engine";
import { AlgorithmAdapter, AlgorithmInput, AlgorithmType } from "../types";
import { noRoute } from "./refusals";

const PSEUDOCODE = [
  "dist[·] ← ∞, dist[source] ← 0",
  "repeat V − 1 times or until no change:",
  "    for each edge (u, v, w):",
  "        if dist[u] + w < dist[v]:",
  "            dist[v] ← dist[u] + w",
  "            prev[v] ← u",
  "if the last round changed, check again:",
  "    if an edge improves: negative cycle",
  "walk prev[] back from target",
];

/**
 * Pseudocode line of each kind of event. A relaxation is one event, so it points at the
 * distance it changes; the line under it runs in the same step.
 */
const LINE = { start: 0, rounds: 1, check: 3, relax: 4, cycleCheck: 6, cycle: 7, walk: 8 } as const;

/**
 * Everything Bellman-Ford does on this input, as events. Empty when there is no destination.
 * Group 0 is the start and group k is round k. A round that changes nothing ends the rounds early;
 * if every round changed something, one more pass looks for a negative cycle.
 */
function bellmanFordEvents(input: AlgorithmInput): AlgorithmEvent[] {
  const { adjacencyList, nodes, startNodeId: start, endNodeId: end } = input;
  if (end === undefined) return [];
  const events: AlgorithmEvent[] = [{ type: "start", node: start, value: 0, line: LINE.start, group: 0 }];
  if (start === end) {
    events.push({ type: "answer", kind: "route", start, target: end, path: [start], cost: 0, line: LINE.walk, group: 1 });
    return events;
  }

  const edges = [...adjacencyList.values()].flat();
  const dist = new Map<number, number>();
  for (const node of nodes) dist.set(node.id, node.id === start ? 0 : Infinity);
  for (const id of adjacencyList.keys()) if (!dist.has(id)) dist.set(id, id === start ? 0 : Infinity);
  const prev = new Map<number, number>();
  const rounds = Math.max(nodes.length, dist.size) - 1;

  let group = 0;
  let changed = true;
  for (let round = 1; round <= rounds && changed; round++) {
    group = round;
    changed = false;
    for (const { from, to, weight } of edges) {
      const base = dist.get(from) ?? Infinity;
      const old = dist.get(to) ?? Infinity;
      const edge = { from, to, weight, group };
      if (base === Infinity) {
        events.push({ type: "skip", ...edge, reason: "unreached", line: LINE.check });
      } else if (base + weight < old) {
        dist.set(to, base + weight);
        prev.set(to, from);
        changed = true;
        events.push({ type: "relax", ...edge, old, next: base + weight, line: LINE.relax });
      } else {
        events.push({ type: "skip", ...edge, reason: "not-shorter", value: base + weight, current: old, line: LINE.check });
      }
    }
    // A round that changed nothing ends the rounds: its last check is where the loop's "until no change" is decided.
    const last = events[events.length - 1];
    if (!changed && last.group === group) last.line = LINE.rounds;
  }

  group += 1;
  if (changed) {
    // Every round changed something, so check once more: an edge that still improves means a negative cycle.
    for (const { from, to, weight } of edges) {
      const base = dist.get(from) ?? Infinity;
      const current = dist.get(to) ?? Infinity;
      const edge = { from, to, weight, group };
      if (base === Infinity) {
        events.push({ type: "skip", ...edge, reason: "unreached", check: true, line: LINE.cycleCheck });
      } else if (base + weight < current) {
        events.push({
          type: "answer", kind: "route", start, target: end, path: null,
          negativeCycle: { from, to, weight, value: base + weight, current }, line: LINE.cycle, group,
        });
        return events;
      } else {
        events.push({ type: "skip", ...edge, reason: "not-shorter", value: base + weight, current, check: true, line: LINE.cycleCheck });
      }
    }
    group += 1;
  }

  const cost = dist.get(end) ?? Infinity;
  const path = [end];
  if (cost !== Infinity) for (let at = prev.get(end); at !== undefined; at = prev.get(at)) path.unshift(at);
  const reached = cost !== Infinity && path[0] === start;
  events.push({
    type: "answer", kind: "route", start, target: end, path: reached ? path : null,
    ...(reached && { cost }), line: reached ? LINE.walk : LINE.rounds, group,
  });
  return events;
}

const bellmanFordAdapter: AlgorithmAdapter = {
  metadata: {
    id: "bellman-ford",
    name: "Bellman-Ford",
    type: AlgorithmType.PATHFINDING,
    tagline: "Handle negative weights",
    icon: BellmanFordIcon,
    inputStepHints: ["Select the source node", "Now select the destination node"],
  },

  pseudocode: PSEUDOCODE,
  events: bellmanFordEvents,

  refusal: noRoute((answer) => answer.negativeCycle
    ? "A negative cycle can lower the cost forever, so there's no shortest route"
    : `No route from ${nid(answer.start)} to ${nid(answer.target)}`),
};

export default bellmanFordAdapter;
