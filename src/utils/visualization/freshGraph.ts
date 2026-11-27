/**
 * Fresh graphs for Run it: a new small graph on each attempt, so a learner runs the algorithm on
 * inputs they have not seen (as TRAKLA2 and OpenDSA do). Same seed, same graph.
 *
 * Each graph is 5 to 8 nodes, lettered A, B, C… from the start on the left, laid out in columns so
 * no node overlaps another and no edge crosses another or runs through a node. It is valid input for
 * its algorithm (weights 2 to 9, as the canvas leaves a weight of 1 unwritten; Prim's undirected
 * and connected; the destination reachable; topological sort's a DAG, every edge pointing rightwards or
 * down a column), and whatever the learner picks, every run of it meets at
 * least one tie (a turn with more than one valid pick) and one lure: a wrong pick a learner is likely
 * to make there (`LURES`).
 *
 * Cycle detection's graphs mix it up (D53): about one in three has no loop; the others have one the
 * search from the start can reach, or one behind a dead end that only a new search finds.
 */
import { algorithmRegistry, type AlgorithmInput, type EdgeInfo } from "../../algorithms";
import {
  asks, familyOf, frameAt, misconception, steer, type AlgorithmEvent, type ChoicePolicy, type DecideEvent, type MisconceptionKind, type RunGraph,
} from "../../algorithms/engine";
import { graphFromSpec, type GeneratedGraph, type GraphSpec } from "../graph/graphGenerator";

/** A fresh graph and where its run starts (and ends, for the algorithms that need a destination). */
export interface FreshGraph {
  graph: GeneratedGraph;
  from: number;
  to: number | null;
}

/** The algorithms Run it offers, which fresh graphs are made for. */
export const FRESH_ALGORITHMS = [
  "dijkstra", "prims", "bfs", "dfs", "bfs-pathfinding", "dfs-pathfinding", "cycle-detection", "topological-sort",
] as const;

/**
 * The lures: the misconceptions (see `CATALOGUE`) a wrong pick is tempting for. Dijkstra's and
 * Prim's neighbour also hangs off the node just taken by its lightest edge to a waiting node: the
 * edge that looks best from where the run just was, though a cheaper one waits elsewhere. Cycle
 * detection's are a node the search already finished (it can't close a loop) and the node it just
 * came from, back along a two-way edge or against a one-way one (going straight back is not a loop).
 * Topological sort's are a node the one just placed points at, though something else still points
 * into it, and the node that comes first by name though something points into it.
 */
const LURES: Record<string, readonly MisconceptionKind[]> = {
  dijkstra: ["neighbour"],
  prims: ["neighbour"],
  bfs: ["other-parent"],
  dfs: ["wide"],
  "cycle-detection": ["finished", "followed", "came-in", "wrong-way"],
  "topological-sort": ["next-door", "label-order"],
};

/** mulberry32: a tiny seeded generator. */
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rand = () => number;
const int = (rand: Rand, n: number) => Math.floor(rand() * n);

/* ------------------------------------------------------------ layout */

/** Room between columns and the rows of a column of 1, 2 or 3 nodes, in canvas units (a node is 60 across). */
const COLUMN = 170;
const ROWS: Record<number, number[]> = { 1: [0], 2: [-95, 95], 3: [-150, 0, 150] };
/**
 * The least room kept between an edge's line and the centre of a node it does not join: the node's
 * radius, the half radius a one-way edge's curve bows out by, and a gap.
 */
const CLEARANCE = 60;

interface Point { x: number; y: number }

/** Where each node of `columns` (node counts, left to right) sits, column by column, top to bottom. */
function place(columns: number[]): Point[] {
  return columns.flatMap((count, c) => ROWS[count].map((y) => ({ x: (c - (columns.length - 1) / 2) * COLUMN, y })));
}

const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

/** Whether segments ab and cd cross at a point inside both (sharing an end is not crossing). */
function crosses(a: Point, b: Point, c: Point, d: Point): boolean {
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** How far point p is from segment ab. */
function distance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Whether an edge from node `a` to node `b` would draw cleanly beside `edges`: crossing none, clear of every other node. */
function drawsCleanly(points: Point[], edges: GraphSpec["edges"], a: number, b: number): boolean {
  if (edges.some((e) => (e.from === a && e.to === b) || (e.from === b && e.to === a))) return false;
  if (points.some((p, i) => i !== a && i !== b && distance(p, points[a], points[b]) < CLEARANCE)) return false;
  return !edges.some((e) => crosses(points[a], points[b], points[e.from], points[e.to]));
}

/** Shuffles a list in place. */
function shuffle<T>(rand: Rand, list: T[]): T[] {
  for (let i = list.length - 1; i > 0; i--) {
    const j = int(rand, i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/**
 * For each of `children` nodes (top to bottom), the index of its parent among `parents` nodes, never
 * going back up, so the edges between two columns never cross. Every parent gets a child when there
 * are enough children.
 */
function parentsOf(rand: Rand, children: number, parents: number): number[] {
  if (children >= parents) {
    // Cut the children into `parents` runs of one or more.
    const cuts = shuffle(rand, Array.from({ length: children - 1 }, (_, i) => i + 1)).slice(0, parents - 1).sort((a, b) => a - b);
    return Array.from({ length: children }, (_, i) => cuts.filter((c) => c <= i).length);
  }
  return Array.from({ length: children }, () => int(rand, parents)).sort((a, b) => a - b);
}

/* ------------------------------------------------------------ shapes */

interface Shape {
  spec: GraphSpec;
  /** Node indexes into the spec. */
  from: number;
  to: number | null;
}

const LETTERS = "ABCDEFGH";

const lettered = (points: Point[]): GraphSpec["nodes"] => points.map((p, i) => ({ ...p, label: LETTERS[i] }));

/**
 * A layered graph: the start alone on the left, then columns of 2, 2 or 3, and 0 to 2 nodes. Each
 * node is joined to one in the column before (each node of the second column gets one of its own
 * further on), then some more edges between neighbouring columns and down a column, where they draw
 * cleanly. `apartSecond` keeps the second column's nodes unjoined (DFS: each waits from the start).
 * `directed` points every edge rightwards or down a column, so there is no loop. `columns` sets the
 * column sizes instead (left to right).
 */
function layered(rand: Rand, { weighted, apartSecond, directed = false, columns: sizes }: {
  weighted: boolean; apartSecond: boolean; directed?: boolean; columns?: number[];
}) {
  const columns = (sizes ?? [1, 2, 2 + int(rand, 2), int(rand, 3)]).filter((n) => n > 0);
  const points = place(columns);
  const first = columns.map((_, c) => columns.slice(0, c).reduce((a, b) => a + b, 0));
  const weight = () => (weighted ? 2 + int(rand, 8) : 1);
  const edges: GraphSpec["edges"] = [];
  const join = (from: number, to: number) => edges.push({ from, to, weight: weight(), directed });

  for (let c = 1; c < columns.length; c++) {
    parentsOf(rand, columns[c], columns[c - 1]).forEach((p, i) => join(first[c - 1] + p, first[c] + i));
  }
  const more: Array<[number, number]> = [];
  for (let c = 0; c < columns.length; c++) {
    for (let i = 0; i < columns[c]; i++) {
      if (i + 1 < columns[c] && !(apartSecond && c === 1)) more.push([first[c] + i, first[c] + i + 1]);
      if (c + 1 < columns.length) for (let j = 0; j < columns[c + 1]; j++) more.push([first[c] + i, first[c + 1] + j]);
    }
  }
  for (const [a, b] of shuffle(rand, more)) {
    if (rand() < 0.4 && drawsCleanly(points, edges, a, b)) join(a, b);
  }
  return { nodes: lettered(points), edges, last: first[columns.length - 1], count: points.length };
}

/**
 * Cycle detection: a dead end, then a loop. The start points at two or three nodes in the next
 * column, the dead end; to their right a one-way loop of three or four, with edges pointing back at
 * the dead end's nodes. Without a `bridge` the search from the start finds no loop and a new search
 * has to find it; with one, a dead-end node points into the loop, so the first search gets there.
 */
function deadEndThenLoop(rand: Rand, bridge: boolean): Shape {
  const fan = 2 + int(rand, 2);
  const x = (column: number) => (column - 1.5) * COLUMN;
  const points: Point[] = [{ x: x(0), y: 0 }, ...ROWS[fan].map((y) => ({ x: x(1), y }))];
  // The loop, round the clock: a square (top left, top right, bottom right, bottom left) or a triangle (top, right, bottom).
  points.push(...(rand() < 0.5
    ? [{ x: x(2), y: -95 }, { x: x(3), y: -95 }, { x: x(3), y: 95 }, { x: x(2), y: 95 }]
    : [{ x: x(2), y: -95 }, { x: x(3), y: 0 }, { x: x(2), y: 95 }]));

  const edges: GraphSpec["edges"] = [];
  const point = (from: number, to: number) => edges.push({ from, to, weight: 1, directed: true });
  for (let i = 1; i <= fan; i++) point(0, i);
  // Down the dead end's column now and then: still no loop, as every edge there points down.
  for (let i = 1; i < fan; i++) if (rand() < 0.3) point(i, i + 1);
  const ring = points.slice(1 + fan).map((_, k) => 1 + fan + k);
  const way = rand() < 0.5 ? ring : [...ring].reverse();
  way.forEach((node, k) => point(node, way[(k + 1) % way.length]));
  const left = ring.filter((n) => points[n].x === x(2));
  if (bridge) {
    const ways = shuffle(rand, left.flatMap((n) => Array.from({ length: fan }, (_, k) => [1 + k, n] as [number, number])));
    const into = ways.find(([from, to]) => drawsCleanly(points, edges, from, to));
    if (into) point(...into);
  }
  // The loop's left-hand nodes point back at the dead end: at least one, each where it draws cleanly.
  const back = shuffle(rand, left.flatMap((n) => Array.from({ length: fan }, (_, k) => [n, 1 + k] as [number, number])));
  let pointed = 0;
  for (const [from, to] of back) {
    if ((pointed === 0 || rand() < 0.35) && drawsCleanly(points, edges, from, to)) {
      point(from, to);
      pointed += 1;
    }
  }
  return { spec: { nodes: lettered(points), edges }, from: 0, to: null };
}

/** Cycle detection's kinds of graph: no loop, a loop the search from the start reaches, or one behind a dead end. */
type Loop = "none" | "reachable" | "behind";

/**
 * Cycle detection's shapes. No loop: every edge points rightwards or down. A reachable loop: every
 * edge two-way, or the dead end and one-way loop with a way from one into the other. Behind: the
 * dead end and the loop apart.
 */
function cycleShape(rand: Rand, loop: Loop): Shape {
  if (loop === "behind") return deadEndThenLoop(rand, false);
  if (loop === "reachable" && rand() < 0.5) return deadEndThenLoop(rand, true);
  const { nodes, edges } = layered(rand, { weighted: false, apartSecond: false, directed: loop === "none" });
  return { spec: { nodes, edges }, from: 0, to: null };
}

/** Which kind of graph a run of cycle detection shows: no loop, or a loop found with or without a new search. */
const loopIn = (events: readonly AlgorithmEvent[]): Loop =>
  events.some((e) => e.type === "answer" && e.kind === "cycle" && e.cycle === null) ? "none"
    : events.some((e) => e.type === "decide" && e.kind === "restart") ? "behind" : "reachable";

/** The shape for an algorithm, before checking: the start is always A, on the left. */
function shapeFor(algorithmId: string, rand: Rand, loop: Loop): Shape {
  switch (algorithmId) {
    case "cycle-detection":
      return cycleShape(rand, loop);
    case "dijkstra":
    case "prims": {
      const { nodes, edges } = layered(rand, { weighted: true, apartSecond: false });
      return { spec: { nodes, edges }, from: 0, to: null };
    }
    case "topological-sort": {
      // Two nodes on the left with nothing pointing into them, so the sort starts with a choice.
      const columns = [2, 2 + int(rand, 2), 1 + int(rand, 2), int(rand, 2)];
      const { nodes, edges } = layered(rand, { weighted: false, apartSecond: false, directed: true, columns });
      return { spec: { nodes, edges }, from: 0, to: null };
    }
    default: {
      const dfs = familyOf(algorithmId) === "dfs";
      const { nodes, edges, last, count } = layered(rand, { weighted: false, apartSecond: dfs });
      // The destination: a node in the last column.
      const to = algorithmId.endsWith("-pathfinding") ? last + int(rand, count - last) : null;
      return { spec: { nodes, edges }, from: 0, to };
    }
  }
}

/* ------------------------------------------------------------ checking */

/** The input the algorithm runs on, as `buildRun` makes it. */
function inputOf({ nodes, edges }: GeneratedGraph, from: number, to: number | null): AlgorithmInput {
  const adjacencyList = new Map<number, EdgeInfo[]>();
  edges.forEach((list, id) => adjacencyList.set(id, list.map((e) => ({ from: e.from, to: e.to, weight: e.weight, type: e.type as EdgeInfo["type"] }))));
  return { adjacencyList, nodes: nodes.map((n) => ({ id: n.id, label: n.label })), startNodeId: from, endNodeId: to ?? undefined };
}

/** Dijkstra: the farthest node from the start (the last a full run would take), the latest one on a tie. */
function farthest(input: AlgorithmInput): number {
  // A destination outside the graph: the run takes every node it can reach.
  const events = algorithmRegistry.get("dijkstra")!.events({ ...input, endNodeId: -1 });
  const settled = events.flatMap((e) => (e.type === "settle" ? [e.node] : []));
  return settled[settled.length - 1];
}

/** At most this many runs of one graph are checked; a graph with more is passed over. */
const RUN_LIMIT = 400;

/**
 * Every run a learner can make on the input (every sequence of valid picks), as events; null when
 * there are more than RUN_LIMIT.
 */
function everyRun(run: (choose: ChoicePolicy) => AlgorithmEvent[]): AlgorithmEvent[][] | null {
  const runs: AlgorithmEvent[][] = [];
  const pending: number[][] = [[]];
  while (pending.length > 0) {
    const picks = pending.pop()!;
    const { events } = steer(run, picks);
    const decisions = events.filter((e): e is DecideEvent => e.type === "decide");
    const fork = decisions.findIndex((d, i) => i >= picks.length && d.options.length > 1);
    if (fork < 0) {
      runs.push(events);
      if (runs.length > RUN_LIMIT) return null;
      continue;
    }
    const taken = decisions.slice(0, fork).map((d) => d.node);
    for (const option of decisions[fork].options) pending.push([...taken, option]);
  }
  return runs;
}

/** The wrong picks at the decision `events[at]` that are lures (see `LURES`). */
function luresAt(algorithmId: string, events: readonly AlgorithmEvent[], at: number, graph: RunGraph, nodes: readonly number[]): number[] {
  const family = familyOf(algorithmId);
  if (!family) return [];
  const decide = events[at] as DecideEvent;
  const decision = events.slice(0, at).filter((e) => e.type === "decide").length;
  const frame = frameAt(events, at);
  const lightest = (from: number) => {
    const waiting = new Set(frame.queue.map((item) => item.id));
    return Math.min(...(graph.get(from) ?? []).filter((e) => waiting.has(e.to)).map((e) => e.weight));
  };
  return nodes.filter((pick) => {
    if (decide.options.includes(pick)) return false;
    const { kind } = misconception(algorithmId, events, { choice: pick, decision, event: at, decide }, graph);
    if (!LURES[family].includes(kind)) return false;
    if (kind === "wrong-way") return frame.current !== null && frame.via.get(frame.current) === pick;
    if (family !== "dijkstra" && family !== "prims") return true;
    const current = frame.current!;
    return (graph.get(current) ?? []).some((e) => e.to === pick && e.weight === lightest(current));
  });
}

/**
 * Whether every run of the input meets a tie and a lure at turns where the run waits for the learner
 * (and, for cycle detection, shows the kind of graph asked for).
 */
function interesting(algorithmId: string, input: AlgorithmInput, loop: Loop): boolean {
  const adapter = algorithmRegistry.get(algorithmId)!;
  const runs = everyRun((choose) => adapter.events(input, choose));
  if (!runs) return false;
  if (algorithmId === "cycle-detection" && runs.some((events) => loopIn(events) !== loop)) return false;
  const graph = input.adjacencyList;
  const ids = input.nodes.map((n) => n.id);
  return runs.every((events) => {
    const turns = events.flatMap((e, at) => (e.type === "decide" && asks(algorithmId, events, at, graph) ? [at] : []));
    return turns.some((at) => (events[at] as DecideEvent).options.length > 1)
      && turns.some((at) => luresAt(algorithmId, events, at, graph, ids).length > 0);
  });
}

/** Tries before giving up on a seed (none has needed close to this many). */
const ATTEMPTS = 400;

/**
 * A fresh graph for the algorithm, made from `seed`, with where its run starts (and ends); null for
 * an algorithm Run it does not offer.
 */
export function freshGraph(algorithmId: string, seed: number): FreshGraph | null {
  if (!(FRESH_ALGORITHMS as readonly string[]).includes(algorithmId)) return null;
  const rand = random(seed);
  // Cycle detection: about one graph in three has no loop, the rest a loop the first search reaches or one behind a dead end.
  const pick = rand();
  const loop: Loop = pick < 1 / 3 ? "none" : pick < 0.75 ? "reachable" : "behind";
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const shape = shapeFor(algorithmId, rand, loop);
    const graph = graphFromSpec(shape.spec);
    // Spec indexes are ids less one.
    const from = shape.from + 1;
    let to = shape.to === null ? null : shape.to + 1;
    if (algorithmId === "dijkstra") to = farthest(inputOf(graph, from, null));
    if (to === from) continue;
    if (interesting(algorithmId, inputOf(graph, from, to), loop)) return { graph, from, to };
  }
  return null;
}
