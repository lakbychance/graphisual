/**
 * BFS Pathfinding Algorithm Adapter
 *
 * Finds the shortest path (by number of edges) between two nodes.
 * Uses BFS which guarantees the shortest path in an unweighted graph.
 */

import { BfsPathfindingIcon } from "../icons";
import { AlgorithmAdapter, AlgorithmInput, AlgorithmResult, AlgorithmType, StepType } from "../types";
import { legacySearchSteps, searchEvents } from "./search";

const PSEUDOCODE = [
  "parent[source] ← none",
  "queue ← [ source ]",
  "while queue is not empty:",
  "    u ← queue.dequeue()",
  "    if u = target: stop",
  "    for each neighbor v of u:",
  "        if v has no parent:",
  "            parent[v] ← u",
  "            queue.enqueue(v)",
  "walk parent[] back from target",
];

const LINES = { start: 1, loop: 2, take: 3, stop: 4, check: 6, add: 8, walk: 9 };

/** Everything BFS pathfinding does on this input, as events. Empty when there is no destination. */
const bfsPathfindingEvents = (input: AlgorithmInput) =>
  input.endNodeId === undefined ? [] : searchEvents(input, "queue", LINES, input.endNodeId);

const bfsPathfindingAdapter: AlgorithmAdapter = {
  metadata: {
    id: "bfs-pathfinding",
    name: "BFS Path",
    type: AlgorithmType.PATHFINDING,
    tagline: "Shortest path (unweighted)",
    icon: BfsPathfindingIcon,
    inputStepHints: ["Select the source node", "Now select the destination node"],
  },

  pseudocode: PSEUDOCODE,
  events: bfsPathfindingEvents,

  /**
   * Generator for step-through mode.
   */
  generator: (input) => legacySearchSteps(bfsPathfindingEvents(input), "queue"),

  /**
   * Synchronous execution using generator internally.
   */
  execute: (input: AlgorithmInput): AlgorithmResult => {
    // Validate end node
    if (input.endNodeId === undefined) {
      return { steps: [], error: "End node is required for pathfinding." };
    }

    const steps = [...bfsPathfindingAdapter.generator(input)];
    const foundPath = steps.some((s) => s.type === StepType.RESULT);

    if (!foundPath && input.startNodeId !== input.endNodeId) {
      return { steps, error: "No path found between the selected nodes." };
    }

    return { steps };
  },
};

export default bfsPathfindingAdapter;
