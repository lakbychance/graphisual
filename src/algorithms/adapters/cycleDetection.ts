/**
 * Cycle Detection Algorithm Adapter
 *
 * Detects cycles in a graph using DFS with coloring: an edge back to a node still in progress is a cycle.
 *
 * What counts as a cycle, in a graph that may mix directed and undirected edges: a closed walk that
 * never uses an edge twice, following directed edges only their way and undirected edges either way.
 * - Undirected edges between the same two nodes count as one edge (the canvas draws them as one
 *   line), so a walk of undirected edges alone needs at least three nodes: A–B out and back is not a cycle.
 * - With a directed edge involved, two nodes are enough: A→B and B→A, or A→B and B–A, go round
 *   without using an edge twice.
 * - A self-loop, directed or not, is a cycle on its own.
 * Such a walk exists exactly when a simple one does (one that meets no node twice), and that is the
 * cycle reported.
 *
 * The search keeps, for each node, the edge it came in on. Only that edge is not followed back
 * (when it is undirected), so a directed way in leaves an undirected edge back free. And as an
 * undirected way in is the one edge a node never followed, a node already done can still lead
 * somewhere when reached along another edge: back up the undirected edges it and its ancestors
 * came in on. If that climb reaches a node still in progress, the edge closes a cycle; otherwise the
 * done node holds nothing new. Without the climb, a mixed graph's cycle can be missed when the
 * search first walks it against its directed edge (A→B, B–C, C–A, taking A–C first).
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
 * then from each node still unvisited, until an edge closes a cycle (see the top of this file).
 * Each node visited (with the edge that led to it) and each node finished starts a new iteration.
 * The search keeps the textbook clock: one tick per visit and per finish, across restarts.
 *
 * Two decisions, as neither order is fixed. Which edge to follow next: while the node's edges still
 * to check lead to any unvisited node, any node still in progress (not along the undirected edge
 * the node came in on), or any done node whose climb reaches a node in progress, every such node is
 * an option; picking an unvisited one goes into it (along a directed edge to it if there is one),
 * picking another finds the loop. Other edges change nothing, so they are checked in their place in
 * the list. And where to start again: any unvisited node. `choose` picks; by default the first in list order.
 */
function cycleDetectionEvents(input: AlgorithmInput, choose: ChoicePolicy = firstOption): AlgorithmEvent[] {
  const { adjacencyList, startNodeId: start } = input;
  const state = new Map<number, "in-progress" | "done">();
  const parent = new Map<number, number>();
  /** The nodes that came in on an undirected edge (from their parent). */
  const cameUndirected = new Set<number>();
  const discovered: number[] = [];
  let group = 0;
  let clock = 0;
  const events: AlgorithmEvent[] = [{ type: "start", node: start, line: LINE.outer, group }];

  /**
   * From done node `to`, reached along `edge`: up the undirected edges it and its ancestors came in
   * on, the nodes passed, ending at the first in progress. Null when the climb ends at a node that
   * came in on a directed edge or started a search, or when `edge` is the one `to` came in on.
   */
  const climb = (edge: EdgeInfo): number[] | null => {
    if (edge.type === EDGE_TYPE.UNDIRECTED && cameUndirected.has(edge.to) && parent.get(edge.to) === edge.from) return null;
    const through: number[] = [];
    for (let at = edge.to; cameUndirected.has(at);) {
      at = parent.get(at)!;
      through.push(at);
      if (state.get(at) === "in-progress") return through;
    }
    return null;
  };

  const visit = (node: number, from?: number): boolean => {
    group += 1;
    state.set(node, "in-progress");
    discovered.push(node);
    if (from !== undefined) parent.set(node, from);
    events.push({ type: "settle", node, via: from, line: LINE.enter, group, time: ++clock });

    // An edge that changes something when checked: it leads somewhere new, back to a node in progress
    // (unless it is the undirected edge the node came in on), or to a done node whose climb finds one.
    const cameIn = ({ to, type }: EdgeInfo) => type === EDGE_TYPE.UNDIRECTED && to === from && cameUndirected.has(node);
    const opens = (edge: EdgeInfo) => {
      const seen = state.get(edge.to);
      return seen === undefined || (seen === "in-progress" ? !cameIn(edge) : climb(edge) !== null);
    };
    const pending = [...(adjacencyList.get(node) ?? [])];
    while (pending.length > 0) {
      if (opens(pending[0])) {
        // A call into a neighbour opens its iteration, so the choice and the check that leads there belong to its visit.
        const options = [...new Set(pending.filter(opens).map((e) => e.to))];
        const to = decide(events, choose, "next", options, (picked) => ({
          line: LINE.neighbours, group: state.has(picked) ? group : group + 1,
        }));
        const edges = pending.filter((e) => e.to === to && opens(e));
        const edge = edges.find((e) => e.type === EDGE_TYPE.DIRECTED) ?? edges[0];
        pending.splice(pending.indexOf(edge), 1);
        if (!state.has(to)) {
          events.push({ type: "classify", from: node, to, kind: "tree", line: LINE.recurse, group: group + 1 });
          if (edge.type === EDGE_TYPE.UNDIRECTED) cameUndirected.add(to);
          if (visit(to, node)) return true;
          continue;
        }
        // The loop closes at a node in progress: `to`, or the one a done `to` climbs up to.
        const through = state.get(to) === "done" ? climb(edge)! : [];
        const closes = through.length > 0 ? through[through.length - 1] : to;
        const kind = through.length === 0 ? "back" : discovered.indexOf(to) > discovered.indexOf(node) ? "forward" : "cross";
        events.push({ type: "classify", from: node, to, kind, loop: true, ...(through.length > 0 && { through }), line: LINE.inProgress, group });
        const cycle = [node];
        for (let at = node; at !== closes; at = parent.get(at)!) cycle.unshift(parent.get(at)!);
        if (through.length > 0) cycle.push(to, ...through.slice(0, -1));
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
