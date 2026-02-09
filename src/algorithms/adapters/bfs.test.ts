import { describe, it, expect } from 'vitest'
import bfsAdapter from './bfs'
import { AlgorithmInput } from '../types'
import { createAdjacencyList } from './__tests__/testUtils'

describe('BFS Algorithm', () => {
  it('has correct metadata', () => {
    expect(bfsAdapter.metadata.id).toBe('bfs')
    expect(bfsAdapter.metadata.name).toBe('BFS')
    expect(bfsAdapter.metadata.type).toBe('traversal')
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

    const result = bfsAdapter.execute(input)

    expect(result.visitedEdges).toHaveLength(3)
    expect(result.visitedEdges[0]).toEqual({ from: -1, to: 1 })
    expect(result.visitedEdges[1]).toEqual({ from: 1, to: 2 })
    expect(result.visitedEdges[2]).toEqual({ from: 2, to: 3 })
  })

  it('visits nodes in level order (breadth-first)', () => {
    // Graph:     1
    //          /   \
    //         2     3
    //        / \
    //       4   5
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2, 3, 4, 5], [
        { from: 1, to: 2 },
        { from: 1, to: 3 },
        { from: 2, to: 4 },
        { from: 2, to: 5 },
      ]),
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
      startNodeId: 1,
    }

    const result = bfsAdapter.execute(input)
    const visitedOrder = result.visitedEdges.map(e => e.to)

    // BFS should visit: 1 first, then 2 and 3 (level 1), then 4 and 5 (level 2)
    expect(visitedOrder[0]).toBe(1)
    expect(visitedOrder.indexOf(2)).toBeLessThan(visitedOrder.indexOf(4))
    expect(visitedOrder.indexOf(3)).toBeLessThan(visitedOrder.indexOf(4))
  })

  it('handles a single node graph', () => {
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1], []),
      nodes: [{ id: 1 }],
      startNodeId: 1,
    }

    const result = bfsAdapter.execute(input)

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

    const result = bfsAdapter.execute(input)
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

    const result = bfsAdapter.execute(input)

    // Should visit each node exactly once
    expect(result.visitedEdges).toHaveLength(3)
    const visitedNodes = result.visitedEdges.map(e => e.to)
    expect(new Set(visitedNodes).size).toBe(3) // All unique
  })

  it('handles graph with no edges', () => {
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2, 3], []),
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }],
      startNodeId: 1,
    }

    const result = bfsAdapter.execute(input)

    // Only start node is visited
    expect(result.visitedEdges).toHaveLength(1)
    expect(result.visitedEdges[0]).toEqual({ from: -1, to: 1 })
  })

  describe('generator', () => {
    it('produces same result as execute()', () => {
      const input: AlgorithmInput = {
        adjacencyList: createAdjacencyList([1, 2, 3, 4], [
          { from: 1, to: 2 },
          { from: 1, to: 3 },
          { from: 2, to: 4 },
        ]),
        nodes: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
        startNodeId: 1,
      }

      const executeResult = bfsAdapter.execute(input)
      const generatorSteps = [...bfsAdapter.generator!(input)]

      expect(generatorSteps.length).toBe(executeResult.visitedEdges.length)
      generatorSteps.forEach((step, i) => {
        expect(step.edge).toEqual(executeResult.visitedEdges[i])
      })
    })
  })
})
