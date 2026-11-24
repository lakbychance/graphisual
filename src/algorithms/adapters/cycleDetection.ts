/**
 * Cycle Detection Algorithm Adapter
 *
 * Detects cycles in a graph using DFS with coloring.
 * For directed graphs: uses 3-color (white/gray/black) approach.
 * For undirected graphs: tracks parent to avoid false positives.
 */

import { CycleDetectionIcon } from "../icons";
import { nid } from "../traceHelpers";
import type { AlgorithmEvent } from "../engine";
import {
  AlgorithmAdapter,
  AlgorithmInput,
  AlgorithmResult,
  AlgorithmType,
  AlgorithmGenerator,
  StepType,
} from "../types";
import { EDGE_TYPE } from "../../constants/graph";

const PSEUDOCODE = [
  "visit(u):",
  "    state[u] ← in progress",
  "    for each neighbor v of u:",
  "        if state[v] = in progress:",
  "            report cycle (u → v)",
  "        if state[v] = unvisited:",
  "            visit(v)",
  "    state[u] ← done",
  "for each unvisited node u:",
  "    visit(u)",
];

/** Pseudocode line of each kind of event. */
const LINE = { enter: 1, inProgress: 3, report: 4, unvisited: 5, recurse: 6, done: 7, outer: 8 } as const;

/**
 * Everything cycle detection does on this input, as events. A depth-first search from the start,
 * then from each node still unvisited, until an edge leads back to a node still in progress.
 * Each node visited and each node finished starts a new iteration.
 */
function cycleDetectionEvents(input: AlgorithmInput): AlgorithmEvent[] {
  const { adjacencyList, startNodeId: start } = input;
  const state = new Map<number, "in-progress" | "done">();
  const parent = new Map<number, number>();
  const discovered: number[] = [];
  let group = 0;
  const events: AlgorithmEvent[] = [{ type: "start", node: start, line: LINE.outer, group }];

  const visit = (node: number, from?: number): boolean => {
    group += 1;
    state.set(node, "in-progress");
    discovered.push(node);
    if (from !== undefined) parent.set(node, from);
    events.push({ type: "settle", node, via: from, line: LINE.enter, group });

    for (const edge of adjacencyList.get(node) ?? []) {
      const to = edge.to;
      const seen = state.get(to);
      if (seen === undefined) {
        events.push({ type: "classify", from: node, to, kind: "tree", line: LINE.recurse, group });
        if (visit(to, node)) return true;
      } else if (seen === "in-progress") {
        // An undirected edge back to the parent is the edge just taken, not a cycle.
        if (edge.type === EDGE_TYPE.UNDIRECTED && to === from) {
          events.push({ type: "skip", from: node, to, reason: "parent", line: LINE.inProgress, group });
          continue;
        }
        events.push({ type: "classify", from: node, to, kind: "back", line: LINE.report, group });
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
    events.push({ type: "finish", node, parent: from, line: LINE.done, group });
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

/**
 * Today's app steps, derived from the events: one VISIT step per node entered and one for the
 * edge that closes a cycle, then CYCLE steps round the cycle. Replaced by frames in task 0.4.
 */
function* legacySteps(events: AlgorithmEvent[]): AlgorithmGenerator {
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
      // The app lists the tree edges from the deepest one up, then the edge that closes the cycle.
      const { cycle } = event;
      for (let i = cycle.length - 1; i > 0; i--) yield { type: StepType.CYCLE, edge: { from: cycle[i - 1], to: cycle[i] } };
      yield { type: StepType.CYCLE, edge: { from: cycle[cycle.length - 1], to: cycle[0] } };
    }
  }
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

  /**
   * Generator for step-through mode.
   */
  generator: (input) => legacySteps(cycleDetectionEvents(input)),

  /**
   * Synchronous execution using generator internally.
   */
  execute: (input: AlgorithmInput): AlgorithmResult => {
    const steps = [...cycleDetectionAdapter.generator(input)];
    const foundCycle = steps.some((s) => s.type === StepType.CYCLE);

    if (!foundCycle) {
      return { steps, error: "No cycle found in the graph." };
    }

    return { steps };
  },
};

export default cycleDetectionAdapter;
