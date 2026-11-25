/**
 * The rule library: what every event stream must obey, checked on the random suite.
 * Each rule returns a description of the first violation, or null.
 * Rules are shared: an algorithm lists the ones that apply to it.
 */
import type { AlgorithmInput } from "../../types";
import type { AlgorithmEvent } from "../events";
import { applyEvent, emptyFrame, type Frame } from "../frame";
import { stepEnds } from "../steps";
import { createRun, runMarksAt } from "@/utils/visualization/runView";

export interface RuleContext {
  /** The algorithm that made the run. */
  algorithmId: string;
  pseudocode: string[];
  /** The graph the run was on. */
  input: AlgorithmInput;
}

export type Rule = (events: readonly AlgorithmEvent[], context: RuleContext) => string | null;

/** Every event points at a real, non-blank pseudocode line. */
export const pointsAtPseudocode: Rule = (events, { pseudocode }) => {
  const bad = events.find((e) => !Number.isInteger(e.line) || !pseudocode[e.line]?.trim());
  return bad ? `${bad.type} event points at line ${bad.line}, which does not exist` : null;
};

/** Iteration groups never go backwards, so steps can be cut by group. */
export const groupsOnlyIncrease: Rule = (events) => {
  const i = events.findIndex((e, k) => k > 0 && e.group < events[k - 1].group);
  return i >= 0 ? `event ${i} is in group ${events[i].group} after group ${events[i - 1].group}` : null;
};

/** A relaxation starts from the node's current value and only ever lowers it. */
export const relaxOnlyLowers: Rule = (events) => {
  const value = new Map<number, number>();
  for (const e of events) {
    if ((e.type === "enqueue" || e.type === "start") && e.value !== undefined) value.set(e.node, e.value);
    if (e.type !== "relax") continue;
    const current = value.get(e.to) ?? Infinity;
    if (e.old !== current) return `relax of ${e.to} claims it had ${e.old}, but it had ${current}`;
    if (!(e.next < e.old)) return `relax of ${e.to} goes from ${e.old} to ${e.next}, which is not lower`;
    value.set(e.to, e.next);
  }
  return null;
};

/** Each node settles at most once, and settled values never decrease. */
export const settlesOnceInOrder: Rule = (events) => {
  const seen = new Set<number>();
  let last = -Infinity;
  for (const e of events) {
    if (e.type !== "settle") continue;
    if (seen.has(e.node)) return `node ${e.node} settles twice`;
    seen.add(e.node);
    const v = e.value ?? -Infinity;
    if (v < last) return `node ${e.node} settles at ${v} after a node settled at ${last}`;
    last = v;
  }
  return null;
};

/** BFS visits each node once, in non-decreasing depth (edges from the start along the tree it builds). */
export const bfsDepthNeverDecreases: Rule = (events) => {
  const depth = new Map<number, number>();
  let last = 0;
  for (const e of events) {
    if (e.type !== "settle") continue;
    if (depth.has(e.node)) return `node ${e.node} is visited twice`;
    const parent = e.via === undefined ? -1 : depth.get(e.via);
    if (parent === undefined) return `node ${e.node} is reached from ${e.via}, which was never visited`;
    const d = parent + 1;
    if (d < last) return `node ${e.node} is visited at depth ${d} after a node at depth ${last}`;
    depth.set(e.node, d);
    last = d;
  }
  return null;
};

/**
 * DFS discovery and finish times nest (the parenthesis theorem): a node is discovered from the
 * node discovered most recently among those not yet finished, and finishes (returning to the node
 * it was discovered from) only after everything discovered below it has finished. Unless the search
 * stops early, at its target or at a cycle, every node it discovers finishes.
 */
export const dfsTimesNest: Rule = (events) => {
  const branch: number[] = [];
  const discovered = new Set<number>();
  for (const e of events) {
    const top = branch[branch.length - 1];
    if (e.type === "settle") {
      if (discovered.has(e.node)) return `node ${e.node} is discovered twice`;
      discovered.add(e.node);
      if (e.via === undefined && top !== undefined) return `node ${e.node} starts a new search while ${top} is unfinished`;
      if (e.via !== undefined && e.via !== top) return `node ${e.node} is discovered from ${e.via}, but the deepest unfinished node is ${top}`;
      branch.push(e.node);
    } else if (e.type === "finish") {
      if (top !== e.node) return `node ${e.node} finishes while ${top}, discovered after it, is unfinished`;
      branch.pop();
      if (e.parent !== branch[branch.length - 1]) return `node ${e.node} returns to ${e.parent}, not to ${branch[branch.length - 1]}`;
    } else if (e.type === "answer") {
      const early = (e.kind === "route" && e.path !== null) || (e.kind === "cycle" && e.cycle !== null);
      if (!early && top !== undefined) return `the search ends with ${top} unfinished`;
    }
  }
  return null;
};

/**
 * Once a depth-first search is done with a node, it stays done: the node was visited first, and it
 * never waits, is visited or is returned to again. So the canvas never shows a node as both done
 * and waiting or being worked on.
 */
export const doneStaysDone: Rule = (events) => {
  const visited = new Set<number>();
  const done = new Set<number>();
  for (const e of events) {
    if (e.type === "settle") {
      if (done.has(e.node)) return `node ${e.node} is visited after it is done`;
      visited.add(e.node);
    } else if (e.type === "enqueue" && done.has(e.node)) {
      return `node ${e.node} waits again after it is done`;
    } else if (e.type === "relax" && e.queue && done.has(e.to)) {
      return `node ${e.to} waits again after it is done`;
    } else if (e.type === "finish") {
      if (!visited.has(e.node)) return `node ${e.node} is done before it is visited`;
      if (done.has(e.node)) return `node ${e.node} is done twice`;
      done.add(e.node);
      if (e.parent !== undefined && done.has(e.parent)) return `node ${e.node} returns to ${e.parent}, which is already done`;
    }
  }
  return null;
};

/** Prim's adds a node only through an edge that crosses out of the tree and is the lightest such edge. */
export const addsLightestCrossingEdge: Rule = (events, { input }) => {
  const tree = new Set<number>();
  for (const e of events) {
    if (e.type !== "settle") continue;
    if (tree.has(e.node)) return `node ${e.node} joins the tree twice`;
    if (e.via === undefined) {
      if (tree.size > 0) return `node ${e.node} joins without an edge`;
    } else {
      let lightest = Infinity;
      for (const from of tree) {
        for (const edge of input.adjacencyList.get(from) ?? []) {
          if (!tree.has(edge.to)) lightest = Math.min(lightest, edge.weight);
        }
      }
      const real = tree.has(e.via) && (input.adjacencyList.get(e.via) ?? []).some((edge) => edge.to === e.node && edge.weight === e.value);
      if (!real) return `node ${e.node} joins through ${e.via} at ${e.value}, which is not an edge out of the tree`;
      if (e.value !== lightest) return `node ${e.node} joins at ${e.value}, but the lightest edge out of the tree weighs ${lightest}`;
    }
    tree.add(e.node);
  }
  return null;
};

/**
 * What a learner can see of a run's state: what is final, done, known, waiting, answered, and
 * which edges closed a cycle. Not which edge was looked at last, nor edges merely checked.
 */
const stateOf = (f: Frame) => JSON.stringify([
  f.settled, f.finished, [...f.dist], [...f.prev], f.queue, f.answer !== null,
  [...f.edgeClass].filter(([, kind]) => kind === "back"),
]);

/**
 * Each step is one change: exactly one of its events changes the state. Exceptions: a Start step
 * may change nothing (a search with no values begins by just naming its start), and an iteration
 * that changes nothing at all (a Bellman-Ford round with no improvement) is one step on its own.
 */
export const oneChangePerStep: Rule = (events) => {
  let frame = emptyFrame;
  let from = 0;
  for (const end of stepEnds(events)) {
    const step = events.slice(from, end);
    let changed = 0;
    for (const event of step) {
      const next = applyEvent(frame, event);
      if (stateOf(next) !== stateOf(frame)) changed += 1;
      frame = next;
    }
    const group = step[0].group;
    const wholeIteration = step.every((e) => e.group === group) && events[from - 1]?.group !== group && events[end]?.group !== group;
    const allowedNone = step[0].type === "start" || wholeIteration;
    if (changed > 1 || (changed === 0 && !allowedNone)) {
      return `the step of events ${from}..${end - 1} (${step.map((e) => e.type).join(", ")}) makes ${changed} changes`;
    }
    from = end;
  }
  return null;
};

/**
 * The parent links the canvas draws (best-so-far and final) form a tree at every step: each node
 * shows at most one way in, the start none, each runs along a real edge in the direction the search
 * travelled, and following them back never loops. A run that reports a negative cycle is exempt: there,
 * best-so-far links can go round the cycle.
 */
export const parentLinksFormTree: Rule = (events, { algorithmId, input }) => {
  if (events.some((e) => e.type === "answer" && e.kind === "route" && e.negativeCycle)) return null;
  const run = createRun(algorithmId, [...events], []);
  for (let index = 0; index < run.ends.length; index++) {
    const parent = new Map<number, number>();
    for (const { from, to, kind } of runMarksAt(run, index).edges) {
      if (kind === "change") continue;
      if (parent.has(to)) return `step ${index + 1} shows two ways into ${to}`;
      if (to === input.startNodeId) return `step ${index + 1} shows a way into the start`;
      if (!(input.adjacencyList.get(from) ?? []).some((e) => e.to === to)) return `step ${index + 1} links ${from} to ${to}, which is not an edge`;
      parent.set(to, from);
    }
    for (const node of parent.keys()) {
      const seen = new Set<number>();
      for (let at: number | undefined = node; at !== undefined; at = parent.get(at)) {
        if (seen.has(at)) return `step ${index + 1}: the links back from ${node} go round in a loop`;
        seen.add(at);
      }
    }
  }
  return null;
};
