/**
 * BFS Pathfinding Algorithm Adapter
 *
 * Finds the shortest path (by number of edges) between two nodes.
 * Uses BFS which guarantees the shortest path in an unweighted graph.
 */

import { BfsPathfindingIcon } from "../icons";
import {
  AlgorithmAdapter,
  AlgorithmInput,
  AlgorithmResult,
  AlgorithmType,
  AlgorithmGenerator,
  StepType,
  EdgeRef,
} from "../types";
import { Queue } from "../utils/dataStructures";

/**
 * Generator function for step-through BFS pathfinding.
 * Finds shortest path between start and end nodes.
 */
function* bfsPathfindingGenerator(input: AlgorithmInput): AlgorithmGenerator {
  const { adjacencyList, startNodeId, endNodeId } = input;

  // Validate end node
  if (endNodeId === undefined) {
    return;
  }

  // Handle same start and end
  if (startNodeId === endNodeId) {
    yield { type: StepType.VISIT, edge: { from: -1, to: startNodeId } };
    yield { type: StepType.RESULT, edge: { from: -1, to: startNodeId } };
    return;
  }

  const visited = new Set<number>();
  const parent = new Map<number, number>();
  const queue = new Queue<{ from: number; to: number }>();

  // Start with the initial node
  queue.push({ from: -1, to: startNodeId });

  let foundTarget = false;

  while (!queue.isEmpty()) {
    const current = queue.shift()!;
    const nodeId = current.to;

    if (visited.has(nodeId)) {
      continue;
    }

    // Mark as visited and record parent
    visited.add(nodeId);
    parent.set(nodeId, current.from);

    // Yield the visit step
    yield { type: StepType.VISIT, edge: { from: current.from, to: nodeId } };

    // Check if we found the target
    if (nodeId === endNodeId) {
      foundTarget = true;
      break;
    }

    // Get neighbors and add unvisited ones to queue
    const neighbors = adjacencyList.get(nodeId) || [];
    for (const edge of neighbors) {
      if (!visited.has(edge.to)) {
        queue.push({ from: nodeId, to: edge.to });
      }
    }
  }

  // Reconstruct and yield the path
  if (foundTarget) {
    const path: EdgeRef[] = [];
    let current = endNodeId;

    // Walk backwards from end to start
    while (current !== startNodeId) {
      const parentNode = parent.get(current);
      if (parentNode === undefined || parentNode === -1) break;
      path.unshift({ from: parentNode, to: current });
      current = parentNode;
    }

    // Add the start node
    path.unshift({ from: -1, to: startNodeId });

    // Yield path edges as result steps
    for (const edge of path) {
      yield { type: StepType.RESULT, edge };
    }
  }
}

const bfsPathfindingAdapter: AlgorithmAdapter = {
  metadata: {
    id: "bfs-pathfinding",
    name: "BFS Path",
    type: AlgorithmType.PATHFINDING,
    tagline: "Shortest path (unweighted)",
    icon: BfsPathfindingIcon,
    inputStepHints: ["Select the source node", "Now select the destination node"],
    failureMessage: "No path found between the selected nodes.",
  },

  /**
   * Generator for step-through mode.
   */
  generator: bfsPathfindingGenerator,

  /**
   * Synchronous execution using generator internally.
   */
  execute: (input: AlgorithmInput): AlgorithmResult => {
    // Validate end node
    if (input.endNodeId === undefined) {
      return { visitedEdges: [], error: "End node is required for pathfinding." };
    }

    const steps = [...bfsPathfindingGenerator(input)];
    const visitedEdges = steps
      .filter((s) => s.type === StepType.VISIT)
      .map((s) => s.edge);
    const resultEdges = steps
      .filter((s) => s.type === StepType.RESULT)
      .map((s) => s.edge);

    if (resultEdges.length === 0 && input.startNodeId !== input.endNodeId) {
      return {
        visitedEdges,
        error: "No path found between the selected nodes.",
      };
    }

    return { visitedEdges, resultEdges };
  },
};

export default bfsPathfindingAdapter;
