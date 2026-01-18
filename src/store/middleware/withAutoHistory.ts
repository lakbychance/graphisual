import { useGraphHistoryStore } from "../graphHistoryStore";
import { GraphSnapshot, INode, IEdge } from "../../components/Graph/IGraph";
import { debounce } from "../../utility/debounce";
import { TIMING } from "../../utility/constants";

export const createGraphSnapshot = (
  nodes: INode[],
  edges: Map<number, IEdge[]>,
  nodeCounter: number
): GraphSnapshot => ({
  nodes,
  edges: Array.from(edges.entries()).map(([k, v]) => [k, v || []]),
  nodeCounter,
});

export function withAutoHistory<
  TState extends { nodes: INode[]; edges: Map<number, IEdge[]>; nodeCounter: number },
  TArgs extends unknown[],
  TReturn
>(
  getState: () => TState,
  mutation: (...args: TArgs) => TReturn
): (...args: TArgs) => TReturn {
  return (...args: TArgs): TReturn => {
    const { nodes, edges, nodeCounter } = getState();
    const snapshot = createGraphSnapshot(nodes, edges, nodeCounter);
    useGraphHistoryStore.getState().push(snapshot);
    return mutation(...args);
  };
}

/**
 * Batched auto-history wrapper for high-frequency mutations like dragging.
 *
 * Captures state on first call, then debounces pushing to history.
 * This ensures rapid calls (e.g., moving a node pixel by pixel) result
 * in a single undo entry rather than one per call.
 */
export function withBatchedAutoHistory<
  TState extends { nodes: INode[]; edges: Map<number, IEdge[]>; nodeCounter: number },
  TArgs extends unknown[],
  TReturn
>(
  getState: () => TState,
  mutation: (...args: TArgs) => TReturn,
  debounceMs: number = TIMING.DEBOUNCE
): (...args: TArgs) => TReturn {
  let pendingSnapshot: GraphSnapshot | null = null;

  // Create debounced function to push snapshot when batch ends
  const pushSnapshot = debounce(() => {
    if (pendingSnapshot) {
      useGraphHistoryStore.getState().push(pendingSnapshot);
      pendingSnapshot = null;
    }
  }, debounceMs);

  return (...args: TArgs): TReturn => {
    // Capture snapshot only on first call of batch
    if (!pendingSnapshot) {
      const { nodes, edges, nodeCounter } = getState();
      pendingSnapshot = createGraphSnapshot(nodes, edges, nodeCounter);
    }

    // Execute mutation
    const result = mutation(...args);

    // Schedule push (debounced - will only fire after calls stop)
    pushSnapshot();

    return result;
  };
}
