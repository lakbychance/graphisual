import { EdgeInfo } from '../../types';

/**
 * Helper to create adjacency list from edges for testing.
 * Supports optional weight (defaults to 0) and optional type (defaults to 'directed').
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
    const edgeWeight = edge.weight ?? 0;

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
