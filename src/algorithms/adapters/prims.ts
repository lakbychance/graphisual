/**
 * Prim's Minimum Spanning Tree Algorithm Adapter
 *
 * Finds a minimum spanning tree for a weighted undirected graph.
 * Starts from a node and greedily adds the minimum weight edge
 * that connects the tree to a new vertex.
 */

import { PrimsIcon } from "../icons";
import {
  AlgorithmAdapter,
  AlgorithmInput,
  AlgorithmResult,
  AlgorithmType,
  AlgorithmGenerator,
  StepType,
} from "../types";
import { EDGE_TYPE } from "../../constants/graph";

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
      if (edge.type === EDGE_TYPE.DIRECTED) {
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

  // Helper to get priority queue state (nodes not in MST with finite keys, sorted by key)
  const getPriorityQueueState = () => {
    return Array.from(key.entries())
      .filter(([nodeId, k]) => !mstSet.has(nodeId) && k !== Infinity)
      .sort((a, b) => a[1] - b[1])
      .map(([id, value]) => ({ id, value }));
  };

  // Track total MST weight
  let totalWeight = 0;

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
    const parentNode = parent.get(minNode);
    const edgeWeight = parentNode !== undefined ? minKey : 0;
    totalWeight += edgeWeight;

    // Update keys of adjacent vertices first (so narration shows updated state)
    const neighbors = adjacencyList.get(minNode) || [];
    const updatedNodes: number[] = [];
    for (const edge of neighbors) {
      const neighborId = edge.to;
      if (!mstSet.has(neighborId) && edge.weight < (key.get(neighborId) ?? Infinity)) {
        key.set(neighborId, edge.weight);
        parent.set(neighborId, minNode);
        updatedNodes.push(neighborId);
      }
    }

    // Build narration message
    let message: string;
    if (parentNode === undefined) {
      message = `**Starting at node ${minNode}**`;
    } else {
      message = `**Adding edge ${parentNode}→${minNode}** (weight: ${edgeWeight})`;
    }
    if (updatedNodes.length > 0) {
      message += `, updated **${updatedNodes.join(", ")}**`;
    }
    message += `. MST: ${mstSet.size} nodes, total weight: ${totalWeight}`;

    // Yield the edge with narration
    yield {
      type: StepType.VISIT,
      edge: {
        from: parentNode !== undefined ? parentNode : -1,
        to: minNode,
      },
      narration: {
        message,
        dataStructure: {
          type: "priority-queue",
          items: getPriorityQueueState(),
          processing: { id: minNode, value: edgeWeight },
          justAdded: updatedNodes.length > 0 ? updatedNodes : undefined,
        },
      },
    };
  }
}

const primsAdapter: AlgorithmAdapter = {
  metadata: {
    id: "prims",
    name: "Prim's MST",
    type: AlgorithmType.TREE,
    tagline: "Build minimum spanning tree",
    icon: PrimsIcon,
    inputStepHints: ["Select a node"],
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
        if (edge.type === EDGE_TYPE.DIRECTED) {
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
      .filter((s) => s.type === StepType.VISIT)
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
