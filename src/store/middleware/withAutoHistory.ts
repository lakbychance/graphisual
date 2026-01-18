import { useGraphHistoryStore } from "../graphHistoryStore";
import { GraphSnapshot, INode, IEdge } from "../../components/Graph/IGraph";

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
