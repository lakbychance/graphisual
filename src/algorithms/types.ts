/**
 * Algorithm Adapter Types
 *
 * This file defines the core interfaces for the algorithm adapter system.
 * Contributors implement the AlgorithmAdapter interface to add new algorithms.
 */

import type React from "react";
import { StepType } from "../constants/visualization";
import { type EdgeType } from "../constants/graph";

// Re-export StepType for convenience
export { StepType };

/**
 * Categories of graph algorithms.
 * Determines UI behavior (node selection requirements).
 */
export enum AlgorithmType {
  /** Traversal algorithms (BFS, DFS) - requires single start node */
  TRAVERSAL = "traversal",
  /** Pathfinding algorithms (Dijkstra, A*) - requires start and end nodes */
  PATHFINDING = "pathfinding",
  /** Tree algorithms (MST) - requires single start node */
  TREE = "tree",
}

/**
 * Input provided to algorithm execution.
 * The core system prepares this data from the current graph state.
 */
export interface AlgorithmInput {
  /** Adjacency list representation of the graph */
  adjacencyList: Map<number, EdgeInfo[]>;
  /** All nodes in the graph */
  nodes: NodeInfo[];
  /** Starting node ID (always provided) */
  startNodeId: number;
  /** Ending node ID (only for pathfinding algorithms) */
  endNodeId?: number;
}

/**
 * Simplified node information for algorithms.
 * Coordinates are optional but needed for heuristic-based algorithms (A*).
 */
export interface NodeInfo {
  id: number;
  /** X coordinate (optional, used by A* for heuristic) */
  x?: number;
  /** Y coordinate (optional, used by A* for heuristic) */
  y?: number;
}

/**
 * Edge information available to algorithms.
 */
export interface EdgeInfo {
  /** Source node ID */
  from: number;
  /** Target node ID */
  to: number;
  /** Edge weight (for weighted algorithms) */
  weight: number;
  /** Edge type */
  type: EdgeType;
}

/**
 * Edge reference in algorithm results.
 * Uses simple from/to pairs that the core maps back to full edges.
 */
export interface EdgeRef {
  /** Source node ID (-1 indicates start/root with no parent) */
  from: number;
  /** Target node ID */
  to: number;
}

/**
 * A single step yielded by an algorithm generator.
 * Used for step-through visualization mode.
 */
export interface AlgorithmStep {
  /** Step type: StepType.VISIT for traversal, StepType.RESULT for final path edges */
  type: StepType;
  /** The edge being visualized in this step */
  edge: EdgeRef;
}

/**
 * Generator type for step-through algorithm execution.
 * Yields one step at a time for manual stepping.
 */
export type AlgorithmGenerator = Generator<AlgorithmStep, void, undefined>;

/**
 * Result returned by algorithm execution.
 * The core visualization system handles rendering based on this data.
 */
export interface AlgorithmResult {
  /** Edges visited in order (for traversal animation) */
  visitedEdges: EdgeRef[];
  /** Final result edges (shortest path, MST edges, etc.) - optional */
  resultEdges?: EdgeRef[];
  /** Step type for result edges (defaults to RESULT if not specified, use CYCLE for cycle detection) */
  resultStepType?: StepType;
  /** Error message if algorithm cannot run on this graph */
  error?: string;
}

/**
 * Metadata about an algorithm for UI and registration.
 * This information drives the dropdown options and user messages.
 */
export interface AlgorithmMetadata {
  /** Unique identifier (used as dropdown key) */
  id: string;
  /** Display name shown in dropdown */
  name: string;
  /** Algorithm category - determines node selection behavior */
  type: AlgorithmType;
  /** Short tagline for algorithm picker cards */
  tagline: string;
  /** Icon component for algorithm picker */
  icon: React.ComponentType<{ className?: string }>;
  /** Hints shown for each input step (no full stops) */
  inputStepHints: string[];
  /** Optional error message when algorithm fails */
  failureMessage?: string;
  /** Optional constraints that the graph must satisfy */
  requirements?: {
    /** Algorithm uses edge weights */
    weighted?: boolean;
    /** Algorithm only works on undirected graphs */
    undirectedOnly?: boolean;
    /** Algorithm requires a connected graph */
    connectedOnly?: boolean;
  };
}

/**
 * The Algorithm Adapter Interface.
 *
 * Contributors implement this interface to add new algorithms.
 * Each adapter is a self-contained module with metadata and execution logic.
 *
 * @example
 * ```typescript
 * const myAdapter: AlgorithmAdapter = {
 *   metadata: {
 *     id: 'my-algo',
 *     name: 'My Algorithm',
 *     type: AlgorithmType.TRAVERSAL,
 *     description: 'Click a node to start.',
 *   },
 *   execute: (input) => {
 *     const visitedEdges: EdgeRef[] = [];
 *     // ... algorithm logic ...
 *     return { visitedEdges };
 *   },
 * };
 *
 * export default myAdapter;
 * ```
 */
export interface AlgorithmAdapter {
  /** Metadata for registration and UI */
  metadata: AlgorithmMetadata;
  /** The algorithm execution function (synchronous, returns all results at once) */
  execute: (input: AlgorithmInput) => AlgorithmResult;
  /** Optional generator for step-through mode (yields one step at a time) */
  generator?: (input: AlgorithmInput) => AlgorithmGenerator;
}
