import type { LiveConfig } from "./types";
import {
  COMPACT, edgesOf, FOUR, negativeEdge, nodesAt, PLAIN_EDGES, ROUTE_TABLE, TRAVERSAL_TABLE, twoOrders, WEIGHTED_EDGES,
} from "./shared";

export const dijkstra: LiveConfig = {
  algorithmId: "dijkstra",
  kind: "route",
  weighted: true,
  headline: ["Dijkstra's algorithm", "visualizer"],
  edges: WEIGHTED_EDGES,
  ledger: "distance",
  steps: { ready: [0, 1], explore: [2, 3, 4], found: [2, 5], answer: [5] },
  specs: [
    { label: "Time", value: "O((V + E) log V)", note: "with a binary heap" },
    { label: "Space", value: "O(V)", note: "distances and queue" },
    { label: "Graph", value: "Weighted", note: "no negative edges" },
    { label: "Structure", value: "Priority queue", note: "smallest distance first" },
  ],
  limits: {
    heading: "What it costs, and where it fails",
    here: "Dijkstra's",
    table: ROUTE_TABLE,
    experiment: negativeEdge(
      [{ name: "Dijkstra's", algorithmId: "dijkstra" }, { name: "Bellman-Ford", algorithmId: "bellman-ford" }],
      "Dijkstra's settles a node once and never revisits it. Make one edge negative and that shortcut fails: B is settled before the cheaper way in through C has been seen.",
    ),
  },
};

export const bellmanFord: LiveConfig = {
  algorithmId: "bellman-ford",
  kind: "route",
  weighted: true,
  headline: ["Bellman-Ford algorithm", "visualizer"],
  edges: WEIGHTED_EDGES,
  ledger: "distance",
  steps: { ready: [0], explore: [1, 2], found: [1, 2], answer: [3] },
  specs: [
    { label: "Time", value: "O(V · E)", note: "every edge, V − 1 times" },
    { label: "Space", value: "O(V)", note: "one distance per node" },
    { label: "Graph", value: "Weighted", note: "negative edges allowed" },
    { label: "Structure", value: "Distance table", note: "relaxed until it settles" },
  ],
  limits: {
    heading: "What it costs, and what that buys",
    here: "Bellman-Ford",
    table: ROUTE_TABLE,
    experiment: {
      ...negativeEdge(
        [{ name: "Bellman-Ford", algorithmId: "bellman-ford" }, { name: "Dijkstra's", algorithmId: "dijkstra" }],
        "Bellman-Ford never treats a distance as final. It keeps relaxing every edge, so a negative edge found late still corrects what came before. Dijkstra's is faster, and gets this graph wrong.",
      ),
      title: "See what the extra work buys",
    },
  },
};

export const bfs: LiveConfig = {
  algorithmId: "bfs",
  kind: "traversal",
  weighted: false,
  headline: ["BFS", "visualizer"],
  edges: PLAIN_EDGES,
  ledger: "order",
  steps: { ready: [0, 1], explore: [2, 3, 4], found: [2, 3, 4], answer: [5] },
  specs: [
    { label: "Time", value: "O(V + E)", note: "every node and edge once" },
    { label: "Space", value: "O(V)", note: "the queue" },
    { label: "Graph", value: "Any", note: "edge weights are ignored" },
    { label: "Structure", value: "Queue", note: "first in, first out" },
  ],
  limits: {
    heading: "What it costs, and how it differs from DFS",
    here: "BFS",
    table: TRAVERSAL_TABLE,
    experiment: twoOrders([{ name: "BFS", algorithmId: "bfs" }, { name: "DFS", algorithmId: "dfs" }]),
  },
};

export const dfs: LiveConfig = {
  algorithmId: "dfs",
  kind: "traversal",
  weighted: false,
  headline: ["DFS", "visualizer"],
  edges: PLAIN_EDGES,
  ledger: "order",
  steps: { ready: [0, 1], explore: [2, 3], found: [2, 3], answer: [5] },
  specs: [
    { label: "Time", value: "O(V + E)", note: "every node and edge once" },
    { label: "Space", value: "O(V)", note: "the stack" },
    { label: "Graph", value: "Any", note: "edge weights are ignored" },
    { label: "Structure", value: "Stack", note: "last in, first out" },
  ],
  limits: {
    heading: "What it costs, and how it differs from BFS",
    here: "DFS",
    table: TRAVERSAL_TABLE,
    experiment: twoOrders([{ name: "DFS", algorithmId: "dfs" }, { name: "BFS", algorithmId: "bfs" }]),
  },
};

export const bfsPathfinding: LiveConfig = {
  algorithmId: "bfs-pathfinding",
  kind: "route",
  weighted: false,
  headline: ["BFS pathfinding", "visualizer"],
  edges: PLAIN_EDGES,
  ledger: "order",
  steps: { ready: [0, 1], explore: [2, 3, 4], found: [2], answer: [2] },
  specs: [
    { label: "Time", value: "O(V + E)", note: "stops early at the target" },
    { label: "Space", value: "O(V)", note: "queue and parents" },
    { label: "Graph", value: "Unweighted", note: "it counts edges, not weights" },
    { label: "Structure", value: "Queue", note: "first in, first out" },
  ],
  limits: {
    heading: "What it costs, and where it fails",
    here: "BFS pathfinding",
    table: ROUTE_TABLE,
    experiment: {
      title: "Break it yourself",
      text: "BFS finds the route with the fewest edges. That is the shortest route only while every edge costs the same. Give the edges weights and it still counts edges, so a cheaper route with more hops is missed.",
      toggle: "The edges have weights",
      initial: true,
      weighted: (on) => on,
      runs: [{ name: "BFS pathfinding", algorithmId: "bfs-pathfinding" }, { name: "Dijkstra's", algorithmId: "dijkstra" }],
      graph: (on) => ({ start: 0, end: 5, nodes: nodesAt(COMPACT), edges: edgesOf(on ? WEIGHTED_EDGES : PLAIN_EDGES) }),
    },
  },
};

export const dfsPathfinding: LiveConfig = {
  algorithmId: "dfs-pathfinding",
  kind: "route",
  weighted: false,
  headline: ["DFS pathfinding", "visualizer"],
  edges: PLAIN_EDGES,
  ledger: "order",
  steps: { ready: [0], explore: [2], found: [1], answer: [3] },
  specs: [
    { label: "Time", value: "O(V + E)", note: "stops early at the target" },
    { label: "Space", value: "O(V)", note: "the current branch" },
    { label: "Graph", value: "Any", note: "edge weights are ignored" },
    { label: "Structure", value: "Stack", note: "last in, first out" },
  ],
  limits: {
    heading: "What it costs, and where it fails",
    here: "DFS pathfinding",
    table: ROUTE_TABLE,
    experiment: {
      title: "Break it yourself",
      text: "DFS commits to the first branch it tries and returns the first route that reaches the target. Join E to D and a two-edge route opens up through E. DFS still returns the three-edge route through B and C, because B was the first branch it tried.",
      toggle: "An edge joins E and D",
      initial: true,
      weighted: () => false,
      measure: "edges",
      runs: [{ name: "DFS pathfinding", algorithmId: "dfs-pathfinding" }, { name: "BFS pathfinding", algorithmId: "bfs-pathfinding" }],
      graph: (on) => ({
        start: 0, end: 3, nodes: nodesAt([[70, 150], [190, 60], [350, 60], [470, 150], [270, 240]]),
        edges: edgesOf(on ? [[0, 1, 1], [1, 2, 1], [2, 3, 1], [0, 4, 1], [4, 3, 1]] : [[0, 1, 1], [1, 2, 1], [2, 3, 1], [0, 4, 1]]),
      }),
    },
  },
};

export const prims: LiveConfig = {
  algorithmId: "prims",
  kind: "tree",
  weighted: true,
  headline: ["Prim's algorithm", "visualizer"],
  edges: WEIGHTED_EDGES,
  ledger: "order",
  steps: { ready: [0, 1], explore: [2, 3, 4], found: [2, 3, 4], answer: [5] },
  specs: [
    { label: "Time", value: "O((V + E) log V)", note: "with a binary heap" },
    { label: "Space", value: "O(V)", note: "the tree and queue" },
    { label: "Graph", value: "Weighted, undirected", note: "must be connected" },
    { label: "Structure", value: "Priority queue", note: "cheapest edge first" },
  ],
  limits: {
    heading: "What it costs, and where it fails",
    here: "Prim's",
    table: {
      title: "Prim's next to Kruskal's",
      columns: ["Algorithm", "How the tree grows", "Structure", "Time"],
      mono: 2,
      rows: [
        { name: "Prim's", cells: ["Outward from one start node", "Priority queue", "O((V + E) log V)"] },
        { name: "Kruskal's", cells: ["Cheapest edges anywhere, merging small trees", "Union-find", "O(E log E)"] },
      ],
    },
    experiment: {
      title: "Break it yourself",
      text: "Prim's grows one tree outward from its start node, so it can only join what that node can reach. Cut the graph in two and each start spans its own half. Joined up, both starts build a tree of the same total weight.",
      toggle: "The graph is cut in two",
      initial: true,
      weighted: () => true,
      runs: [{ name: "Starting at A", algorithmId: "prims" }, { name: "Starting at F", algorithmId: "prims", start: 5 }],
      graph: (on) => ({
        start: 0, nodes: nodesAt(COMPACT),
        edges: edgesOf(on ? WEIGHTED_EDGES.filter(([a, b]) => !(a === 1 && b === 3) && !(a === 2 && b === 4)) : WEIGHTED_EDGES),
      }),
    },
  },
};

export const cycleDetection: LiveConfig = {
  algorithmId: "cycle-detection",
  kind: "cycle",
  weighted: false,
  directed: true,
  headline: ["Cycle detection", "in graphs"],
  edges: [[0, 1, 1], [0, 2, 1], [1, 3, 1], [3, 4, 1], [4, 2, 1], [2, 1, 1], [3, 5, 1], [4, 5, 1]],
  ledger: "order",
  steps: { ready: [0], explore: [0, 1], found: [2], answer: [2] },
  specs: [
    { label: "Time", value: "O(V + E)", note: "one depth-first pass" },
    { label: "Space", value: "O(V)", note: "the recursion stack" },
    { label: "Graph", value: "Directed or undirected", note: "the check differs slightly" },
    { label: "Structure", value: "Recursion stack", note: "nodes still being explored" },
  ],
  limits: {
    heading: "What it costs, and what counts as a cycle",
    here: "Directed",
    table: {
      title: "The check depends on the graph",
      columns: ["Graph", "A cycle is", "Time"],
      mono: 1,
      rows: [
        { name: "Directed", cells: ["An edge back to a node that is still being explored", "O(V + E)"] },
        { name: "Undirected", cells: ["An edge to a visited node that is not the one you came from", "O(V + E)"] },
      ],
    },
    experiment: {
      title: "Make one, break one",
      text: "In a directed graph the direction of a single edge decides it. Pointing from C back to A closes a loop through B. Turn it around and the same four nodes have no cycle at all.",
      toggle: "The edge points from C back to A",
      initial: true,
      weighted: () => false,
      runs: [{ name: "Cycle detection", algorithmId: "cycle-detection" }],
      graph: (on) => ({
        start: 0, nodes: nodesAt(FOUR),
        edges: edgesOf([[0, 1, 1], [1, 2, 1], [1, 3, 1], on ? [2, 0, 1] : [0, 2, 1]], true),
      }),
    },
  },
};
