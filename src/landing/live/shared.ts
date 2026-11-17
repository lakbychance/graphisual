import type { LabEdge, LabGraph } from "../engine";
import type { CompareTable, Experiment, LiveConfig } from "./types";

type Point = [number, number];
const LABELS = ["A", "B", "C", "D", "E", "F"];

/** Six-node layouts: the wide hero plate (1200 x 600), the tall one (390 x 640), and a compact card (560 x 300). */
export const WIDE: Point[] = [[150, 400], [480, 300], [340, 520], [850, 290], [730, 520], [1070, 410]];
export const TALL: Point[] = [[60, 292], [236, 266], [128, 388], [322, 376], [170, 520], [322, 574]];
export const COMPACT: Point[] = [[60, 150], [200, 60], [200, 240], [360, 60], [360, 240], [500, 150]];
/** Four nodes for the small experiments (540 x 300). */
const FOUR: Point[] = [[70, 150], [290, 66], [210, 244], [470, 150]];

const nodesAt = (points: Point[]) => points.map(([x, y], id) => ({ id, label: LABELS[id], x, y }));
const edgesOf = (list: Array<[number, number, number]>, directed = false): LabEdge[] =>
  list.map(([from, to, weight]) => ({ from, to, weight, directed: directed || undefined }));

/** The page's own graph in one of the layouts. Only pathfinding algorithms get an end node. */
export function pageGraph(live: LiveConfig, points: Point[]): LabGraph {
  return { nodes: nodesAt(points), edges: edgesOf(live.edges, live.directed), start: 0, end: live.kind === "route" ? 5 : undefined };
}

/** The classic weighted graph used on most pages. */
export const WEIGHTED_EDGES: Array<[number, number, number]> = [
  [0, 1, 4], [0, 2, 2], [2, 1, 1], [1, 3, 5], [2, 4, 9], [3, 4, 2], [3, 5, 3], [4, 5, 6],
];
export const PLAIN_EDGES = WEIGHTED_EDGES.map(([from, to]) => [from, to, 1] as [number, number, number]);

/**
 * A fresh six-node graph for the hero: one node per cell of a loose grid, so
 * every material gets some, joined to its neighbors.
 */
export function scatterGraph(narrow: boolean, live: LiveConfig): LabGraph {
  const cols = narrow ? 2 : 3;
  const rows = narrow ? 3 : 2;
  // The wide box stops short of the New graph key in the plate's bottom corner.
  const box = narrow ? { x0: 56, x1: 334, y0: 262, y1: 590 } : { x0: 150, x1: 1070, y0: 300, y1: 478 };
  const jitter = narrow ? 26 : 70;
  const rand = (spread: number) => (Math.random() - 0.5) * spread;
  const weight = () => (live.weighted ? 1 + Math.floor(Math.random() * 9) : 1);
  // Wide plates read left to right, tall ones top to bottom, so label in that order.
  const cells: Point[] = [];
  if (narrow) for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push([c, r]);
  else for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) cells.push([c, r]);
  const index = (c: number, r: number) => cells.findIndex(([cc, rr]) => cc === c && rr === r);
  const nodes = cells.map(([c, r], id) => ({
    id, label: LABELS[id],
    x: box.x0 + (c / (cols - 1)) * (box.x1 - box.x0) + rand(jitter),
    y: box.y0 + (r / (rows - 1)) * (box.y1 - box.y0) + rand(jitter * 0.5),
  }));
  const edges: LabEdge[] = [];
  // On directed pages most edges point away from the start; `back` turns one around, which is what makes cycles.
  const join = (from: number, to: number, back = false) => {
    if (!live.directed) edges.push({ from, to, weight: weight() });
    else edges.push(back ? { from: to, to: from, weight: weight(), directed: true } : { from, to, weight: weight(), directed: true });
  };
  for (const [c, r] of cells) {
    // The first row always joins across and every cell joins the one below it,
    // so every node can be reached from the start; the other links are optional.
    if (c + 1 < cols && (r === 0 || Math.random() < 0.7)) join(index(c, r), index(c + 1, r), r > 0 && Math.random() < 0.6);
    if (r + 1 < rows) join(index(c, r), index(c, r + 1));
    if (c + 1 < cols && r + 1 < rows && Math.random() < 0.55) {
      if (Math.random() < 0.5) join(index(c, r), index(c + 1, r + 1), Math.random() < 0.3);
      else join(index(c + 1, r), index(c, r + 1));
    }
  }
  return { nodes, edges, start: 0, end: live.kind === "route" ? nodes.length - 1 : undefined };
}

/* -------------------------------------------------------------- experiments */

/** One negative edge: Dijkstra's settles B too early, Bellman-Ford corrects it. */
export const negativeEdge = (runs: Experiment["runs"], text: string): Experiment => ({
  title: "Break it yourself",
  text,
  toggle: "The edge from C to B is negative",
  initial: true,
  weighted: () => true,
  runs,
  graph: (on) => ({
    start: 0, end: 3, nodes: nodesAt(FOUR),
    edges: edgesOf([[0, 1, 2], [0, 2, 5], [2, 1, on ? -4 : 3], [1, 3, 1]], true),
  }),
});

/** The same graph walked breadth first and depth first, from either end. */
export const twoOrders = (runs: Experiment["runs"]): Experiment => ({
  title: "Same graph, two orders",
  text: "Both visit every node exactly once. Breadth first finishes each level before going deeper; depth first follows one branch to its end before trying the next.",
  toggle: "Start from F instead of A",
  initial: false,
  weighted: () => false,
  runs,
  graph: (on) => ({ start: on ? 5 : 0, nodes: nodesAt(COMPACT), edges: edgesOf(PLAIN_EDGES) }),
});

/* ------------------------------------------------------------------- tables */

export const ROUTE_TABLE: CompareTable = {
  title: "Which pathfinding algorithm to use",
  columns: ["Algorithm", "Finds", "Edge weights", "Time"],
  mono: 2,
  rows: [
    { name: "Dijkstra's", cells: ["The cheapest route", "Non-negative only", "O((V + E) log V)"] },
    { name: "Bellman-Ford", cells: ["The cheapest route", "Any, and it detects negative cycles", "O(V · E)"] },
    { name: "BFS pathfinding", cells: ["The route with the fewest edges", "Ignored", "O(V + E)"] },
    { name: "DFS pathfinding", cells: ["Some route, not always the shortest", "Ignored", "O(V + E)"] },
  ],
};

export const TRAVERSAL_TABLE: CompareTable = {
  title: "BFS and DFS side by side",
  columns: ["Algorithm", "Order", "Structure", "Memory"],
  rows: [
    { name: "BFS", cells: ["Level by level, nearest nodes first", "Queue", "The widest level"] },
    { name: "DFS", cells: ["One branch to its end, then back up", "Stack", "The deepest branch"] },
  ],
};

export const OTHERS = [
  { id: "dijkstra", name: "Dijkstra's", why: "Cheapest route when no edge is negative" },
  { id: "bellman-ford", name: "Bellman-Ford", why: "Cheapest route when edges can be negative" },
  { id: "bfs-pathfinding", name: "BFS pathfinding", why: "Shortest route by number of edges" },
  { id: "dfs-pathfinding", name: "DFS pathfinding", why: "Any route, going deep first" },
  { id: "prims", name: "Prim's", why: "The cheapest tree that joins every node" },
  { id: "bfs", name: "BFS", why: "Visit a graph level by level" },
  { id: "dfs", name: "DFS", why: "Visit a graph one branch at a time" },
  { id: "cycle-detection", name: "Cycle detection", why: "Find loops in a graph" },
];

export { FOUR, nodesAt, edgesOf };
