/**
 * Depth-First Search (DFS) Algorithm Adapter
 *
 * Traversal algorithm that explores the graph by going as deep as possible before backtracking.
 * For pathfinding, use dfs-pathfinding adapter instead.
 */

import { DfsIcon } from "../icons";
import { AlgorithmAdapter, AlgorithmInput, AlgorithmType } from "../types";
import { searchEvents } from "./search";

/** A node already waiting on the stack moves to the top when found again, so the stack holds each node once. */
const PSEUDOCODE = [
  "stack ← [ source ], visited ← { }",
  "while stack is not empty:",
  "    u ← stack.pop(), visited.add(u)",
  "    for each neighbor v, in reverse order:",
  "        if v is not visited:",
  "            push v, or move it to the top",
  "    if nothing u pushed waits: u is done",
];

const LINES = { start: 0, loop: 1, take: 2, check: 4, add: 5, finish: 6 };

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
};

export default dfsAdapter;
