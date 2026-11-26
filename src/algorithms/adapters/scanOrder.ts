import type { AlgorithmInput } from "../types";

/**
 * The graph's nodes in the order the algorithms scan them: the adjacency list's order, then any node
 * missing from it. Lists of nodes in answers follow it, so they read the same whichever order the
 * graph's own node list keeps (a step link carries only the scan order).
 */
export function scanOrder({ adjacencyList, nodes }: AlgorithmInput): number[] {
  const ids = new Set(nodes.map((n) => n.id));
  return [...new Set([...adjacencyList.keys(), ...ids])].filter((id) => ids.has(id));
}
