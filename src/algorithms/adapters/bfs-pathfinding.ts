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
    yield {
      type: StepType.VISIT,
      edge: { from: -1, to: startNodeId },
      narration: {
        message: `**Start and destination are the same** (node ${startNodeId})`,
        dataStructure: { type: "queue", items: [], processing: { id: startNodeId } },
      },
    };
    yield { type: StepType.RESULT, edge: { from: -1, to: startNodeId } };
    return;
  }

  const seen = new Set<number>(); // Tracks nodes added to queue (prevents duplicates)
  const parent = new Map<number, number>();
  const queue = new Queue<{ from: number; to: number }>();

  // Start with the initial node
  queue.push({ from: -1, to: startNodeId });
  seen.add(startNodeId);

  let foundTarget = false;

  while (!queue.isEmpty()) {
    const current = queue.shift()!;
    const nodeId = current.to;

    // Record parent for path reconstruction
    parent.set(nodeId, current.from);

    // Check if we found the target
    if (nodeId === endNodeId) {
      foundTarget = true;
      // Yield the visit step with found message
      yield {
        type: StepType.VISIT,
        edge: { from: current.from, to: nodeId },
        narration: {
          message: `**Found destination node ${nodeId}!**`,
          dataStructure: {
            type: "queue",
            items: queue.getContents().map((item) => ({ id: item.to })),
            processing: { id: nodeId },
          },
        },
      };
      break;
    }

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

    // Build narration message
    let message = `**Visiting node ${nodeId}**`;
    if (addedToQueue.length > 0) {
      message += `, added **${addedToQueue.join(", ")}** to queue`;
    }

    // Yield the visit step with narration
    yield {
      type: StepType.VISIT,
      edge: { from: current.from, to: nodeId },
      narration: {
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
