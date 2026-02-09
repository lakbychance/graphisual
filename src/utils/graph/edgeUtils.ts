/**
 * Shared edge utility functions for both SVG and Canvas renderers.
 */

import type { GraphEdge } from "../../components/Graph/types";

/**
 * Check if an edge can be created between two nodes.
 * Validates:
 * - No self-loops (source !== target)
 * - No duplicate edges
 */
export function canCreateEdge(
  edges: Map<number, GraphEdge[]>,
  sourceId: number,
  targetId: number
): boolean {
  // No self-loops
  if (sourceId === targetId) return false;

  // No duplicate edges
  const existingEdges = edges.get(sourceId) || [];
  return !existingEdges.some(e => e.to === targetId);
}
