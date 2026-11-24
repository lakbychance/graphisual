/**
 * Breadth-First Search (BFS) Algorithm Adapter
 *
 * Traversal algorithm that explores the graph level by level from start node.
 * For pathfinding, use bfs-pathfinding adapter instead.
 */

import { BfsIcon } from "../icons";
import { AlgorithmAdapter, AlgorithmInput, AlgorithmResult, AlgorithmType } from "../types";
import { legacySearchSteps, searchEvents } from "./search";

const PSEUDOCODE = [
  "visited ← { source }",
  "queue ← [ source ]",
  "while queue is not empty:",
  "    u ← queue.dequeue()",
  "    for each neighbor v of u:",
  "        if v is not visited:",
  "            visited.add(v)",
  "            queue.enqueue(v)",
];

const LINES = { start: 1, loop: 2, take: 3, check: 5, add: 7 };

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

  /**
   * Generator for step-through mode.
   * Yields one step at a time for manual stepping.
   */
  generator: (input) => legacySearchSteps(bfsEvents(input), "queue"),

  /**
   * Synchronous execution that returns all results at once.
   * Uses the generator internally to ensure consistency.
   */
  execute: (input: AlgorithmInput): AlgorithmResult => ({
    steps: [...bfsAdapter.generator(input)],
  }),
};

export default bfsAdapter;
