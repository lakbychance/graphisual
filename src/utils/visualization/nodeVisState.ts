import type { NodeRunState, NodeVisualizationFlags } from "../../components/Graph/types";

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

/**
 * The run mark a node shows: a ring while it waits or is worked on, a pale fill once the run is done
 * with it. Done shows only on a node otherwise drawn as visited, so the start and end markers and
 * the answer keep their own look.
 */
export function resolveNodeRunMark(flags: NodeVisualizationFlags | undefined, visState: NodeVisState): NodeRunState | null {
  const mark = flags?.runState;
  if (!mark) return null;
  return mark === 'done' && visState !== 'visited' ? null : mark;
}
