/**
 * Breadth-First Search (BFS) Algorithm Adapter
 *
 * Traversal algorithm that explores the graph level by level from start node.
 * For pathfinding, use bfs-pathfinding adapter instead.
 */

import { BfsIcon } from "../icons";
import { AlgorithmAdapter, AlgorithmInput, AlgorithmType } from "../types";
import { searchEvents } from "./search";

const PSEUDOCODE = [
  "queue ← [ source ], visited ← { source }",
  "while queue is not empty:",
  "    u ← queue.dequeue()",
  "    for each neighbor v of u:",
  "        if v is not visited:",
  "            visited.add(v), queue.add(v)",
];

const LINES = { start: 0, loop: 1, take: 2, check: 4, add: 5 };

/** Everything BFS does on this input, as events. */
const bfsEvents = (input: AlgorithmInput) => searchEvents(input, "queue", LINES);

const bfsAdapter: AlgorithmAdapter = {
  metadata: {
    id: "bfs",
    name: "BFS",
    type: AlgorithmType.TRAVERSAL,
    tagline: "Explore level by level",
    icon: BfsIcon,
    inputStepHints: ["Select a node"],
  },

  pseudocode: PSEUDOCODE,
  events: bfsEvents,
};

export default bfsAdapter;
