/**
 * Breadth-First Search (BFS) Algorithm Adapter
 *
 * Explores the graph level by level, visiting all neighbors
 * of a node before moving to the next level.
 */

import { BfsIcon } from "../icons";
import {
  AlgorithmAdapter,
  AlgorithmInput,
  AlgorithmResult,
  AlgorithmType,
  AlgorithmGenerator,
  StepType,
} from "../types";

/**
 * Simple Queue implementation for BFS.
 */
class Queue<T> {
  private items: T[] = [];

  push(item: T): void {
    this.items.push(item);
  }

  shift(): T | undefined {
    return this.items.shift();
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

/**
 * Generator function for step-through BFS execution.
 * Yields each step as the algorithm progresses.
 */
function* bfsGenerator(input: AlgorithmInput): AlgorithmGenerator {
  const { adjacencyList, startNodeId } = input;
  const visited = new Set<number>();
  const queue = new Queue<{ from: number; to: number }>();

  // Start with the initial node (from: -1 indicates root)
  queue.push({ from: -1, to: startNodeId });

  while (!queue.isEmpty()) {
    const current = queue.shift()!;
    const nodeId = current.to;

    if (visited.has(nodeId)) {
      continue;
    }

    // Mark as visited and yield the step
    visited.add(nodeId);
    yield { type: StepType.VISIT, edge: { from: current.from, to: nodeId } };

    // Get neighbors and add unvisited ones to queue
    const neighbors = adjacencyList.get(nodeId) || [];
    for (const edge of neighbors) {
      if (!visited.has(edge.to)) {
        queue.push({ from: nodeId, to: edge.to });
      }
    }
  }
}

const bfsAdapter: AlgorithmAdapter = {
  metadata: {
    id: "bfs",
    name: "BFS",
    type: AlgorithmType.TRAVERSAL,
    description: "Click on any node to begin the traversal.",
    tagline: "Explore level by level",
    icon: BfsIcon,
  },

  /**
   * Generator for step-through mode.
   * Yields one step at a time for manual stepping.
   */
  generator: bfsGenerator,

  /**
   * Synchronous execution that returns all results at once.
   * Uses the generator internally to ensure consistency.
   */
  execute: (input: AlgorithmInput): AlgorithmResult => {
    const steps = [...bfsGenerator(input)];
    return {
      visitedEdges: steps
        .filter((s) => s.type === StepType.VISIT)
        .map((s) => s.edge),
      resultEdges: steps
        .filter((s) => s.type === StepType.RESULT)
        .map((s) => s.edge),
    };
  },
};

export default bfsAdapter;
