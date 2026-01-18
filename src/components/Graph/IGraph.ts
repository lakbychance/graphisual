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
}

/**
 * Visualization flags for an edge (stored separately from edge data).
 * Key format: "fromId-toId"
 */
export interface EdgeVisualizationFlags {
  isUsedInTraversal?: boolean;
  isUsedInShortestPath?: boolean;
}

/**
 * Node in the graph (core structural/positional data only).
 */
export interface INode {
  x: number;
  y: number;
  r: number;
  id: number;
}

/**
 * Edge in the graph (core structural data only).
 */
export interface IEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  nodeX2: number;
  nodeY2: number;
  from: string;
  to: string;
  weight: number;
  type: string;
}

/**
 * Snapshot of graph state for undo/redo history.
 * Uses array format for edges to enable JSON serialization.
 */
export interface GraphSnapshot {
  nodes: INode[];
  edges: [number, IEdge[]][];
  nodeCounter: number;
}
