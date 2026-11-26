/**
 * Cycle Detection Algorithm Adapter
 *
 * Detects cycles in a graph using DFS with coloring.
 * For directed graphs: uses 3-color (white/gray/black) approach.
 * For undirected graphs: tracks parent to avoid false positives.
 */

import { CycleDetectionIcon } from "../icons";
import { decide, firstOption, type AlgorithmEvent, type ChoicePolicy } from "../engine";
import { AlgorithmAdapter, AlgorithmInput, AlgorithmType, type EdgeInfo } from "../types";
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
const LINE = { enter: 1, neighbours: 2, parent: 3, inProgress: 4, report: 5, unvisited: 6, recurse: 7, done: 8, outer: 9 } as const;

/**
 * Everything cycle detection does on this input, as events. A depth-first search from the start,
 * then from each node still unvisited, until an edge leads back to a node still in progress.
 * Each node visited (with the edge that led to it) and each node finished starts a new iteration.
 * The search keeps the textbook clock: one tick per visit and per finish, across restarts.
 *
 * Two decisions, as neither order is fixed. Which edge to follow next: while the node's edges still
 * to check lead to any unvisited node or any node still in progress (not counting the undirected
 * edge back to the parent), every such node is an option; picking an unvisited one goes into it,
 * picking one in progress finds the loop. Edges to finished nodes and the edge back to the parent
 * change nothing, so they are checked in their place in the list. And where to start again: any
 * unvisited node. `choose` picks; by default the first in list order.
 */
function cycleDetectionEvents(input: AlgorithmInput, choose: ChoicePolicy = firstOption): AlgorithmEvent[] {
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

    // An edge that changes something when checked: it leads somewhere new, or back to a node in
    // progress (an undirected edge back to the parent is the edge just taken, not a cycle).
    const opens = ({ to, type }: EdgeInfo) =>
      !state.has(to) || (state.get(to) === "in-progress" && !(type === EDGE_TYPE.UNDIRECTED && to === from));
    const pending = [...(adjacencyList.get(node) ?? [])];
    while (pending.length > 0) {
      if (opens(pending[0])) {
        // A call into a neighbour opens its iteration, so the choice and the check that leads there belong to its visit.
        const options = [...new Set(pending.filter(opens).map((e) => e.to))];
        const to = decide(events, choose, "next", options, (picked) => ({
          line: LINE.neighbours, group: state.has(picked) ? group : group + 1,
        }));
        pending.splice(pending.findIndex((e) => e.to === to && opens(e)), 1);
        if (!state.has(to)) {
          events.push({ type: "classify", from: node, to, kind: "tree", line: LINE.recurse, group: group + 1 });
          if (visit(to, node)) return true;
          continue;
        }
        events.push({ type: "classify", from: node, to, kind: "back", loop: true, line: LINE.inProgress, group });
        const cycle = [node];
        for (let at = node; at !== to; at = parent.get(at)!) cycle.unshift(parent.get(at)!);
        events.push({ type: "answer", kind: "cycle", cycle, line: LINE.report, group: group + 1 });
        return true;
      }
      const { to } = pending.shift()!;
      if (state.get(to) === "in-progress") {
        events.push({ type: "skip", from: node, to, reason: "parent", line: LINE.parent, group });
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
  for (;;) {
    const unvisited = [...adjacencyList.keys()].filter((id) => !state.has(id));
    if (unvisited.length === 0) break;
    group += 1;
    const node = decide(events, choose, "restart", unvisited, { line: LINE.outer, group });
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
