/**
 * Depth-First Search (DFS) Algorithm Adapter
 *
 * Traversal algorithm that explores the graph by going as deep as possible before backtracking.
 * For pathfinding, use dfs-pathfinding adapter instead.
 */

import { DfsIcon } from "../icons";
import { AlgorithmAdapter, AlgorithmInput, AlgorithmResult, AlgorithmType } from "../types";
import { legacySearchSteps, searchEvents } from "./search";

const PSEUDOCODE = [
  "visited ← { }",
  "stack ← [ source ]",
  "while stack is not empty:",
  "    u ← stack.pop()",
  "    if u is visited: continue",
  "    visited.add(u)",
  "    for each neighbor v of u:",
  "        if v is not visited:",
  "            stack.push(v)",
];

const LINES = { start: 1, loop: 2, take: 3, check: 7, add: 8 };

/** Everything DFS does on this input, as events. */
const dfsEvents = (input: AlgorithmInput) => searchEvents(input, "stack", LINES);

const dfsAdapter: AlgorithmAdapter = {
  metadata: {
    id: "dfs",
    name: "DFS",
    type: AlgorithmType.TRAVERSAL,
    tagline: "Dive deep, then backtrack",
    icon: DfsIcon,
    inputStepHints: ["Select a node"],
  },

  pseudocode: PSEUDOCODE,
  events: dfsEvents,

  /**
   * Generator for step-through mode.
   */
  generator: (input) => legacySearchSteps(dfsEvents(input), "stack"),

  /**
   * Synchronous execution using generator internally.
   */
  execute: (input: AlgorithmInput): AlgorithmResult => ({
    steps: [...dfsAdapter.generator(input)],
  }),
};

export default dfsAdapter;
