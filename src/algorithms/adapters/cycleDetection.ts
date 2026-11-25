/**
 * Cycle Detection Algorithm Adapter
 *
 * Detects cycles in a graph using DFS with coloring.
 * For directed graphs: uses 3-color (white/gray/black) approach.
 * For undirected graphs: tracks parent to avoid false positives.
 */

import { CycleDetectionIcon } from "../icons";
import type { AlgorithmEvent } from "../engine";
import { AlgorithmAdapter, AlgorithmInput, AlgorithmType } from "../types";
import { EDGE_TYPE } from "../../constants/graph";

const PSEUDOCODE = [
  "visit(u, parent):",
  "    state[u] ← in progress",
  "    for each neighbor v of u:",
  "        if v = parent (undirected): skip",
  "        if state[v] = in progress:",
  "            report cycle (u → v)",
  "        if state[v] = unvisited:",
  "            visit(v, u)",
  "    state[u] ← done",
  "for each unvisited node u: visit(u, none)",
];

/** Pseudocode line of each kind of event. */
const LINE = { enter: 1, parent: 3, inProgress: 4, report: 5, unvisited: 6, recurse: 7, done: 8, outer: 9 } as const;

/**
 * Everything cycle detection does on this input, as events. A depth-first search from the start,
 * then from each node still unvisited, until an edge leads back to a node still in progress.
 * Each node visited (with the edge that led to it) and each node finished starts a new iteration.
 * The search keeps the textbook clock: one tick per visit and per finish, across restarts.
 */
function cycleDetectionEvents(input: AlgorithmInput): AlgorithmEvent[] {
  const { adjacencyList, startNodeId: start } = input;
  const state = new Map<number, "in-progress" | "done">();
  const parent = new Map<number, number>();
  const discovered: number[] = [];
  let group = 0;
  let clock = 0;
  const events: AlgorithmEvent[] = [{ type: "start", node: start, line: LINE.outer, group }];

  const visit = (node: number, from?: number): boolean => {
    group += 1;
    state.set(node, "in-progress");
    discovered.push(node);
    if (from !== undefined) parent.set(node, from);
    events.push({ type: "settle", node, via: from, line: LINE.enter, group, time: ++clock });

    for (const edge of adjacencyList.get(node) ?? []) {
      const to = edge.to;
      const seen = state.get(to);
      if (seen === undefined) {
        // The call into `to` opens its iteration, so the check that leads there belongs to its visit.
        events.push({ type: "classify", from: node, to, kind: "tree", line: LINE.recurse, group: group + 1 });
        if (visit(to, node)) return true;
      } else if (seen === "in-progress") {
        // An undirected edge back to the parent is the edge just taken, not a cycle.
        if (edge.type === EDGE_TYPE.UNDIRECTED && to === from) {
          events.push({ type: "skip", from: node, to, reason: "parent", line: LINE.parent, group });
          continue;
        }
        events.push({ type: "classify", from: node, to, kind: "back", loop: true, line: LINE.inProgress, group });
        const cycle = [node];
        for (let at = node; at !== to; at = parent.get(at)!) cycle.unshift(parent.get(at)!);
        events.push({ type: "answer", kind: "cycle", cycle, line: LINE.report, group: group + 1 });
        return true;
      } else {
        const kind = discovered.indexOf(to) > discovered.indexOf(node) ? "forward" : "cross";
        events.push({ type: "classify", from: node, to, kind, line: LINE.unvisited, group });
      }
    }

    group += 1;
    state.set(node, "done");
    events.push({ type: "finish", node, parent: from, line: LINE.done, group, time: ++clock });
    return false;
  };

  if (visit(start)) return events;
  for (const node of adjacencyList.keys()) {
    if (state.has(node)) continue;
    group += 1;
    events.push({ type: "start", node, line: LINE.outer, group });
    if (visit(node)) return events;
  }
  events.push({ type: "answer", kind: "cycle", cycle: null, line: LINE.outer, group: group + 1 });
  return events;
}

const cycleDetectionAdapter: AlgorithmAdapter = {
  metadata: {
    id: "cycle-detection",
    name: "Cycle Detection",
    type: AlgorithmType.TRAVERSAL,
    tagline: "Find loops in graph",
    icon: CycleDetectionIcon,
    inputStepHints: ["Select a node"],
  },

  pseudocode: PSEUDOCODE,
  events: cycleDetectionEvents,

  refusal: (events) =>
    events.some((e) => e.type === "answer" && e.kind === "cycle" && e.cycle === null) ? "No cycle found in the graph." : undefined,
};

export default cycleDetectionAdapter;
