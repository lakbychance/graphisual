/**
 * Floyd-Warshall All-Pairs Shortest Path Algorithm Adapter
 *
 * Computes shortest paths between ALL pairs of nodes using dynamic programming.
 * O(V³) time complexity. Works with negative edge weights (but not negative cycles).
 *
 * Visualization: User selects one source node, sees shortest paths to all reachable nodes.
 */

import { Grid3X3 } from "lucide-react";
import {
  AlgorithmAdapter,
  AlgorithmInput,
  AlgorithmResult,
  AlgorithmType,
  AlgorithmGenerator,
} from "../types";

/**
 * Generator function for step-through Floyd-Warshall execution.
 * Yields visit steps for edges, then result steps for shortest paths.
 */
function* floydWarshallGenerator(input: AlgorithmInput): AlgorithmGenerator {
  const { adjacencyList, nodes, startNodeId } = input;

  // Get all node IDs
  const nodeIds = nodes.map((n) => n.id);
  const n = nodeIds.length;

  if (n === 0) {
    return;
  }

  // Create index mapping for matrix access
  const nodeToIndex = new Map<number, number>();
  const indexToNode = new Map<number, number>();
  nodeIds.forEach((id, idx) => {
    nodeToIndex.set(id, idx);
    indexToNode.set(idx, id);
  });

  // Initialize distance matrix with Infinity
  const dist: number[][] = Array(n)
    .fill(null)
    .map(() => Array(n).fill(Infinity));

  // Initialize next matrix for path reconstruction
  const next: (number | null)[][] = Array(n)
    .fill(null)
    .map(() => Array(n).fill(null));

  // Distance from node to itself is 0
  for (let i = 0; i < n; i++) {
    dist[i][i] = 0;
  }

  // Yield start node first
  yield { type: 'visit', edge: { from: -1, to: startNodeId } };

  // Initialize with direct edges and yield them for visualization
  adjacencyList.forEach((edges, fromId) => {
    const i = nodeToIndex.get(fromId);
    if (i === undefined) return;

    edges.forEach((edge) => {
      const j = nodeToIndex.get(edge.to);
      if (j === undefined) return;

      const weight = edge.weight ?? 1;
      if (weight < dist[i][j]) {
        dist[i][j] = weight;
        next[i][j] = j;
      }
    });
  });

  // Yield all edges for visualization
  for (const [fromId, edges] of adjacencyList) {
    for (const edge of edges) {
      yield { type: 'visit', edge: { from: fromId, to: edge.to } };
    }
  }

  // Floyd-Warshall main algorithm
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (dist[i][k] !== Infinity && dist[k][j] !== Infinity) {
          const newDist = dist[i][k] + dist[k][j];
          if (newDist < dist[i][j]) {
            dist[i][j] = newDist;
            next[i][j] = next[i][k];
          }
        }
      }
    }
  }

  // Extract shortest paths from startNodeId to all other nodes
  const startIdx = nodeToIndex.get(startNodeId);
  if (startIdx === undefined) {
    return;
  }

  const addedEdges = new Set<string>(); // To avoid duplicate edges

  // Yield start node as result
  yield { type: 'result', edge: { from: -1, to: startNodeId } };

  // For each reachable node, reconstruct the path and yield unique edges
  for (let j = 0; j < n; j++) {
    if (j === startIdx) continue;
    if (dist[startIdx][j] === Infinity) continue; // Not reachable

    // Reconstruct path from startIdx to j
    let current = startIdx;
    while (current !== j && next[current][j] !== null) {
      const nextNode = next[current][j]!;
      const fromNode = indexToNode.get(current)!;
      const toNode = indexToNode.get(nextNode)!;
      const edgeKey = `${fromNode}-${toNode}`;

      if (!addedEdges.has(edgeKey)) {
        addedEdges.add(edgeKey);
        yield { type: 'result', edge: { from: fromNode, to: toNode } };
      }

      current = nextNode;
    }
  }
}

const floydWarshallAdapter: AlgorithmAdapter = {
  metadata: {
    id: "floyd-warshall",
    name: "Floyd-Warshall",
    type: AlgorithmType.TRAVERSAL,
    description: "Click on a node to see shortest paths to all other nodes.",
    tagline: "All-pairs shortest paths",
    icon: Grid3X3,
    failureMessage: "No paths found from the selected node.",
    requirements: {
      weighted: true,
    },
  },

  /**
   * Generator for step-through mode.
   */
  generator: floydWarshallGenerator,

  /**
   * Synchronous execution using generator internally.
   */
  execute: (input: AlgorithmInput): AlgorithmResult => {
    if (input.nodes.length === 0) {
      return { visitedEdges: [], error: "No nodes in the graph." };
    }

    const steps = [...floydWarshallGenerator(input)];
    const visitedEdges = steps
      .filter((s) => s.type === 'visit')
      .map((s) => s.edge);
    const resultEdges = steps
      .filter((s) => s.type === 'result')
      .map((s) => s.edge);

    if (resultEdges.length <= 1) {
      return { visitedEdges, error: "No paths found from the selected node." };
    }

    return { visitedEdges, resultEdges };
  },
};

export default floydWarshallAdapter;
