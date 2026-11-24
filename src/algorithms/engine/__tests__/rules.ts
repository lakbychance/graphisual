/**
 * The rule library: what every event stream must obey, checked on the random suite.
 * Each rule returns a description of the first violation, or null.
 * Rules are shared: an algorithm lists the ones that apply to it.
 */
import type { AlgorithmInput } from "../../types";
import type { AlgorithmEvent } from "../events";

export interface RuleContext {
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
 * node on the current branch it hangs off, and finishes only after everything discovered below it.
 * Where a search reports no finish events, a node finishes when the search moves on outside its subtree.
 */
export const dfsTimesNest: Rule = (events) => {
  const branch: number[] = [];
  const discovered = new Set<number>();
  for (const e of events) {
    if (e.type === "settle") {
      if (discovered.has(e.node)) return `node ${e.node} is discovered twice`;
      discovered.add(e.node);
      if (e.via === undefined) {
        if (branch.length > 0) return `node ${e.node} starts a new search while ${branch[branch.length - 1]} is unfinished`;
      } else {
        const at = branch.lastIndexOf(e.via);
        if (at < 0) return `node ${e.node} is discovered from ${e.via}, which is not on the current branch`;
        branch.length = at + 1;
      }
      branch.push(e.node);
    } else if (e.type === "finish") {
      const top = branch[branch.length - 1];
      if (top !== e.node) return `node ${e.node} finishes while ${top}, discovered after it, is unfinished`;
      branch.pop();
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
