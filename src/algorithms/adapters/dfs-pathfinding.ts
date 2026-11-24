/**
 * DFS Pathfinding Algorithm Adapter
 *
 * Finds a path between two nodes using depth-first search.
 * Note: DFS does NOT guarantee the shortest path.
 */

import { DfsPathfindingIcon } from "../icons";
import { AlgorithmAdapter, AlgorithmInput, AlgorithmType } from "../types";
import { searchEvents } from "./search";
import { noRoute } from "./refusals";

const PSEUDOCODE = [
  "search(u):",
  "    visited.add(u)",
  "    if u = target: return found",
  "    for each neighbor v of u:",
  "        if v is not visited:",
  "            if search(v) = found:",
  "                path.prepend(v)",
  "                return found",
  "    return not found",
  "search(source)",
];

const LINES = { start: 9, loop: 8, take: 1, stop: 2, check: 4, add: 5, walk: 6, finish: 8 };

/** Everything DFS pathfinding does on this input, as events. Empty when there is no destination. */
const dfsPathfindingEvents = (input: AlgorithmInput) =>
  input.endNodeId === undefined ? [] : searchEvents(input, "stack", LINES, input.endNodeId);

const dfsPathfindingAdapter: AlgorithmAdapter = {
  metadata: {
    id: "dfs-pathfinding",
    name: "DFS Path",
    type: AlgorithmType.PATHFINDING,
    tagline: "Find a path",
    icon: DfsPathfindingIcon,
    inputStepHints: ["Select the source node", "Now select the destination node"],
  },

  pseudocode: PSEUDOCODE,
  events: dfsPathfindingEvents,

  refusal: noRoute("No path found between the selected nodes."),
};

export default dfsPathfindingAdapter;
