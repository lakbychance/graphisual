/**
 * Breadth-First Search (BFS) Algorithm Adapter
 *
 * Traversal algorithm that explores the graph level by level from start node.
 * For pathfinding, use bfs-pathfinding adapter instead.
 */

import { BfsIcon } from "../icons";
import { nid } from "../traceHelpers";
import {
  AlgorithmAdapter,
  AlgorithmInput,
  AlgorithmResult,
  AlgorithmType,
  AlgorithmGenerator,
  StepType,
} from "../types";
import { Queue } from "../utils/dataStructures";

/**
 * Generator function for step-through BFS traversal.
 * Explores the graph level by level from the start node.
 */
function* bfsGenerator(input: AlgorithmInput): AlgorithmGenerator {
  const { adjacencyList, startNodeId } = input;
  const seen = new Set<number>(); // Tracks nodes added to queue (prevents duplicates)
  const queue = new Queue<{ from: number; to: number }>();

  // Start with the initial node (from: -1 indicates root)
  queue.push({ from: -1, to: startNodeId });
  seen.add(startNodeId);

  while (!queue.isEmpty()) {
    const current = queue.shift()!;
    const nodeId = current.to;

    // Get neighbors and add unseen ones to queue
    const neighbors = adjacencyList.get(nodeId) || [];
    const addedToQueue: number[] = [];
    for (const edge of neighbors) {
      if (!seen.has(edge.to)) {
        seen.add(edge.to);
        queue.push({ from: nodeId, to: edge.to });
        addedToQueue.push(edge.to);
      }
    }

    // Build trace message
    let message = `**Visiting node ${nid(nodeId)}**`;
    if (addedToQueue.length > 0) {
      message += `, added **${addedToQueue.map(nid).join(", ")}** to queue`;
    }

    // Yield the visit step with trace
    yield {
      type: StepType.VISIT,
      edge: { from: current.from, to: nodeId },
      trace: {
        message,
        dataStructure: {
          type: "queue",
          items: queue.getContents().map((item) => ({ id: item.to })),
          processing: { id: nodeId },
          justAdded: addedToQueue.length > 0 ? addedToQueue : undefined,
        },
      },
    };
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
