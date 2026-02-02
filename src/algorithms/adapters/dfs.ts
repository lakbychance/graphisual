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
import { Stack } from "../utils/dataStructures";

/**
 * Generator function for step-through DFS traversal.
 * Explores the graph by going as deep as possible before backtracking.
 */
function* dfsGenerator(input: AlgorithmInput): AlgorithmGenerator {
  const { adjacencyList, startNodeId } = input;
  const seen = new Set<number>(); // Tracks nodes added to stack (prevents duplicates)
  const stack = new Stack<{ from: number; to: number }>();

  // Start with the initial node (from: -1 indicates root)
  stack.push({ from: -1, to: startNodeId });
  seen.add(startNodeId);

  while (!stack.isEmpty()) {
    const current = stack.pop()!;
    const nodeId = current.to;

    // Get neighbors and add unseen ones to stack
    // Reverse to maintain expected order (leftmost first)
    const neighbors = adjacencyList.get(nodeId) || [];
    const addedToStack: number[] = [];
    for (let i = neighbors.length - 1; i >= 0; i--) {
      const edge = neighbors[i];
      if (!seen.has(edge.to)) {
        seen.add(edge.to);
        stack.push({ from: nodeId, to: edge.to });
        addedToStack.unshift(edge.to); // unshift to show in natural order
      }
    }

    // Build trace message
    let message = `**Visiting node ${nodeId}**`;
    if (addedToStack.length > 0) {
      message += `, pushed **${addedToStack.join(", ")}** to stack`;
    }

    // Yield the visit step with trace
    yield {
      type: StepType.VISIT,
      edge: { from: current.from, to: nodeId },
      trace: {
        message,
        dataStructure: {
          type: "stack",
          items: stack.getContents().map((item) => ({ id: item.to })),
          processing: { id: nodeId },
          justAdded: addedToStack.length > 0 ? addedToStack : undefined,
        },
      },
    };
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
