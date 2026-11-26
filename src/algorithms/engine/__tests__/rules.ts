/**
 * The rule library: what every event stream must obey, checked on the random suite.
 * Each rule returns a description of the first violation, or null.
 * Rules are shared: an algorithm lists the ones that apply to it.
 */
import type { AlgorithmInput } from "../../types";
import type { AlgorithmEvent, DecideEvent } from "../events";
import { applyEvent, emptyFrame, type Frame } from "../frame";
import { changes, stepEnds } from "../steps";
import { createRun, keyMoments, runMarksAt, type MomentKind } from "@/utils/visualization/runView";

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

/**
 * The valid choices at a decision, read from what the learner sees just before it (see the adapters):
 * - Dijkstra's and Prim's: every waiting node at the least value;
 * - BFS and DFS: the waiting nodes that came from the same node as the front of the queue, or the
 *   top of the stack (any order of a node's neighbours is a valid search);
 * - cycle detection: every neighbour of the node being worked on that is unvisited, or still in
 *   progress along an edge other than the undirected one back to its parent (each such edge is
 *   still to check: checking it would have gone into the node or ended the run), or, to start
 *   again, every unvisited node.
 */
function validChoices(algorithmId: string, { kind }: DecideEvent, frame: Frame, { adjacencyList }: AlgorithmInput): number[] {
  const unvisited = (ids: number[]) => [...new Set(ids)].filter((id) => !frame.settled.includes(id));
  switch (algorithmId) {
    case "dijkstra":
    case "prims": {
      const least = Math.min(...frame.queue.map((item) => item.value ?? Infinity));
      return frame.queue.filter((item) => item.value === least).map((item) => item.id);
    }
    case "bfs":
    case "bfs-pathfinding":
    case "dfs":
    case "dfs-pathfinding": {
      const queue = algorithmId.startsWith("bfs") ? frame.queue : [...frame.queue].reverse();
      if (queue.length === 0) return [];
      const from = frame.prev.get(queue[0].id);
      return queue.filter((item) => frame.prev.get(item.id) === from).map((item) => item.id);
    }
    case "cycle-detection": {
      if (kind === "restart") return unvisited([...adjacencyList.keys()]);
      const node = frame.current ?? NaN;
      const inProgress = (id: number) => frame.settled.includes(id) && !frame.finished.includes(id);
      const parent = frame.via.get(node);
      const open = (adjacencyList.get(node) ?? []).filter(({ to, type }) =>
        !frame.settled.includes(to) || (inProgress(to) && !(type === "undirected" && to === parent)));
      return [...new Set(open.map((e) => e.to))];
    }
    default:
      return [];
  }
}

/**
 * Each decision offers exactly the valid choices (see `validChoices`), each once, and the change
 * right after it takes the node it chose (or, in cycle detection, finds the loop on the edge to it). So a learner's pick is accepted exactly when it is valid.
 */
export const decisionsAreHonest: Rule = (events, { algorithmId, input }) => {
  let frame = emptyFrame;
  for (let i = 0; i < events.length; frame = applyEvent(frame, events[i]), i++) {
    const e = events[i];
    if (e.type !== "decide") continue;
    const next = events.slice(i + 1).find(changes);
    const takes = next?.type === "settle" || next?.type === "start" ? next.node : next?.type === "classify" ? next.to : undefined;
    if (takes !== e.node) {
      return `decision ${i} picks ${e.node}, but the change after it does not take ${e.node}`;
    }
    const valid = validChoices(algorithmId, e, frame, input);
    const offered = new Set(e.options);
    if (!offered.has(e.node) || offered.size !== e.options.length || offered.size !== valid.length || valid.some((id) => !offered.has(id))) {
      return `decision ${i} offers ${e.options.join(", ")}, but the valid choices are ${valid.join(", ")}`;
    }
  }
  return null;
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
 * DFS discovery and finish times nest (the parenthesis theorem), on the times the search reports:
 * its clock ticks once per visit and once per finish, from 1. A node is discovered from the node
 * discovered most recently among those not yet finished, and finishes (returning to the node it was
 * discovered from) only after everything discovered below it has finished, so every node discovered
 * inside its interval [d, f] finished inside it too. Unless the search stops early, at its target or
 * at a cycle, every node it discovers finishes.
 */
export const dfsTimesNest: Rule = (events) => {
  const branch: number[] = [];
  const d = new Map<number, number>();
  const f = new Map<number, number>();
  let clock = 0;
  for (const e of events) {
    const top = branch[branch.length - 1];
    if (e.type === "settle") {
      if (d.has(e.node)) return `node ${e.node} is discovered twice`;
      if (e.time !== ++clock) return `node ${e.node} is discovered at time ${e.time}, but the clock reads ${clock}`;
      d.set(e.node, e.time);
      if (e.via === undefined && top !== undefined) return `node ${e.node} starts a new search while ${top} is unfinished`;
      if (e.via !== undefined && e.via !== top) return `node ${e.node} is discovered from ${e.via}, but the deepest unfinished node is ${top}`;
      branch.push(e.node);
    } else if (e.type === "finish") {
      if (e.time !== ++clock) return `node ${e.node} finishes at time ${e.time}, but the clock reads ${clock}`;
      if (top !== e.node) return `node ${e.node} finishes while ${top}, discovered after it, is unfinished`;
      const start = d.get(e.node)!;
      for (const [inside, time] of d) {
        if (time > start && !((f.get(inside) ?? Infinity) < e.time)) return `node ${inside}, discovered inside ${e.node}'s interval ${start}/${e.time}, finishes outside it`;
      }
      f.set(e.node, e.time);
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
 * A depth-first search's edge classes agree with its reported times (read from the run's last
 * frame, as the canvas reads them). With d/f each node's discovery and finish times:
 * - tree u → v (v reached from u) and forward: d[u] < d[v] < f[v] < f[u]
 * - back: d[v] ≤ d[u] < f[u] ≤ f[v]
 * - cross: f[v] < d[u]
 * Every classified edge is a real edge between visited nodes. Nodes a search that stopped early never
 * finished close in nesting order, deepest first, after the last reported time. A search that ran to
 * the end has classified every edge out of every node it visited (an undirected edge from either side).
 */
export const edgeClassesMatchTimes: Rule = (events, { input }) => {
  let frame = emptyFrame;
  for (const e of events) frame = applyEvent(frame, e);
  const { times, via, edgeClass, answer } = frame;
  const last = Math.max(0, ...[...times.values()].map((t) => t.f ?? t.d));
  const f = new Map([...times].map(([id, t]) => [id, t.f]));
  [...times].filter(([, t]) => t.f === undefined).sort(([, a], [, b]) => b.d - a.d).forEach(([id], i) => f.set(id, last + i + 1));
  const real = (from: number, to: number) => (input.adjacencyList.get(from) ?? []).some((e) => e.to === to);

  const classes = [...edgeClass].map(([key, kind]) => {
    const [from, to] = key.split("-").map(Number);
    return { from, to, kind };
  });
  for (const [to, from] of via) classes.push({ from, to, kind: "tree" });
  for (const { from: u, to: v, kind } of classes) {
    const edge = `${kind} edge ${u} → ${v}`;
    if (!real(u, v)) return `${edge} is not an edge of the graph`;
    const du = times.get(u)?.d;
    const dv = times.get(v)?.d;
    if (du === undefined || dv === undefined) return `${edge} has an end with no discovery time`;
    const fu = f.get(u)!;
    const fv = f.get(v)!;
    const fits = kind === "tree" ? via.get(v) === u && du < dv && fv < fu
      : kind === "forward" ? du < dv && fv < fu
      : kind === "back" ? dv <= du && fu <= fv
      : fv < du;
    if (!fits) return `${edge} does not fit the times ${u}: ${du}/${fu}, ${v}: ${dv}/${fv}`;
  }

  const complete = answer?.kind === "order" || (answer?.kind === "route" && answer.path === null) || (answer?.kind === "cycle" && answer.cycle === null);
  if (!complete) return null;
  const has = (from: number, to: number) => edgeClass.has(`${from}-${to}`) || via.get(to) === from;
  for (const u of times.keys()) {
    for (const { to: v, type } of input.adjacencyList.get(u) ?? []) {
      if (!has(u, v) && !(type === "undirected" && has(v, u))) return `edge ${u} → ${v} is never classified`;
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
 * which edge closed a cycle. Not which edge was looked at last, nor edges merely checked (a check
 * that classifies an edge belongs to the step that makes it).
 */
const stateOf = (f: Frame) => JSON.stringify([
  f.settled, f.finished, [...f.dist], [...f.prev], f.queue, f.answer !== null, f.loop,
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
      if (kind !== "tree" && kind !== "branch" && kind !== "tentative") continue;
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

/**
 * The key moments the scrubber marks (see `keyMoments`) are exactly the ones the events hold, no
 * more and no fewer: each Bellman-Ford round's first step (not the extra pass that checks for a
 * negative cycle, nor the answer); the step of the run's first relaxation along a negative edge
 * (Bellman-Ford); every step that takes the destination after the start; the step of the first back
 * edge a depth-first search meets, or cycle detection's loop; and the answer, on the last step.
 */
export const keyMomentsMatchEvents: Rule = (events, { algorithmId }) => {
  const run = createRun(algorithmId, [...events], []);
  const stepAt = (i: number) => stepEnds(events).findIndex((end) => end > i);
  const expected = new Set<string>();
  const mark = (index: number, kind: MomentKind) => expected.add(`${index} ${kind}`);
  let from = 0;
  run.ends.forEach((end, index) => {
    const step = events.slice(from, end);
    if (
      algorithmId === "bellman-ford" && index > 0 && step[0].group !== events[from - 1].group
      && !step.some((e) => e.type === "answer" || (e.type === "skip" && e.check))
    ) mark(index, "round");
    if (step.some((e) => e.type === "settle" && e.target && e.via !== undefined)) mark(index, "found");
    if (step.some((e) => e.type === "answer")) mark(index, "answer");
    from = end;
  });
  const negative = events.findIndex((e) => e.type === "relax" && e.weight < 0);
  if (algorithmId === "bellman-ford" && negative >= 0) mark(stepAt(negative), "negative");
  const loop = events.findIndex((e) => e.type === "classify" && e.kind === "back");
  if (loop >= 0 && algorithmId === "cycle-detection") mark(stepAt(loop), "loop");
  if (loop >= 0 && (algorithmId === "dfs" || algorithmId === "dfs-pathfinding")) mark(stepAt(loop), "back");

  const marked = keyMoments(run).map((m) => `${m.index} ${m.kind}`);
  if (new Set(marked).size !== marked.length) return "a moment is marked twice";
  const extra = marked.find((m) => !expected.has(m));
  if (extra) return `step ${extra} is marked, but its events hold no such moment`;
  const missing = [...expected].find((m) => !marked.includes(m));
  if (missing) return `step ${missing} is not marked`;
  if (!marked.includes(`${run.ends.length - 1} answer`)) return "the answer is not marked on the last step";
  return null;
};
