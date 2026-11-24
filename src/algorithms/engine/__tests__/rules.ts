/**
 * The rule library: what every event stream must obey, checked on the random suite.
 * Each rule returns a description of the first violation, or null.
 * Rules are shared: an algorithm lists the ones that apply to it.
 */
import type { AlgorithmEvent } from "../events";

export interface RuleContext {
  pseudocode: string[];
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
    if (e.type === "enqueue" && e.value !== undefined) value.set(e.node, e.value);
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
