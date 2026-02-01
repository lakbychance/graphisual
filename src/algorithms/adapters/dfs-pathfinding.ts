/**
 * DFS Pathfinding Algorithm Adapter
 *
 * Finds a path between two nodes using depth-first search.
 * Note: DFS does NOT guarantee the shortest path.
 */

import { DfsPathfindingIcon } from "../icons";
import {
  AlgorithmAdapter,
  AlgorithmInput,
  AlgorithmResult,
  AlgorithmType,
  AlgorithmGenerator,
  StepType,
  EdgeRef,
} from "../types";

/**
 * Simple Stack implementation for DFS.
 */
class Stack<T> {
  private items: T[] = [];

  push(item: T): void {
    this.items.push(item);
  }

  pop(): T | undefined {
    return this.items.pop();
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

/**
 * Generator function for step-through DFS pathfinding.
 * Finds a path between start and end nodes (not necessarily shortest).
 */
function* dfsPathfindingGenerator(input: AlgorithmInput): AlgorithmGenerator {
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
  const stack = new Stack<{ from: number; to: number }>();

  // Start with the initial node
  stack.push({ from: -1, to: startNodeId });

  let foundTarget = false;

  while (!stack.isEmpty()) {
    const current = stack.pop()!;
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

    // Get neighbors and add unvisited ones to stack
    // Reverse to maintain expected order (leftmost first)
    const neighbors = adjacencyList.get(nodeId) || [];
    for (let i = neighbors.length - 1; i >= 0; i--) {
      const edge = neighbors[i];
      if (!visited.has(edge.to)) {
        stack.push({ from: nodeId, to: edge.to });
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

const dfsPathfindingAdapter: AlgorithmAdapter = {
  metadata: {
    id: "dfs-pathfinding",
    name: "DFS Path",
    type: AlgorithmType.PATHFINDING,
    tagline: "Find a path",
    icon: DfsPathfindingIcon,
    inputStepHints: ["Select the source node", "Now select the destination node"],
    failureMessage: "No path found between the selected nodes.",
  },

  /**
   * Generator for step-through mode.
   */
  generator: dfsPathfindingGenerator,

  /**
   * Synchronous execution using generator internally.
   */
  execute: (input: AlgorithmInput): AlgorithmResult => {
    // Validate end node
    if (input.endNodeId === undefined) {
      return { visitedEdges: [], error: "End node is required for pathfinding." };
    }

    const steps = [...dfsPathfindingGenerator(input)];
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

export default dfsPathfindingAdapter;
