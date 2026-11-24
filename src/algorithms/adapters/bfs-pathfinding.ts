/**
 * BFS Pathfinding Algorithm Adapter
 *
 * Finds the shortest path (by number of edges) between two nodes.
 * Uses BFS which guarantees the shortest path in an unweighted graph.
 */

import { BfsPathfindingIcon } from "../icons";
import { AlgorithmAdapter, AlgorithmInput, AlgorithmType } from "../types";
import { searchEvents } from "./search";
import { noRoute } from "./refusals";

const PSEUDOCODE = [
  "queue ← [ source ], visited ← { source }",
  "while queue is not empty:",
  "    u ← queue.dequeue()",
  "    if u = target: stop",
  "    for each neighbor v of u:",
  "        if v is not visited:",
  "            visited.add(v), queue.add(v)",
  "            parent[v] ← u",
  "walk parent[] back from target",
];

/** Adding a node is one event, so it points at the line that adds it; the parent is set in the same step. */
const LINES = { start: 0, loop: 1, take: 2, stop: 3, check: 5, add: 6, walk: 8 };

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

  refusal: noRoute("No path found between the selected nodes."),
};

export default bfsPathfindingAdapter;
