import { EdgeInfo, EdgeRef, AlgorithmResult, StepType } from '../../types';
import { EDGE } from '../../../constants/graph';

/** Edges visited during exploration, in step order. */
export const visitedEdges = (result: AlgorithmResult): EdgeRef[] =>
  result.steps.filter((s) => s.type === StepType.VISIT).map((s) => s.edge);

/** Edges that make up the final answer (shortest path, MST, or detected cycle), in step order. */
export const resultEdges = (result: AlgorithmResult): EdgeRef[] =>
  result.steps
    .filter((s) => s.type === StepType.RESULT || s.type === StepType.CYCLE)
    .map((s) => s.edge);

/**
 * Helper to create adjacency list from edges for testing.
 * Supports optional weight (defaults to EDGE.DEFAULT_WEIGHT for unweighted graphs) and optional type (defaults to 'directed').
 * For undirected edges, automatically adds the reverse edge.
 */
export function createAdjacencyList(
  nodeIds: number[],
  edges: Array<{
    from: number;
    to: number;
    weight?: number;
    type?: 'directed' | 'undirected';
  }>
): Map<number, EdgeInfo[]> {
  const adjacencyList = new Map<number, EdgeInfo[]>();

  // Initialize all nodes
  for (const id of nodeIds) {
    adjacencyList.set(id, []);
  }

  // Add edges
  for (const edge of edges) {
    const edgeType = edge.type ?? 'directed';
    const edgeWeight = edge.weight ?? EDGE.DEFAULT_WEIGHT;

    const edgeInfo: EdgeInfo = {
      from: edge.from,
      to: edge.to,
      weight: edgeWeight,
      type: edgeType,
    };
    adjacencyList.get(edge.from)?.push(edgeInfo);

    // For undirected edges, add the reverse edge
    if (edgeType === 'undirected') {
      adjacencyList.get(edge.to)?.push({
        from: edge.to,
        to: edge.from,
        weight: edgeWeight,
        type: 'undirected',
      });
    }
  }

  return adjacencyList;
}
