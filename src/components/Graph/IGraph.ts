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
 * Node in the graph.
 */
export interface INode {
  x: number;
  y: number;
  r: number;
  id: number;
  isInShortestPath?: boolean;
  isVisited?: boolean;
  [key: string]: unknown;
}

/**
 * Edge in the graph.
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
  isUsedInTraversal?: boolean;
  isUsedInShortestPath?: boolean;
  [key: string]: unknown;
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
