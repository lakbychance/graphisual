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

/**
 * A node already waiting on the stack moves to the top when found again, so the stack holds each
 * node once. Pushing is one event, so it points at the push; the parent is set in the same step.
 */
const PSEUDOCODE = [
  "stack ← [ source ], visited ← { }",
  "while stack is not empty:",
  "    u ← stack.pop(), visited.add(u)",
  "    if u = target: stop",
  "    for each neighbor v, last to first:",
  "        if v is not visited:",
  "            push v, or move it to the top",
  "            parent[v] ← u",
  "    u is done once all it pushed are done",
  "walk parent[] back from target",
];

const LINES = { start: 0, loop: 1, take: 2, stop: 3, check: 5, add: 6, finish: 8, walk: 9 };

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
