/**
 * Algorithm Adapter Types
 *
 * This file defines the core interfaces for the algorithm adapter system.
 * Contributors implement the AlgorithmAdapter interface to add new algorithms.
 */

import type React from "react";
import { type EdgeType } from "../constants/graph";
import type { AlgorithmEvent, ChoicePolicy } from "./engine/events";

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
 */
export interface NodeInfo {
  id: number;
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
 * State of a data structure for visualization in the trace panel.
 * Used to show queue/stack/etc. contents during step-through mode.
 */
export interface DataStructureState {
  /** Type of data structure being visualized */
  type: 'queue' | 'stack' | 'priority-queue' | 'distances' | 'recursion-stack';
  /** Items in the data structure with their node IDs and optional values */
  items: Array<{ id: number; value?: number }>;
  /** The item currently being processed (just dequeued/popped) */
  processing?: { id: number; value?: number };
  /** Items that were just added in this step */
  justAdded?: number[];
}

/**
 * What the trace panel shows for one step.
 * Provides human-readable context about what the algorithm is doing.
 */
export interface StepTrace {
  /** Human-readable description of the current action */
  message: string;
  /** Optional data structure state to visualize */
  dataStructure?: DataStructureState;
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
}

/**
 * The Algorithm Adapter Interface.
 *
 * Contributors implement this interface to add new algorithms. An adapter reports what the
 * algorithm does as events (see `engine/events.ts`); the app plays them one step (one change) at a time.
 *
 * @example
 * ```typescript
 * const myAdapter: AlgorithmAdapter = {
 *   metadata: {
 *     id: 'my-algo',
 *     name: 'My Algorithm',
 *     type: AlgorithmType.TRAVERSAL,
 *     tagline: 'Explore every node',
 *     icon: MyIcon,
 *     inputStepHints: ['Select a start node'],
 *   },
 *   pseudocode: ['visit(source)'],
 *   events: (input) => [
 *     { type: 'settle', node: input.startNodeId, line: 0, group: 1 },
 *     // ... one event per thing the algorithm does, then its answer ...
 *   ],
 * };
 *
 * export default myAdapter;
 * ```
 */
export interface AlgorithmAdapter {
  /** Metadata for registration and UI */
  metadata: AlgorithmMetadata;
  /** Pseudocode lines that events point at. */
  pseudocode: string[];
  /**
   * Reports what the algorithm did, event by event. Where it could go more than one way it reports a
   * `decide` event and goes the way `choose` picks (the first option when no policy is given, see
   * `engine/choices.ts`). An algorithm that never has a choice ignores `choose`.
   */
  events: (input: AlgorithmInput, choose?: ChoicePolicy) => AlgorithmEvent[];
  /**
   * Why the app will not play this run, if it will not: the message it shows instead (node ids
   * marked with `nid`). Called with the run's events.
   */
  refusal?: (events: AlgorithmEvent[], input: AlgorithmInput) => string | undefined;
}
