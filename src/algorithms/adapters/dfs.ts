/**
 * Depth-First Search (DFS) Algorithm Adapter
 *
 * Traversal algorithm that explores the graph by going as deep as possible before backtracking.
 * For pathfinding, use dfs-pathfinding adapter instead.
 */

import { DfsIcon } from "../icons";
import {
  AlgorithmAdapter,
  AlgorithmInput,
  AlgorithmResult,
  AlgorithmType,
  AlgorithmGenerator,
  StepType,
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
 * Generator function for step-through DFS traversal.
 * Explores the graph by going as deep as possible before backtracking.
 */
function* dfsGenerator(input: AlgorithmInput): AlgorithmGenerator {
  const { adjacencyList, startNodeId } = input;
  const visited = new Set<number>();
  const stack = new Stack<{ from: number; to: number }>();

  // Start with the initial node (from: -1 indicates root)
  stack.push({ from: -1, to: startNodeId });

  while (!stack.isEmpty()) {
    const current = stack.pop()!;
    const nodeId = current.to;

    if (visited.has(nodeId)) {
      continue;
    }

    // Mark as visited
    visited.add(nodeId);

    // Yield the visit step
    yield { type: StepType.VISIT, edge: { from: current.from, to: nodeId } };

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
}

const dfsAdapter: AlgorithmAdapter = {
  metadata: {
    id: "dfs",
    name: "DFS",
    type: AlgorithmType.TRAVERSAL,
    tagline: "Dive deep, then backtrack",
    icon: DfsIcon,
    inputStepHints: ["Select a node"],
  },

  /**
   * Generator for step-through mode.
   */
  generator: dfsGenerator,

  /**
   * Synchronous execution using generator internally.
   */
  execute: (input: AlgorithmInput): AlgorithmResult => {
    const steps = [...dfsGenerator(input)];
    return {
      visitedEdges: steps
        .filter((s) => s.type === StepType.VISIT)
        .map((s) => s.edge),
    };
  },
};

export default dfsAdapter;
