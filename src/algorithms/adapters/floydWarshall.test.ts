import { describe, it, expect } from 'vitest'
import floydWarshallAdapter from './floydWarshall'
import { AlgorithmInput, EdgeInfo } from '../types'

function createAdjacencyList(
  nodeIds: number[],
  edges: Array<{ from: number; to: number; weight: number }>
): Map<number, EdgeInfo[]> {
  const adjacencyList = new Map<number, EdgeInfo[]>()

  for (const id of nodeIds) {
    adjacencyList.set(id, [])
  }

  for (const edge of edges) {
    const edgeInfo: EdgeInfo = {
      from: edge.from,
      to: edge.to,
      weight: edge.weight,
      type: 'directed',
    }
    adjacencyList.get(edge.from)?.push(edgeInfo)
  }

  return adjacencyList
}

describe('Floyd-Warshall Algorithm', () => {
  it('has correct metadata', () => {
    expect(floydWarshallAdapter.metadata.id).toBe('floyd-warshall')
    expect(floydWarshallAdapter.metadata.name).toBe('Floyd-Warshall')
    expect(floydWarshallAdapter.metadata.type).toBe('traversal')
    expect(floydWarshallAdapter.metadata.requirements?.weighted).toBe(true)
  })

  it('finds all shortest paths from source', () => {
    // Graph: 1 -> 2 -> 3
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2, 3], [
        { from: 1, to: 2, weight: 1 },
        { from: 2, to: 3, weight: 1 },
      ]),
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }],
      startNodeId: 1,
    }

    const result = floydWarshallAdapter.execute(input)

    expect(result.error).toBeUndefined()
    expect(result.resultEdges).toBeDefined()

    // Result should contain paths to nodes 2 and 3
    const resultNodes = result.resultEdges!.map(e => e.to)
    expect(resultNodes).toContain(2)
    expect(resultNodes).toContain(3)
  })

  it('chooses shortest path when multiple exist', () => {
    // Graph:
    //   1 --(10)--> 3
    //   1 --(1)--> 2 --(1)--> 3
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2, 3], [
        { from: 1, to: 3, weight: 10 },
        { from: 1, to: 2, weight: 1 },
        { from: 2, to: 3, weight: 1 },
      ]),
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }],
      startNodeId: 1,
    }

    const result = floydWarshallAdapter.execute(input)

    expect(result.error).toBeUndefined()
    // Path to 3 should go through 2 (1+1=2 < 10)
    const resultEdges = result.resultEdges!
    const hasEdge12 = resultEdges.some(e => e.from === 1 && e.to === 2)
    const hasEdge23 = resultEdges.some(e => e.from === 2 && e.to === 3)
    expect(hasEdge12).toBe(true)
    expect(hasEdge23).toBe(true)
  })

  it('handles single node', () => {
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1], []),
      nodes: [{ id: 1 }],
      startNodeId: 1,
    }

    const result = floydWarshallAdapter.execute(input)

    // Only start node, no other paths
    expect(result.error).toBe('No paths found from the selected node.')
  })

  it('handles disconnected graph', () => {
    // 1 -> 2    3 (disconnected)
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2, 3], [
        { from: 1, to: 2, weight: 1 },
      ]),
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }],
      startNodeId: 1,
    }

    const result = floydWarshallAdapter.execute(input)

    expect(result.error).toBeUndefined()
    // Should find path to 2 but not to 3
    const resultNodes = result.resultEdges!.map(e => e.to)
    expect(resultNodes).toContain(2)
    expect(resultNodes).not.toContain(3)
  })

  it('returns error for empty graph', () => {
    const input: AlgorithmInput = {
      adjacencyList: new Map(),
      nodes: [],
      startNodeId: 1,
    }

    const result = floydWarshallAdapter.execute(input)

    expect(result.error).toBe('No nodes in the graph.')
  })

  it('handles zero-weight edges', () => {
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2], [
        { from: 1, to: 2, weight: 0 },
      ]),
      nodes: [{ id: 1 }, { id: 2 }],
      startNodeId: 1,
    }

    const result = floydWarshallAdapter.execute(input)

    expect(result.error).toBeUndefined()
    expect(result.resultEdges).toBeDefined()
  })

  it('works with larger graph', () => {
    // Diamond: 1 -> 2 -> 4
    //          1 -> 3 -> 4
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2, 3, 4], [
        { from: 1, to: 2, weight: 1 },
        { from: 1, to: 3, weight: 2 },
        { from: 2, to: 4, weight: 3 },
        { from: 3, to: 4, weight: 1 },
      ]),
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
      startNodeId: 1,
    }

    const result = floydWarshallAdapter.execute(input)

    expect(result.error).toBeUndefined()
    // All nodes should be reachable
    const resultNodes = result.resultEdges!.map(e => e.to)
    expect(resultNodes).toContain(2)
    expect(resultNodes).toContain(3)
    expect(resultNodes).toContain(4)
  })
})
