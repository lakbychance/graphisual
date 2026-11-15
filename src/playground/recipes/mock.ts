/** Mock graph + a precomputed BFS so the stage recipes have something real to drive. */

export interface MockNode { id: string; x: number; y: number; }
export interface MockEdge { from: string; to: string; weight: number; }

export const NODES: MockNode[] = [
  { id: "A", x: 70, y: 150 },
  { id: "B", x: 190, y: 70 },
  { id: "C", x: 190, y: 230 },
  { id: "D", x: 330, y: 70 },
  { id: "E", x: 330, y: 230 },
  { id: "F", x: 450, y: 150 },
];

export const EDGES: MockEdge[] = [
  { from: "A", to: "B", weight: 4 },
  { from: "A", to: "C", weight: 2 },
  { from: "B", to: "D", weight: 5 },
  { from: "B", to: "E", weight: 7 },
  { from: "C", to: "E", weight: 3 },
  { from: "D", to: "F", weight: 1 },
  { from: "E", to: "F", weight: 6 },
];

export interface BfsStep {
  message: string;
  current: string | null;
  queue: string[];
  visited: string[];
  justAdded: string[];
  traversedEdges: string[]; // "A-B"
}

function edgeKey(a: string, b: string) {
  return [a, b].sort().join("-");
}

export function computeBfs(start = "A"): BfsStep[] {
  const adj = new Map<string, string[]>();
  for (const n of NODES) adj.set(n.id, []);
  for (const e of EDGES) {
    adj.get(e.from)!.push(e.to);
    adj.get(e.to)!.push(e.from);
  }
  const steps: BfsStep[] = [];
  const visited = new Set<string>([start]);
  const queue = [start];
  const traversed: string[] = [];
  steps.push({
    message: `Start at **${start}**. Mark it visited and enqueue it.`,
    current: null,
    queue: [...queue],
    visited: [...visited],
    justAdded: [start],
    traversedEdges: [],
  });
  while (queue.length) {
    const cur = queue.shift()!;
    const added: string[] = [];
    for (const nb of adj.get(cur)!.sort()) {
      if (!visited.has(nb)) {
        visited.add(nb);
        queue.push(nb);
        added.push(nb);
        traversed.push(edgeKey(cur, nb));
      }
    }
    steps.push({
      message: added.length
        ? `Dequeue **${cur}**. Enqueue unvisited neighbours ${added.map((a) => `**${a}**`).join(", ")}.`
        : `Dequeue **${cur}**. All neighbours already visited.`,
      current: cur,
      queue: [...queue],
      visited: [...visited],
      justAdded: added,
      traversedEdges: [...traversed],
    });
  }
  steps.push({
    message: "Queue is empty. **BFS complete** — every reachable node was visited in order of distance.",
    current: null,
    queue: [],
    visited: [...visited],
    justAdded: [],
    traversedEdges: [...traversed],
  });
  return steps;
}

export const BFS_STEPS = computeBfs();

export const SPEEDS = ["0.5x", "1x", "2x", "4x"] as const;

export const SHORTCUT_GROUPS = [
  {
    title: "General",
    shortcuts: [
      { keys: ["⌘", "Z"], description: "Undo" },
      { keys: ["⌘", "⇧", "Z"], description: "Redo" },
      { keys: ["⌘", "+ / −"], description: "Zoom in / out" },
      { keys: ["⇧", "Drag"], description: "Select multiple nodes" },
    ],
  },
  {
    title: "When node selected",
    shortcuts: [
      { keys: ["↑ ↓ ← →"], description: "Navigate to nearby node" },
      { keys: ["E"], description: "Cycle through edges" },
      { keys: ["Enter"], description: "Edit label / focused edge" },
      { keys: ["Delete"], description: "Delete node" },
    ],
  },
  {
    title: "Step mode",
    shortcuts: [
      { keys: ["← →"], description: "Previous / next step" },
      { keys: ["Space"], description: "Play / pause" },
      { keys: ["Home", "End"], description: "Jump to start / end" },
    ],
  },
];

export interface TemplateDef { id: string; name: string; description: string; nodes: [number, number][]; edges: [number, number][]; }

/** Tiny 24×24 glyph graphs for the template tiles. */
export const TEMPLATES: TemplateDef[] = [
  { id: "path", name: "Path", description: "Linear chain", nodes: [[4, 12], [12, 12], [20, 12]], edges: [[0, 1], [1, 2]] },
  { id: "cycle", name: "Cycle", description: "Circular loop", nodes: [[12, 4], [19, 9], [17, 18], [7, 18], [5, 9]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]] },
  { id: "complete", name: "Complete", description: "Fully connected", nodes: [[12, 4], [4, 12], [20, 12], [8, 20], [16, 20]], edges: [[0, 1], [0, 2], [0, 3], [0, 4], [1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]] },
  { id: "star", name: "Star", description: "Central hub", nodes: [[12, 12], [12, 3], [20, 9], [17, 20], [7, 20], [4, 9]], edges: [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5]] },
  { id: "tree", name: "Tree", description: "Binary tree", nodes: [[12, 4], [6, 12], [18, 12], [3, 20], [9, 20], [15, 20], [21, 20]], edges: [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]] },
  { id: "grid", name: "Grid", description: "2D lattice", nodes: [[4, 4], [12, 4], [20, 4], [4, 12], [12, 12], [20, 12], [4, 20], [12, 20], [20, 20]], edges: [[0, 1], [1, 2], [3, 4], [4, 5], [6, 7], [7, 8], [0, 3], [3, 6], [1, 4], [4, 7], [2, 5], [5, 8]] },
];
