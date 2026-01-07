import { describe, it, expect } from 'vitest'
import primsAdapter from './prims'
import { AlgorithmInput, EdgeInfo } from '../types'

function createAdjacencyList(
  nodeIds: number[],
  edges: Array<{ from: number; to: number; weight: number; type?: 'directed' | 'undirected' }>
): Map<number, EdgeInfo[]> {
  const adjacencyList = new Map<number, EdgeInfo[]>()

  for (const id of nodeIds) {
    adjacencyList.set(id, [])
  }

  for (const edge of edges) {
    const edgeType = edge.type ?? 'undirected'
    const edgeInfo: EdgeInfo = {
      from: edge.from,
      to: edge.to,
      weight: edge.weight,
      type: edgeType,
    }
    adjacencyList.get(edge.from)?.push(edgeInfo)

    // For undirected, add reverse edge too
    if (edgeType === 'undirected') {
      adjacencyList.get(edge.to)?.push({
        from: edge.to,
        to: edge.from,
        weight: edge.weight,
        type: 'undirected',
      })
    }
  }

  return adjacencyList
}

describe("Prim's MST Algorithm", () => {
  it('has correct metadata', () => {
    expect(primsAdapter.metadata.id).toBe('prims')
    expect(primsAdapter.metadata.name).toBe("Prim's MST")
    expect(primsAdapter.metadata.type).toBe('tree')
    expect(primsAdapter.metadata.requirements?.undirectedOnly).toBe(true)
    expect(primsAdapter.metadata.requirements?.connectedOnly).toBe(true)
  })

  it('finds MST for a simple triangle graph', () => {
    // Triangle: 1 -- 2 -- 3 -- 1
    // Weights:    1     2     3
    // MST should use edges 1-2 (1) and 2-3 (2), skip 1-3 (3)
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2, 3], [
        { from: 1, to: 2, weight: 1 },
        { from: 2, to: 3, weight: 2 },
        { from: 1, to: 3, weight: 3 },
      ]),
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }],
      startNodeId: 1,
    }

    const result = primsAdapter.execute(input)

    expect(result.error).toBeUndefined()
    expect(result.visitedEdges).toHaveLength(3) // All nodes visited
  })

  it('handles a single node graph', () => {
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1], []),
      nodes: [{ id: 1 }],
      startNodeId: 1,
    }

    const result = primsAdapter.execute(input)

    expect(result.error).toBeUndefined()
    expect(result.visitedEdges).toHaveLength(1)
    expect(result.visitedEdges[0]).toEqual({ from: -1, to: 1 })
  })

  it('returns error for directed edges', () => {
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2], [
        { from: 1, to: 2, weight: 1, type: 'directed' },
      ]),
      nodes: [{ id: 1 }, { id: 2 }],
      startNodeId: 1,
    }

    const result = primsAdapter.execute(input)

    expect(result.error).toBe('MST requires an undirected graph. Found directed edges.')
  })

  it('returns error for disconnected graph', () => {
    // Disconnected: 1 -- 2    3 -- 4
    const adjacencyList = new Map<number, EdgeInfo[]>()
    adjacencyList.set(1, [{ from: 1, to: 2, weight: 1, type: 'undirected' }])
    adjacencyList.set(2, [{ from: 2, to: 1, weight: 1, type: 'undirected' }])
    adjacencyList.set(3, [{ from: 3, to: 4, weight: 1, type: 'undirected' }])
    adjacencyList.set(4, [{ from: 4, to: 3, weight: 1, type: 'undirected' }])

    const input: AlgorithmInput = {
      adjacencyList,
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
      startNodeId: 1,
    }

    const result = primsAdapter.execute(input)

    expect(result.error).toBe('Graph is not connected. MST requires a connected graph.')
  })

  it('selects minimum weight edges', () => {
    // Square with diagonal:
    //   1 ---(1)--- 2
    //   |           |
    //  (5)   (2)   (3)
    //   |           |
    //   4 ---(4)--- 3
    // MST should be: 1-2 (1), 1-3 (2), 2-3 (3) = total 6
    // Not 1-4 (5) or 3-4 (4)
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2, 3, 4], [
        { from: 1, to: 2, weight: 1 },
        { from: 2, to: 3, weight: 3 },
        { from: 3, to: 4, weight: 4 },
        { from: 4, to: 1, weight: 5 },
        { from: 1, to: 3, weight: 2 },
      ]),
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
      startNodeId: 1,
    }

    const result = primsAdapter.execute(input)

    expect(result.error).toBeUndefined()
    // MST should include 4 nodes
    expect(result.visitedEdges).toHaveLength(4)
  })
})
