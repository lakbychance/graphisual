/**
 * Dijkstra's Shortest Path Algorithm Adapter
 *
 * Finds the shortest path between two nodes in a weighted graph.
 * Uses a greedy approach, always exploring the closest unvisited node.
 */

import { Route } from "lucide-react";
import {
  AlgorithmAdapter,
  AlgorithmInput,
  AlgorithmResult,
  AlgorithmType,
  AlgorithmGenerator,
  EdgeRef,
  StepType,
} from "../types";

/**
 * Generator function for step-through Dijkstra execution.
 * Yields visit steps during exploration, then result steps for the path.
 */
function* dijkstraGenerator(input: AlgorithmInput): AlgorithmGenerator {
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

  // Initialize data structures
  const distances = new Map<number, number>();
  const previous = new Map<number, number>();
  const unvisited = new Set<number>();

  // Initialize all nodes
  adjacencyList.forEach((_, nodeId) => {
    distances.set(nodeId, nodeId === startNodeId ? 0 : Infinity);
    unvisited.add(nodeId);
  });

  // Also ensure start and end nodes are in the set
  if (!distances.has(startNodeId)) {
    distances.set(startNodeId, 0);
    unvisited.add(startNodeId);
  }
  if (!distances.has(endNodeId)) {
    distances.set(endNodeId, Infinity);
    unvisited.add(endNodeId);
  }

  // Yield start node
  yield { type: StepType.VISIT, edge: { from: -1, to: startNodeId } };

  while (unvisited.size > 0) {
    // Find the unvisited node with minimum distance
    let currentNode: number | null = null;
    let minDistance = Infinity;

    unvisited.forEach((nodeId) => {
      const dist = distances.get(nodeId) ?? Infinity;
      if (dist < minDistance) {
        minDistance = dist;
        currentNode = nodeId;
      }
    });

    // No reachable nodes left
    if (currentNode === null || minDistance === Infinity) {
      return; // No path found
    }

    // Remove from unvisited
    unvisited.delete(currentNode);

    // Yield the edge that led to this node (for animation)
    if (currentNode !== startNodeId) {
      const prevNode = previous.get(currentNode);
      if (prevNode !== undefined) {
        yield { type: StepType.VISIT, edge: { from: prevNode, to: currentNode } };
      }
    }

    // Found the target - yield result path
    if (currentNode === endNodeId) {
      const resultEdges = reconstructPath(previous, startNodeId, endNodeId);
      for (const edge of resultEdges) {
        yield { type: StepType.RESULT, edge };
      }
      return;
    }

    // Update neighbors
    const neighbors = adjacencyList.get(currentNode) || [];
    for (const edge of neighbors) {
      if (unvisited.has(edge.to)) {
        const newDist = (distances.get(currentNode) ?? Infinity) + edge.weight;
        if (newDist < (distances.get(edge.to) ?? Infinity)) {
          distances.set(edge.to, newDist);
          previous.set(edge.to, currentNode);
        }
      }
    }
  }
  // End node not found - no result steps
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

  // Convert to edges
  path.push({ from: -1, to: startNodeId });
  for (let i = 0; i < nodeOrder.length - 1; i++) {
    path.push({ from: nodeOrder[i], to: nodeOrder[i + 1] });
  }

  return path;
}

const dijkstraAdapter: AlgorithmAdapter = {
  metadata: {
    id: "dijkstra",
    name: "Dijkstra's",
    type: AlgorithmType.PATHFINDING,
    description:
      "Select a starting node and ending node to visualize the shortest path.",
    tagline: "Find the shortest path",
    icon: Route,
    failureMessage: "Path is not possible for the given vertices.",
    requirements: {
      weighted: true,
    },
  },

  /**
   * Generator for step-through mode.
   */
  generator: dijkstraGenerator,

  /**
   * Synchronous execution using generator internally.
   */
  execute: (input: AlgorithmInput): AlgorithmResult => {
    // Validate end node
    if (input.endNodeId === undefined) {
      return { visitedEdges: [], error: "End node is required for pathfinding." };
    }

    const steps = [...dijkstraGenerator(input)];
    const visitedEdges = steps
      .filter((s) => s.type === StepType.VISIT)
      .map((s) => s.edge);
    const resultEdges = steps
      .filter((s) => s.type === StepType.RESULT)
      .map((s) => s.edge);

    if (resultEdges.length === 0 && input.startNodeId !== input.endNodeId) {
      return {
        visitedEdges,
        error: "Path is not possible for the given vertices.",
      };
    }

    return { visitedEdges, resultEdges };
  },
};

export default dijkstraAdapter;
