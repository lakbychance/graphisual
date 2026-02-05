import { GraphEdge } from "../../components/Graph/types";

/**
 * Check if the graph contains any edges with negative weights.
 */
export function hasNegativeWeights(edges: Map<number, GraphEdge[]>): boolean {
  for (const edgeList of edges.values()) {
    if (edgeList?.some((edge) => edge.weight < 0)) {
      return true;
    }
  }
  return false;
}

/**
 * Algorithm IDs that don't support negative edge weights.
 * Note: MST algorithms (Prim's, Kruskal's) DO support negative weights
 * since they compare individual edge weights, not cumulative distances.
 */
export const ALGORITHMS_NO_NEGATIVE_WEIGHTS = new Set([
  "dijkstra",
]);
