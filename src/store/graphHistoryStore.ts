import { createHistoryStore, withAutoHistory, withBatchedAutoHistory } from "./historyStore";
import { GraphSnapshot, INode, IEdge } from "../components/Graph/IGraph";

// ============================================================================
// Graph History Store
// ============================================================================

const areSnapshotsEqual = (a: GraphSnapshot, b: GraphSnapshot): boolean => {
  return JSON.stringify(a) === JSON.stringify(b);
};

export const useGraphHistoryStore = createHistoryStore<GraphSnapshot>({
  name: "GraphHistoryStore",
  areEqual: areSnapshotsEqual,
});

// ============================================================================
// Graph Snapshot Utilities
// ============================================================================

export const createGraphSnapshot = (
  nodes: INode[],
  edges: Map<number, IEdge[]>,
  nodeCounter: number
): GraphSnapshot => ({
  nodes,
  edges: Array.from(edges.entries()).map(([k, v]) => [k, v || []]),
  nodeCounter,
});

// ============================================================================
// Graph-Specific Auto-History Wrappers
// ============================================================================

type GraphState = { nodes: INode[]; edges: Map<number, IEdge[]>; nodeCounter: number };

/**
 * Graph-specific auto-history wrapper.
 * Captures a graph snapshot before each mutation for undo/redo support.
 */
export function withGraphAutoHistory<TArgs extends unknown[], TReturn>(
  getState: () => GraphState,
  mutation: (...args: TArgs) => TReturn
): (...args: TArgs) => TReturn {
  return withAutoHistory(
    useGraphHistoryStore,
    () => {
      const { nodes, edges, nodeCounter } = getState();
      return createGraphSnapshot(nodes, edges, nodeCounter);
    },
    mutation
  );
}

/**
 * Graph-specific batched auto-history wrapper for high-frequency mutations.
 * Captures a snapshot on first call, then debounces pushing to history.
 */
export function withGraphBatchedAutoHistory<TArgs extends unknown[], TReturn>(
  getState: () => GraphState,
  mutation: (...args: TArgs) => TReturn,
  debounceMs?: number
): (...args: TArgs) => TReturn {
  return withBatchedAutoHistory(
    useGraphHistoryStore,
    () => {
      const { nodes, edges, nodeCounter } = getState();
      return createGraphSnapshot(nodes, edges, nodeCounter);
    },
    mutation,
    debounceMs
  );
}
