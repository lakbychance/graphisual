import { AlgorithmType } from "../../algorithms/types";

/**
 * Selected option for dropdowns.
 */
export interface SelectedOption {
  key: string;
  text: string;
  data?: AlgorithmType;
}

/**
 * Visualization flags for a node (stored separately from node data).
 */
export interface NodeVisualizationFlags {
  isVisited?: boolean;
  isInShortestPath?: boolean;
  isInCycle?: boolean;
}

/**
 * Visualization flags for an edge (stored separately from edge data).
 * Key format: "fromId-toId"
 */
export interface EdgeVisualizationFlags {
  isUsedInTraversal?: boolean;
  isUsedInShortestPath?: boolean;
  isUsedInCycle?: boolean;
}

/**
 * Node in the graph (core structural/positional data only).
 */
export interface GraphNode {
  x: number;
  y: number;
  r: number;
  id: number;
}

/**
 * Edge in the graph (core structural data only).
 */
export interface GraphEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  nodeX2: number;
  nodeY2: number;
  from: number;
  to: number;
  weight: number;
  type: string;
}

/**
 * Snapshot of graph state for undo/redo history.
 * Uses array format for edges to enable JSON serialization.
 */
export interface GraphSnapshot {
  nodes: GraphNode[];
  edges: [number, GraphEdge[]][];
  nodeCounter: number;
  stackingOrder: number[];  // Node IDs in render order (last = top)
}
