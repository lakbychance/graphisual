/**
 * Turns: running an algorithm yourself ("Run it"). The run plays on its own and waits for the
 * learner only where they could go wrong (`asks`); a pick that is not valid is named for the
 * misconception it most likely comes from (`misconception`), read from what the learner saw at that
 * decision (`frameAt` at the decision). Every valid pick is accepted: validity is the run's own
 * (`steer`), so a misconception is only ever looked for once a pick has been rejected.
 *
 * Words follow the narration's voice (present tense, plain words, no full stops), node ids marked
 * with `nid`.
 */
import { nid } from "../traceHelpers";
import type { EdgeInfo } from "../types";
import type { Rejection } from "./choices";
import type { AlgorithmEvent, DecideEvent } from "./events";
import { frameAt, type Frame } from "./frame";

/** The graph a run was made on: each node's edges, as the algorithm was given them. */
export type RunGraph = ReadonlyMap<number, readonly EdgeInfo[]>;

/**
 * Whether the run waits for the learner at the decision `events[at]`: whenever it has more than one
 * valid option, and otherwise whenever there is something to get wrong. For the algorithms with a
 * frontier that is more than one node waiting in it; for cycle detection more than one of the
 * node's edges still to follow (not counting a way back along the edge it came in on), or an edge
 * that closes the loop. Everything else plays on its own.
 */
export function asks(algorithmId: string, events: readonly AlgorithmEvent[], at: number, graph: RunGraph): boolean {
  const decision = events[at] as DecideEvent;
  if (decision.options.length > 1) return true;
  if (decision.kind === "restart") return false;
  const frame = frameAt(events, at);
  if (algorithmId !== "cycle-detection") return frame.queue.length > 1;
  const [only] = decision.options;
  if (frame.settled.includes(only)) return true;
  const node = frame.current as number;
  const cameFrom = frame.via.get(node);
  return toFollow(events, at, node, graph).filter((to) => to !== cameFrom).length > 1;
}

/** Cycle detection: the nodes at the end of `node`'s edges it has not checked yet when it decides at `at`. */
function toFollow(events: readonly AlgorithmEvent[], at: number, node: number, graph: RunGraph): number[] {
  let visit = at;
  while (visit > 0 && !(events[visit].type === "settle" && (events[visit] as { node: number }).node === node)) visit--;
  const left = new Map<number, number>();
  for (const { to } of graph.get(node) ?? []) left.set(to, (left.get(to) ?? 0) + 1);
  for (let i = visit; i < at; i++) {
    const e = events[i];
    if ((e.type === "classify" || e.type === "skip") && e.from === node) left.set(e.to, (left.get(e.to) ?? 0) - 1);
  }
  return [...left].flatMap(([to, n]) => (n > 0 ? [to] : []));
}

/* ------------------------------------------------------------ catalogue */

/**
 * The misconceptions a wrong pick is named for, per algorithm. `other` is the fallback: what the
 * algorithm takes, said plainly, when no entry fits.
 */
export const CATALOGUE = {
  dijkstra: ["final", "unreached", "neighbour", "edge-weight", "label-order", "farther", "other"],
  prims: ["in-tree", "unreached", "neighbour", "label-order", "dearer", "other"],
  bfs: ["visited", "unseen", "deeper", "other-parent", "other"],
  dfs: ["visited", "unseen", "wide", "other"],
  "cycle-detection": ["self", "wrong-way", "not-neighbour", "came-in", "followed", "finished", "searched", "other"],
  "topological-sort": ["placed", "next-door", "label-order", "pointed-at", "other"],
} as const;

type Family = keyof typeof CATALOGUE;
export type MisconceptionKind = (typeof CATALOGUE)[Family][number];

/** The catalogue an algorithm uses (the pathfinding searches share their traversal's). */
export const familyOf = (algorithmId: string): Family | null => {
  switch (algorithmId) {
    case "dijkstra":
    case "prims":
    case "cycle-detection":
    case "topological-sort":
      return algorithmId;
    case "bfs":
    case "bfs-pathfinding":
      return "bfs";
    case "dfs":
    case "dfs-pathfinding":
      return "dfs";
    default:
      return null;
  }
};

export interface Misconception {
  kind: MisconceptionKind;
  /** One or two sentences, kind and specific, node ids marked with `nid`. */
  text: string;
}

/** Who takes the next node, mid-sentence. */
const NAME: Record<Family, string> = {
  dijkstra: "Dijkstra", prims: "Prim's", bfs: "BFS", dfs: "DFS", "cycle-detection": "the search", "topological-sort": "the sort",
};

/** What each algorithm takes, for the fallback. */
const RULE: Record<Family, string> = {
  dijkstra: "Dijkstra always takes the waiting node closest to the start",
  prims: "Prim's always adds the node joined to the tree by the cheapest edge",
  bfs: "BFS always takes the node at the front of the queue",
  dfs: "DFS always takes the node on top of the stack",
  "cycle-detection": "the search follows an edge to a node not yet visited, or back to one still in progress",
  "topological-sort": "the sort takes a node only once nothing points into it",
};

const num = (value: number | undefined) =>
  value === undefined || value === Infinity ? "∞" : value < 0 ? `−${-value}` : String(value);

/** The question the run asks at a decision. */
export function question(algorithmId: string, decision: DecideEvent, frame: Frame): string {
  const family = familyOf(algorithmId);
  if (decision.kind === "restart") return "Where does a new search start?";
  switch (family) {
    case "dijkstra":
      return "Which node does Dijkstra take next?";
    case "prims":
      return "Which node does Prim's add to the tree next?";
    case "bfs":
      return "Which node does BFS take from the queue next?";
    case "dfs":
      return "Which node does DFS take from the stack next?";
    case "topological-sort":
      return "Which node goes next in the order?";
    default:
      return frame.current === null ? "Where does the search go next?" : `Where does the search go from ${nid(frame.current)} next?`;
  }
}

/** The words for a valid pick: a plain yes, and, when others were valid too, that the run follows this one. */
export function accepted(decision: DecideEvent, pick: number, frame: Frame, algorithmId: string): string {
  const others = decision.options.filter((o) => o !== pick);
  const closes = algorithmId === "cycle-detection" && decision.kind === "next" && frame.settled.includes(pick);
  const yes = closes ? `Yes, ${nid(pick)} closes the loop` : `Yes, ${nid(pick)}`;
  if (others.length === 0) return yes;
  const also = others.length === 1 ? `${nid(others[0])} works too` : `${others.slice(0, -1).map(nid).join(", ")} and ${nid(others[others.length - 1])} work too`;
  return `${yes} — ${also}, and the run follows your pick`;
}

/** Each algorithm's rule, put as a clue. */
const CLUE: Record<Family, string> = {
  dijkstra: "the closest waiting node wins — closest to the start, counting the whole route",
  prims: "the cheapest edge leaving the tree wins — from whichever tree node it leaves",
  bfs: "first in, first out — the node at the front of the queue goes next, or one that joined with it",
  dfs: "last in, first out — the newest node on the stack goes next, or one pushed with it",
  "cycle-detection": "the search goes on to a node not yet visited, or back to one still in progress, which closes a loop — but never straight back along the edge it came in on",
  "topological-sort": "a node can go next once nothing points into it any more — any node on the ready list will do",
};

/**
 * Cycle detection's clue where a finished node closes the loop: on a graph that mixes one-way and
 * two-way edges, a finished node leads back up the two-way edges it and its ancestors came in on.
 */
const CLUE_THROUGH_FINISHED =
  "the search goes on to a node not yet visited, or back to one still in progress, which closes a loop — a finished node closes one too when its two-way edges lead back to a node in progress";

/**
 * The first hint, after two wrong tries: the algorithm's rule, as a clue (D49), read from the frame
 * the learner sees at `decision`, so it never rules out a valid pick.
 */
export function clue(algorithmId: string, decision: DecideEvent, frame: Frame): string {
  if (decision.kind === "restart") return "A hint: a new search starts at a node no search has reached yet";
  const family = familyOf(algorithmId) ?? "dijkstra";
  if (family === "cycle-detection" && decision.options.some((o) => frame.finished.includes(o))) return `A hint: ${CLUE_THROUGH_FINISHED}`;
  return `A hint: ${CLUE[family]}`;
}

/** The second hint, after three wrong tries: the valid picks, by name. */
export function hint(algorithmId: string, decision: DecideEvent): string {
  const { options } = decision;
  const names = options.length === 1 ? nid(options[0]) : `${options.slice(0, -1).map(nid).join(", ")} or ${nid(options[options.length - 1])}`;
  const who = NAME[familyOf(algorithmId) ?? "dijkstra"];
  return `A hint: ${who} can take ${names} here`;
}

/**
 * Why `rejection`'s pick is not valid, named for the misconception it most likely comes from. Read
 * from the frame the learner saw at that decision, the graph, and (to tell node names apart in
 * label order) `label`.
 */
export function misconception(
  algorithmId: string, events: readonly AlgorithmEvent[], rejection: Rejection, graph: RunGraph,
  label: (id: number) => string = String,
): Misconception {
  const family = familyOf(algorithmId);
  const frame = frameAt(events, rejection.event);
  const found = family ? CLASSIFY[family]({ frame, pick: rejection.choice, decision: rejection.decide, graph, label, events, at: rejection.event }) : null;
  return found ?? { kind: "other", text: `Not ${nid(rejection.choice)} — ${RULE[family ?? "dijkstra"]}` };
}

interface Seen {
  frame: Frame;
  pick: number;
  decision: DecideEvent;
  graph: RunGraph;
  label: (id: number) => string;
  events: readonly AlgorithmEvent[];
  at: number;
}

type Classify = (seen: Seen) => Misconception | null;

const leadsTo = (graph: RunGraph, from: number, to: number) => (graph.get(from) ?? []).some((e) => e.to === to);
const waiting = (frame: Frame) => frame.queue.map((item) => item.id);
/** The waiting node that comes first by name. */
const firstByName = (ids: number[], label: (id: number) => string) =>
  [...ids].sort((a, b) => label(a).localeCompare(label(b), undefined, { numeric: true }) || a - b)[0];

/** Dijkstra's and Prim's: the shared start (already final, not yet reached) and the neighbour of the node just taken. */
function priority(tree: boolean): Classify {
  return ({ frame, pick, decision, graph, label }) => {
    const P = nid(pick);
    const [first] = decision.options;
    const O = nid(first);
    const best = frame.dist.get(first);
    if (frame.settled.includes(pick)) {
      return tree
        ? { kind: "in-tree", text: `${P} is already in the tree — Prim's only adds a node from outside it` }
        : { kind: "final", text: `${P} is already final, so its distance can't get any shorter — Dijkstra never takes a node twice` };
    }
    const queue = waiting(frame);
    if (!queue.includes(pick)) {
      return tree
        ? { kind: "unreached", text: `No edge joins ${P} to the tree yet — Prim's only adds a node one edge away from the tree` }
        : { kind: "unreached", text: `Nothing has reached ${P} yet, so its distance is still ∞ — Dijkstra only takes a node waiting in the queue` };
    }
    const value = frame.dist.get(pick);
    const current = frame.current;

    if (current !== null && leadsTo(graph, current, pick)) {
      const away = decision.options.find((o) => !leadsTo(graph, current, o));
      if (away !== undefined) {
        return tree
          ? { kind: "neighbour", text: `${P} hangs off ${nid(current)}, the node just added, but Prim's weighs every edge leaving the tree — ${nid(away)} joins for ${num(best)}` }
          : { kind: "neighbour", text: `${P} is next to ${nid(current)}, but ${nid(away)} is closer to the start overall — Dijkstra always takes the closest node in the whole queue` };
      }
    }
    if (!tree) {
      // The last edge into a waiting node, from the final node it hangs off.
      const lastEdge = (id: number) => {
        const via = frame.prev.get(id);
        return via === undefined ? undefined : (frame.dist.get(id) as number) - (frame.dist.get(via) as number);
      };
      const edge = lastEdge(pick);
      const optionEdge = lastEdge(first);
      if (edge !== undefined && optionEdge !== undefined && edge < optionEdge && queue.every((id) => (lastEdge(id) ?? Infinity) >= edge)) {
        return { kind: "edge-weight", text: `${P} is just one short edge away, but Dijkstra counts the whole route from the start — ${O} is at ${num(best)}, ${P} at ${num(value)}` };
      }
    }
    if (queue.length > 1 && firstByName(queue, label) === pick) {
      return tree
        ? { kind: "label-order", text: `${P} comes first by name, but Prim's goes by cost — ${O} joins for ${num(best)}, ${P} for ${num(value)}` }
        : { kind: "label-order", text: `${P} comes first by name, but Dijkstra goes by distance — ${O} is at ${num(best)}, ${P} at ${num(value)}` };
    }
    return tree
      ? { kind: "dearer", text: `${P} joins for ${num(value)}, but ${O} joins for ${num(best)} — Prim's always adds the cheapest edge leaving the tree` }
      : { kind: "farther", text: `${P} is at ${num(value)}, but ${O} is closer at ${num(best)} — Dijkstra always takes the closest node in the queue` };
  };
}

/** How many edges from the start a waiting or visited node is, along the links that found it. */
function depth(frame: Frame, id: number): number {
  let n = 0;
  for (let at = frame.prev.get(id); at !== undefined; at = frame.prev.get(at)) n++;
  return n;
}

const bfs: Classify = ({ frame, pick, decision }) => {
  const P = nid(pick);
  const O = nid(decision.options[0]);
  if (frame.settled.includes(pick)) return { kind: "visited", text: `${P} was already visited — BFS takes each node once` };
  const queue = waiting(frame);
  if (!queue.includes(pick)) return { kind: "unseen", text: `Nothing has found ${P} yet — BFS only takes a node waiting in the queue` };
  const front = queue[0];
  if (depth(frame, pick) > depth(frame, front)) {
    return { kind: "deeper", text: `${P} is a level further out than ${O} — BFS finishes every node at one distance before going deeper` };
  }
  if (depth(frame, pick) === depth(frame, front)) {
    return { kind: "other-parent", text: `${P} is just as far out, but ${O} joined the queue first — a queue serves nodes in the order they arrived` };
  }
  return null;
};

const dfs: Classify = ({ frame, pick, decision }) => {
  const P = nid(pick);
  const O = nid(decision.options[0]);
  if (frame.settled.includes(pick)) return { kind: "visited", text: `${P} was already visited — DFS takes each node once` };
  const stack = waiting(frame);
  if (!stack.includes(pick)) return { kind: "unseen", text: `Nothing has pushed ${P} yet — DFS only takes a node waiting on the stack` };
  const from = frame.prev.get(pick);
  if (from === undefined) return null;
  return { kind: "wide", text: `${P} waits from ${nid(from)}, further up, but DFS goes deep first — it takes ${O}, the newest node on the stack` };
};

const cycleDetection: Classify = ({ frame, pick, decision, graph }) => {
  const P = nid(pick);
  if (decision.kind === "restart") {
    return { kind: "searched", text: `${P} was already searched — a new search starts at a node no search has reached yet` };
  }
  const node = frame.current;
  if (node === null) return null;
  const U = nid(node);
  if (pick === node) return { kind: "self", text: `That's ${U} itself — pick the node at the other end of one of ${U}'s edges` };
  if (!leadsTo(graph, node, pick)) {
    return leadsTo(graph, pick, node)
      ? { kind: "wrong-way", text: `The edge between ${U} and ${P} points into ${U} — the search follows a one-way edge only its way` }
      : { kind: "not-neighbour", text: `${U} has no edge to ${P} — the search only follows ${U}'s own edges` };
  }
  if (frame.via.get(node) === pick) {
    return { kind: "came-in", text: `${U} came in from ${P} along this edge — going straight back along it isn't a loop` };
  }
  if (frame.finished.includes(pick)) {
    return frame.via.get(pick) === node
      ? { kind: "followed", text: `The search already went from ${U} into ${P} and finished it — nothing new is there` }
      : { kind: "finished", text: `${P} is already finished and nothing from it leads back to a node still in progress, so it can't close a loop` };
  }
  return null;
};

/**
 * Topological sort: a node already in the order, or one that something still points into: a node the
 * one just placed points at (its edge no longer counts, but another still does), the node first by
 * name, or any other.
 */
const topologicalSort: Classify = ({ frame, pick, decision, graph, label }) => {
  const P = nid(pick);
  if (frame.settled.includes(pick)) return { kind: "placed", text: `${P} is already in the order — each node goes in once` };
  const placed = new Set(frame.settled);
  const into = [...graph].find(([from, edges]) => !placed.has(from) && edges.some((e) => e.to === pick))?.[0];
  if (into === undefined) return null;
  const still = `${nid(into)} → ${P} still points into it`;
  const current = frame.current;
  if (current !== null && leadsTo(graph, current, pick)) {
    return { kind: "next-door", text: `${P} comes after ${nid(current)}, but ${still} — a node goes next only once nothing points into it` };
  }
  const left = [...graph.keys()].filter((id) => !placed.has(id));
  if (left.length > 1 && firstByName(left, label) === pick) {
    return { kind: "label-order", text: `${P} comes first by name, but ${still} — the order follows the arrows, not the names` };
  }
  const n = frame.dist.get(pick) ?? 0;
  return {
    kind: "pointed-at",
    text: `${P} still has ${n} ${n === 1 ? "edge" : "edges"} pointing into it, like ${nid(into)} → ${P} — ${nid(decision.options[0])} has none`,
  };
};

const CLASSIFY: Record<Family, Classify> = {
  dijkstra: priority(false),
  prims: priority(true),
  bfs,
  dfs,
  "cycle-detection": cycleDetection,
  "topological-sort": topologicalSort,
};
