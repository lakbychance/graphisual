/**
 * Bellman-Ford Algorithm Adapter
 *
 * Finds the shortest path from a source to all vertices.
 * Unlike Dijkstra, it can handle negative edge weights.
 * Also detects negative weight cycles.
 */

import { BellmanFordIcon } from "../icons";
import {
  AlgorithmAdapter,
  AlgorithmInput,
  AlgorithmResult,
  AlgorithmType,
  AlgorithmGenerator,
  EdgeRef,
  EdgeInfo,
  StepType,
} from "../types";

/**
 * Generator function for step-through Bellman-Ford execution.
 * Yields visit steps during relaxation, then result steps for the path.
 */
function* bellmanFordGenerator(input: AlgorithmInput): AlgorithmGenerator {
  const { adjacencyList, nodes, startNodeId, endNodeId } = input;

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
        dataStructure: { type: "distances", items: [{ id: startNodeId, value: 0 }] },
      },
    };
    yield { type: StepType.RESULT, edge: { from: -1, to: startNodeId } };
    return;
  }

  // Collect all edges from adjacency list
  const allEdges: EdgeInfo[] = [];
  adjacencyList.forEach((edges) => {
    for (const edge of edges) {
      allEdges.push(edge);
    }
  });

  // Initialize distances
  const distances = new Map<number, number>();
  const previous = new Map<number, number>();

  // Initialize all nodes to infinity, except start
  for (const node of nodes) {
    distances.set(node.id, node.id === startNodeId ? 0 : Infinity);
  }

  // Also ensure all nodes in adjacency list are initialized
  adjacencyList.forEach((_, nodeId) => {
    if (!distances.has(nodeId)) {
      distances.set(nodeId, nodeId === startNodeId ? 0 : Infinity);
    }
  });

  // Helper to count reachable nodes
  const getReachableCount = () => {
    return Array.from(distances.values()).filter((d) => d !== Infinity).length;
  };

  // Yield start node
  yield {
    type: StepType.VISIT,
    edge: { from: -1, to: startNodeId },
    narration: {
      message: `**Starting at node ${startNodeId}** (distance: 0). 1 node reachable.`,
      dataStructure: {
        type: "distances",
        items: [],
        processing: { id: startNodeId, value: 0 },
      },
    },
  };

  // Relax all edges V-1 times
  const V = Math.max(nodes.length, distances.size);
  for (let i = 0; i < V - 1; i++) {
    let updated = false;

    for (const edge of allEdges) {
      const distFrom = distances.get(edge.from) ?? Infinity;
      const distTo = distances.get(edge.to) ?? Infinity;
      const newDist = distFrom + edge.weight;

      if (distFrom !== Infinity && newDist < distTo) {
        const oldDist = distTo === Infinity ? "∞" : distTo;
        distances.set(edge.to, newDist);
        previous.set(edge.to, edge.from);
        updated = true;

        const reachableCount = getReachableCount();

        // Check if we found the target
        const isTarget = edge.to === endNodeId;
        const message = isTarget
          ? `Iteration ${i + 1}: **Found destination!** Relaxed **${edge.from}→${edge.to}**, d: **${oldDist}→${newDist}**\n**${reachableCount}** nodes reachable`
          : `Iteration ${i + 1}: Relaxed **${edge.from}→${edge.to}**, d: **${oldDist}→${newDist}**\n**${reachableCount}** nodes reachable`;

        // Yield the relaxation step
        yield {
          type: StepType.VISIT,
          edge: { from: edge.from, to: edge.to },
          narration: {
            message,
            dataStructure: {
              type: "distances",
              items: [],
              processing: { id: edge.to, value: newDist },
            },
          },
        };
      }
    }

    // Early termination if no updates
    if (!updated) break;
  }

  // Check for negative weight cycles (one more iteration)
  for (const edge of allEdges) {
    const distFrom = distances.get(edge.from) ?? Infinity;
    const distTo = distances.get(edge.to) ?? Infinity;

    if (distFrom !== Infinity && distFrom + edge.weight < distTo) {
      // Negative cycle detected - return without result path
      return;
    }
  }

  // Check if end node is reachable
  if (distances.get(endNodeId) === Infinity) {
    return; // No path found
  }

  // Reconstruct and yield result path
  const resultEdges = reconstructPath(previous, startNodeId, endNodeId);
  for (const edge of resultEdges) {
    yield { type: StepType.RESULT, edge };
  }
}

/**
 * Reconstruct the shortest path from start to end using the previous map.
 */
function reconstructPath(
  previous: Map<number, number>,
  startNodeId: number,
  endNodeId: number
): EdgeRef[] {
  const path: EdgeRef[] = [];
  let current: number | undefined = endNodeId;

  // Build path backwards
  const nodeOrder: number[] = [];
  while (current !== undefined) {
    nodeOrder.unshift(current);
    current = previous.get(current);
  }

  // Verify path starts from startNode
  if (nodeOrder.length === 0 || nodeOrder[0] !== startNodeId) {
    return [];
  }

  // Convert to edges
  path.push({ from: -1, to: startNodeId });
  for (let i = 0; i < nodeOrder.length - 1; i++) {
    path.push({ from: nodeOrder[i], to: nodeOrder[i + 1] });
  }

  return path;
}

const bellmanFordAdapter: AlgorithmAdapter = {
  metadata: {
    id: "bellman-ford",
    name: "Bellman-Ford",
    type: AlgorithmType.PATHFINDING,
    tagline: "Handle negative weights",
    icon: BellmanFordIcon,
    inputStepHints: ["Select the source node", "Now select the destination node"],
    failureMessage: "Path is not possible or negative cycle detected.",
    requirements: {
      weighted: true,
    },
  },

  /**
   * Generator for step-through mode.
   */
  generator: bellmanFordGenerator,

  /**
   * Synchronous execution using generator internally.
   */
  execute: (input: AlgorithmInput): AlgorithmResult => {
    // Validate end node
    if (input.endNodeId === undefined) {
      return { visitedEdges: [], error: "End node is required for pathfinding." };
    }

    const steps = [...bellmanFordGenerator(input)];
    const visitedEdges = steps
      .filter((s) => s.type === StepType.VISIT)
      .map((s) => s.edge);
    const resultEdges = steps
      .filter((s) => s.type === StepType.RESULT)
      .map((s) => s.edge);

    if (resultEdges.length === 0 && input.startNodeId !== input.endNodeId) {
      return {
        visitedEdges,
        error: "Path is not possible or negative cycle detected.",
      };
    }

    return { visitedEdges, resultEdges };
  },
};

export default bellmanFordAdapter;
