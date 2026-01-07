/**
 * Prim's Minimum Spanning Tree Algorithm Adapter
 *
 * Finds a minimum spanning tree for a weighted undirected graph.
 * Starts from a node and greedily adds the minimum weight edge
 * that connects the tree to a new vertex.
 */

import { Network } from "lucide-react";
import {
  AlgorithmAdapter,
  AlgorithmInput,
  AlgorithmResult,
  AlgorithmType,
  AlgorithmGenerator,
} from "../types";

/**
 * Generator function for step-through Prim's execution.
 * Yields visit steps as MST edges are added.
 */
function* primsGenerator(input: AlgorithmInput): AlgorithmGenerator {
  const { adjacencyList, nodes, startNodeId } = input;

  // Check if graph has any directed edges
  let hasDirectedEdge = false;
  adjacencyList.forEach((edges) => {
    edges?.forEach((edge) => {
      if (edge.type === "directed") {
        hasDirectedEdge = true;
      }
    });
  });

  if (hasDirectedEdge) {
    return; // Cannot process directed graph
  }

  // Initialize data structures
  const mstSet = new Set<number>(); // Nodes included in MST
  const key = new Map<number, number>(); // Minimum weight to reach each node
  const parent = new Map<number, number>(); // Parent in MST

  // Initialize all keys to infinity
  adjacencyList.forEach((_, nodeId) => {
    key.set(nodeId, Infinity);
  });

  // Start node has key 0
  key.set(startNodeId, 0);

  // Process all nodes
  for (let i = 0; i < nodes.length; i++) {
    // Find minimum key vertex not in MST
    let minKey = Infinity;
    let minNode: number | null = null;

    key.forEach((k, nodeId) => {
      if (!mstSet.has(nodeId) && k < minKey) {
        minKey = k;
        minNode = nodeId;
      }
    });

    // No more reachable nodes
    if (minNode === null) {
      break;
    }

    // Add to MST
    mstSet.add(minNode);

    // Yield the edge
    const parentNode = parent.get(minNode);
    yield {
      type: 'visit',
      edge: {
        from: parentNode !== undefined ? parentNode : -1,
        to: minNode,
      },
    };

    // Update keys of adjacent vertices
    const neighbors = adjacencyList.get(minNode) || [];
    for (const edge of neighbors) {
      const neighborId = edge.to;
      if (!mstSet.has(neighborId) && edge.weight < (key.get(neighborId) ?? Infinity)) {
        key.set(neighborId, edge.weight);
        parent.set(neighborId, minNode);
      }
    }
  }
}

const primsAdapter: AlgorithmAdapter = {
  metadata: {
    id: "prims",
    name: "Prim's MST",
    type: AlgorithmType.TREE,
    description:
      "Click on any node to see the minimum spanning tree.",
    tagline: "Build minimum spanning tree",
    icon: Network,
    failureMessage: "Graph violates the requirements of the algorithm.",
    requirements: {
      undirectedOnly: true,
      connectedOnly: true,
    },
  },

  /**
   * Generator for step-through mode.
   */
  generator: primsGenerator,

  /**
   * Synchronous execution using generator internally.
   */
  execute: (input: AlgorithmInput): AlgorithmResult => {
    const { adjacencyList, nodes } = input;

    // Check if graph has any directed edges
    let hasDirectedEdge = false;
    adjacencyList.forEach((edges) => {
      edges?.forEach((edge) => {
        if (edge.type === "directed") {
          hasDirectedEdge = true;
        }
      });
    });

    if (hasDirectedEdge) {
      return {
        visitedEdges: [],
        error: "MST requires an undirected graph. Found directed edges.",
      };
    }

    const steps = [...primsGenerator(input)];
    const visitedEdges = steps
      .filter((s) => s.type === 'visit')
      .map((s) => s.edge);

    // Check if all nodes are included (graph is connected)
    if (visitedEdges.length !== nodes.length) {
      return {
        visitedEdges: [],
        error: "Graph is not connected. MST requires a connected graph.",
      };
    }

    return { visitedEdges };
  },
};

export default primsAdapter;
