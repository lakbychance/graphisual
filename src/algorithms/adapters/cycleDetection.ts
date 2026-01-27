/**
 * Cycle Detection Algorithm Adapter
 *
 * Detects cycles in a graph using DFS with coloring.
 * For directed graphs: uses 3-color (white/gray/black) approach.
 * For undirected graphs: tracks parent to avoid false positives.
 */

import { CycleDetectionIcon } from "../icons";
import {
  AlgorithmAdapter,
  AlgorithmInput,
  AlgorithmResult,
  AlgorithmType,
  AlgorithmGenerator,
  AlgorithmStep,
  EdgeRef,
  StepType,
} from "../types";
import { EDGE_TYPE } from "../../constants/graph";

// Node colors for DFS
const WHITE = 0; // Unvisited
const GRAY = 1;  // In current recursion stack
const BLACK = 2; // Fully processed

/**
 * Generator function for step-through cycle detection.
 * Yields visit steps during exploration, then result steps for the cycle path.
 */
function* cycleDetectionGenerator(input: AlgorithmInput): AlgorithmGenerator {
  const { adjacencyList, startNodeId } = input;
  const color = new Map<number, number>();
  const parent = new Map<number, number>();

  // Initialize all nodes as unvisited
  adjacencyList.forEach((_, nodeId) => {
    color.set(nodeId, WHITE);
  });

  // Track the cycle path when found
  let cycleEdges: EdgeRef[] = [];
  let cycleFound = false;

  // Check if graph has any directed edges
  let hasDirectedEdge = false;
  adjacencyList.forEach((edges) => {
    edges.forEach((edge) => {
      if (edge.type === EDGE_TYPE.DIRECTED) {
        hasDirectedEdge = true;
      }
    });
  });

  // Steps to yield (collected during DFS)
  const stepsToYield: AlgorithmStep[] = [];

  // Reconstruct cycle from the back edge
  const reconstructCycle = (
    fromNode: number,
    toNode: number,
    parentMap: Map<number, number>
  ): EdgeRef[] => {
    const cycle: EdgeRef[] = [];

    // Walk back from fromNode to toNode through parent chain
    let current = fromNode;
    const path: number[] = [current];

    while (current !== toNode && parentMap.has(current)) {
      current = parentMap.get(current)!;
      path.push(current);
    }

    // Create edges for the cycle
    for (let i = 0; i < path.length - 1; i++) {
      cycle.push({ from: path[i + 1], to: path[i] });
    }
    // Add the closing edge
    cycle.push({ from: fromNode, to: toNode });

    return cycle;
  };

  // DFS function
  const dfs = (nodeId: number, parentId: number): boolean => {
    color.set(nodeId, GRAY);
    parent.set(nodeId, parentId);

    // Record visiting this node
    stepsToYield.push({ type: StepType.VISIT, edge: { from: parentId, to: nodeId } });

    const neighbors = adjacencyList.get(nodeId) || [];

    for (const edge of neighbors) {
      const neighborId = edge.to;
      const neighborColor = color.get(neighborId) ?? WHITE;

      if (neighborColor === WHITE) {
        // Unvisited - continue DFS
        if (dfs(neighborId, nodeId)) {
          return true;
        }
      } else if (neighborColor === GRAY) {
        // Back edge found - cycle detected!
        // For undirected graphs, skip if it's just the parent edge
        if (!hasDirectedEdge && neighborId === parentId) {
          continue;
        }

        // Record the edge that completes the cycle
        stepsToYield.push({ type: StepType.VISIT, edge: { from: nodeId, to: neighborId } });

        // Reconstruct the cycle path
        cycleEdges = reconstructCycle(nodeId, neighborId, parent);
        return true;
      }
      // BLACK nodes are already fully processed, skip them
    }

    color.set(nodeId, BLACK);
    return false;
  };

  // Start DFS from the selected node
  cycleFound = dfs(startNodeId, -1);

  // If no cycle found starting from this node, check other components
  if (!cycleFound) {
    adjacencyList.forEach((_, nodeId) => {
      if (!cycleFound && color.get(nodeId) === WHITE) {
        cycleFound = dfs(nodeId, -1);
      }
    });
  }

  // Yield all visit steps
  for (const step of stepsToYield) {
    yield step;
  }

  // If cycle found, yield result steps
  if (cycleFound) {
    for (const edge of cycleEdges) {
      yield { type: StepType.RESULT, edge };
    }
  }
}

const cycleDetectionAdapter: AlgorithmAdapter = {
  metadata: {
    id: "cycle-detection",
    name: "Cycle Detection",
    type: AlgorithmType.TRAVERSAL,
    tagline: "Find loops in graph",
    icon: CycleDetectionIcon,
    inputStepHints: ["Select a node"],
    failureMessage: "No cycle found in the graph.",
  },

  /**
   * Generator for step-through mode.
   */
  generator: cycleDetectionGenerator,

  /**
   * Synchronous execution using generator internally.
   */
  execute: (input: AlgorithmInput): AlgorithmResult => {
    const steps = [...cycleDetectionGenerator(input)];
    const visitedEdges = steps
      .filter((s) => s.type === StepType.VISIT)
      .map((s) => s.edge);
    const resultEdges = steps
      .filter((s) => s.type === StepType.RESULT)
      .map((s) => s.edge);

    if (resultEdges.length === 0) {
      return {
        visitedEdges,
        error: "No cycle found in the graph.",
      };
    }

    return { visitedEdges, resultEdges };
  },
};

export default cycleDetectionAdapter;
