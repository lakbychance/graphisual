/**
 * Breadth-First Search (BFS) Algorithm Adapter
 *
 * Traversal algorithm that explores the graph level by level from start node.
 * For pathfinding, use bfs-pathfinding adapter instead.
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
 * Generator function for step-through BFS traversal.
 * Explores the graph level by level from the start node.
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

    // Mark as visited
    visited.add(nodeId);

    // Yield the visit step
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
    tagline: "Explore level by level",
    icon: BfsIcon,
    inputStepHints: ["Select a node"],
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
    };
  },
};

export default bfsAdapter;
