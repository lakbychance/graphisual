import type { NodeVisualizationFlags } from "../../components/Graph/types";

export type NodeVisState = 'start' | 'end' | 'path' | 'cycle' | 'visited' | 'default';

type VisualizationInput = { startNodeId: number; endNodeId: number } | null;

/**
 * Resolves what a node should look like from its highlight flags and the chosen endpoints.
 * Result highlights (path / cycle) win over the start/end tint so the endpoints visibly join
 * the answer; being merely visited does not, so the endpoints stay marked during traversal.
 */
export function resolveNodeVisState(
  nodeId: number,
  flags: NodeVisualizationFlags | undefined,
  input: VisualizationInput
): NodeVisState {
  if (flags?.isInCycle) return 'cycle';
  if (flags?.isInShortestPath) return 'path';
  if (input?.startNodeId === nodeId) return 'start';
  if (input?.endNodeId === nodeId) return 'end';
  if (flags?.isVisited) return 'visited';
  return 'default';
}
