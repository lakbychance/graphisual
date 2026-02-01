import { describe, it, expect } from 'vitest'
import dijkstraAdapter from './dijkstra'
import { AlgorithmInput } from '../types'
import { createAdjacencyList } from './__tests__/testUtils'

describe('Dijkstra Algorithm', () => {
  it('has correct metadata', () => {
    expect(dijkstraAdapter.metadata.id).toBe('dijkstra')
    expect(dijkstraAdapter.metadata.name).toBe("Dijkstra's")
    expect(dijkstraAdapter.metadata.type).toBe('pathfinding')
    expect(dijkstraAdapter.metadata.requirements?.weighted).toBe(true)
  })

  it('finds shortest path in a simple graph', () => {
    // Graph: 1 --(2)--> 2 --(3)--> 3
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2, 3], [
        { from: 1, to: 2, weight: 2 },
        { from: 2, to: 3, weight: 3 },
      ]),
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }],
      startNodeId: 1,
      endNodeId: 3,
    }

    const result = dijkstraAdapter.execute(input)

    expect(result.error).toBeUndefined()
    expect(result.resultEdges).toBeDefined()

    // Path should be 1 -> 2 -> 3
    const pathNodes = result.resultEdges!.map(e => e.to)
    expect(pathNodes).toEqual([1, 2, 3])
  })

  it('finds shortest path when multiple paths exist', () => {
    // Graph:
    //   1 --(10)--> 3
    //   1 --(2)--> 2 --(3)--> 3
    // Shortest: 1 -> 2 -> 3 (weight 5)
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2, 3], [
        { from: 1, to: 3, weight: 10 },
        { from: 1, to: 2, weight: 2 },
        { from: 2, to: 3, weight: 3 },
      ]),
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }],
      startNodeId: 1,
      endNodeId: 3,
    }

    const result = dijkstraAdapter.execute(input)

    expect(result.error).toBeUndefined()
    const pathNodes = result.resultEdges!.map(e => e.to)
    expect(pathNodes).toEqual([1, 2, 3])
  })

  it('handles same start and end node', () => {
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2], [
        { from: 1, to: 2, weight: 5 },
      ]),
      nodes: [{ id: 1 }, { id: 2 }],
      startNodeId: 1,
      endNodeId: 1,
    }

    const result = dijkstraAdapter.execute(input)

    expect(result.error).toBeUndefined()
    expect(result.resultEdges).toHaveLength(1)
    expect(result.resultEdges![0]).toEqual({ from: -1, to: 1 })
  })

  it('returns error when no path exists', () => {
    // Disconnected graph
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2, 3], [
        { from: 1, to: 2, weight: 1 },
      ]),
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }],
      startNodeId: 1,
      endNodeId: 3,
    }

    const result = dijkstraAdapter.execute(input)

    expect(result.error).toBe('Path is not possible for the given vertices.')
  })

  it('returns error when endNodeId is missing', () => {
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2], [
        { from: 1, to: 2, weight: 1 },
      ]),
      nodes: [{ id: 1 }, { id: 2 }],
      startNodeId: 1,
      // endNodeId not provided
    }

    const result = dijkstraAdapter.execute(input)

    expect(result.error).toBe('End node is required for pathfinding.')
  })

  it('handles zero-weight edges', () => {
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2, 3], [
        { from: 1, to: 2, weight: 0 },
        { from: 2, to: 3, weight: 0 },
      ]),
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }],
      startNodeId: 1,
      endNodeId: 3,
    }

    const result = dijkstraAdapter.execute(input)

    expect(result.error).toBeUndefined()
    const pathNodes = result.resultEdges!.map(e => e.to)
    expect(pathNodes).toEqual([1, 2, 3])
  })

  it('works with larger graph', () => {
    // More complex graph
    //     2
    //    / \
    //   1   4
    //    \ /
    //     3
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2, 3, 4], [
        { from: 1, to: 2, weight: 1 },
        { from: 1, to: 3, weight: 4 },
        { from: 2, to: 4, weight: 2 },
        { from: 3, to: 4, weight: 1 },
      ]),
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
      startNodeId: 1,
      endNodeId: 4,
    }

    const result = dijkstraAdapter.execute(input)

    expect(result.error).toBeUndefined()
    // Shortest path: 1 -> 2 -> 4 (weight 3) vs 1 -> 3 -> 4 (weight 5)
    const pathNodes = result.resultEdges!.map(e => e.to)
    expect(pathNodes).toEqual([1, 2, 4])
  })
})
