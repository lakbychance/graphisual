/**
 * Oracles: deliberately simple reference answers to check algorithms against.
 */
import type { AlgorithmInput } from "../../types";

/**
 * Shortest distance from the start to every reachable node, by trying every simple path.
 * Slow and obviously right; fine for the suite's graphs of at most 8 nodes.
 */
export function bruteForceDistances({ adjacencyList, startNodeId }: AlgorithmInput): Map<number, number> {
  const best = new Map<number, number>();
  const onPath = new Set<number>();
  const walk = (node: number, cost: number) => {
    if (cost < (best.get(node) ?? Infinity)) best.set(node, cost);
    onPath.add(node);
    for (const edge of adjacencyList.get(node) ?? []) {
      if (!onPath.has(edge.to)) walk(edge.to, cost + edge.weight);
    }
    onPath.delete(node);
  };
  walk(startNodeId, 0);
  return best;
}
