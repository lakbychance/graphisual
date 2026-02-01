import { describe, it, expect } from 'vitest'
import dfsAdapter from './dfs'
import { AlgorithmInput } from '../types'
import { createAdjacencyList } from './__tests__/testUtils'

describe('DFS Algorithm', () => {
  it('has correct metadata', () => {
    expect(dfsAdapter.metadata.id).toBe('dfs')
    expect(dfsAdapter.metadata.name).toBe('DFS')
    expect(dfsAdapter.metadata.type).toBe('traversal')
  })

  it('traverses a simple linear graph', () => {
    // Graph: 1 -> 2 -> 3
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2, 3], [
        { from: 1, to: 2 },
        { from: 2, to: 3 },
      ]),
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }],
      startNodeId: 1,
    }

    const result = dfsAdapter.execute(input)

    expect(result.visitedEdges).toHaveLength(3)
    expect(result.visitedEdges[0]).toEqual({ from: -1, to: 1 })
    expect(result.visitedEdges[1]).toEqual({ from: 1, to: 2 })
    expect(result.visitedEdges[2]).toEqual({ from: 2, to: 3 })
  })

  it('goes deep before going wide (depth-first)', () => {
    // Graph:     1
    //          /   \
    //         2     3
    //        /
    //       4
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2, 3, 4], [
        { from: 1, to: 2 },
        { from: 1, to: 3 },
        { from: 2, to: 4 },
      ]),
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
      startNodeId: 1,
    }

    const result = dfsAdapter.execute(input)
    const visitedOrder = result.visitedEdges.map(e => e.to)

    // DFS should go deep: 1 -> 2 -> 4 before visiting 3
    expect(visitedOrder[0]).toBe(1)
    // 4 should be visited before 3 (depth-first)
    expect(visitedOrder.indexOf(4)).toBeLessThan(visitedOrder.indexOf(3))
  })

  it('handles a single node graph', () => {
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1], []),
      nodes: [{ id: 1 }],
      startNodeId: 1,
    }

    const result = dfsAdapter.execute(input)

    expect(result.visitedEdges).toHaveLength(1)
    expect(result.visitedEdges[0]).toEqual({ from: -1, to: 1 })
  })

  it('handles disconnected graphs (only visits reachable nodes)', () => {
    // Graph: 1 -> 2    3 -> 4 (disconnected)
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2, 3, 4], [
        { from: 1, to: 2 },
        { from: 3, to: 4 },
      ]),
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
      startNodeId: 1,
    }

    const result = dfsAdapter.execute(input)
    const visitedNodes = result.visitedEdges.map(e => e.to)

    expect(visitedNodes).toContain(1)
    expect(visitedNodes).toContain(2)
    expect(visitedNodes).not.toContain(3)
    expect(visitedNodes).not.toContain(4)
  })

  it('handles cyclic graphs without infinite loop', () => {
    // Graph: 1 -> 2 -> 3 -> 1 (cycle)
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2, 3], [
        { from: 1, to: 2 },
        { from: 2, to: 3 },
        { from: 3, to: 1 },
      ]),
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }],
      startNodeId: 1,
    }

    const result = dfsAdapter.execute(input)

    // Should visit each node exactly once
    expect(result.visitedEdges).toHaveLength(3)
    const visitedNodes = result.visitedEdges.map(e => e.to)
    expect(new Set(visitedNodes).size).toBe(3)
  })

  it('handles graph with no edges', () => {
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2, 3], []),
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }],
      startNodeId: 1,
    }

    const result = dfsAdapter.execute(input)

    expect(result.visitedEdges).toHaveLength(1)
    expect(result.visitedEdges[0]).toEqual({ from: -1, to: 1 })
  })
})
