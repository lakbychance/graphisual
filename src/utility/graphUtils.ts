import { IEdge } from "../components/Graph/IGraph";

/**
 * Check if the graph contains any edges with negative weights.
 */
export function hasNegativeWeights(edges: Map<number, IEdge[]>): boolean {
  for (const edgeList of edges.values()) {
    if (edgeList?.some((edge) => edge.weight < 0)) {
      return true;
    }
  }
  return false;
}

/**
 * Algorithm IDs that don't support negative edge weights.
 */
export const ALGORITHMS_NO_NEGATIVE_WEIGHTS = new Set([
  "dijkstra",
  "astar",
  "prims",
  "kruskals",
]);
