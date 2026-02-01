import { describe, it, expect } from 'vitest'
import bellmanFordAdapter from './bellmanFord'
import { AlgorithmInput, StepType } from '../types'
import { createAdjacencyList } from './__tests__/testUtils'

describe('Bellman-Ford Algorithm', () => {
  it('has correct metadata', () => {
    expect(bellmanFordAdapter.metadata.id).toBe('bellman-ford')
    expect(bellmanFordAdapter.metadata.name).toBe('Bellman-Ford')
    expect(bellmanFordAdapter.metadata.type).toBe('pathfinding')
    expect(bellmanFordAdapter.metadata.requirements?.weighted).toBe(true)
    expect(bellmanFordAdapter.metadata.inputStepHints).toEqual([
      'Select the source node',
      'Now select the destination node',
    ])
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

    const result = bellmanFordAdapter.execute(input)

    expect(result.error).toBeUndefined()
    expect(result.resultEdges).toBeDefined()

    // Path should be 1 -> 2 -> 3
    const pathNodes = result.resultEdges!.map((e) => e.to)
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

    const result = bellmanFordAdapter.execute(input)

    expect(result.error).toBeUndefined()
    const pathNodes = result.resultEdges!.map((e) => e.to)
    expect(pathNodes).toEqual([1, 2, 3])
  })

  it('handles same start and end node', () => {
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2], [{ from: 1, to: 2, weight: 5 }]),
      nodes: [{ id: 1 }, { id: 2 }],
      startNodeId: 1,
      endNodeId: 1,
    }

    const result = bellmanFordAdapter.execute(input)

    expect(result.error).toBeUndefined()
    expect(result.resultEdges).toHaveLength(1)
    expect(result.resultEdges![0]).toEqual({ from: -1, to: 1 })
  })

  it('returns error when no path exists', () => {
    // Disconnected graph
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2, 3], [{ from: 1, to: 2, weight: 1 }]),
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }],
      startNodeId: 1,
      endNodeId: 3,
    }

    const result = bellmanFordAdapter.execute(input)

    expect(result.error).toBeDefined()
    expect(result.error).toContain('not possible')
  })

  it('returns error when endNodeId is missing', () => {
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2], [{ from: 1, to: 2, weight: 1 }]),
      nodes: [{ id: 1 }, { id: 2 }],
      startNodeId: 1,
    }

    const result = bellmanFordAdapter.execute(input)

    expect(result.error).toBeDefined()
    expect(result.error).toBe('End node is required for pathfinding.')
  })

  it('handles negative edge weights (key feature)', () => {
    // Graph: 1 --(5)--> 2 --(-2)--> 3
    // Total weight: 3
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2, 3], [
        { from: 1, to: 2, weight: 5 },
        { from: 2, to: 3, weight: -2 },
      ]),
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }],
      startNodeId: 1,
      endNodeId: 3,
    }

    const result = bellmanFordAdapter.execute(input)

    expect(result.error).toBeUndefined()
    expect(result.resultEdges).toBeDefined()
    const pathNodes = result.resultEdges!.map((e) => e.to)
    expect(pathNodes).toEqual([1, 2, 3])
  })

  it('finds shorter path using negative edges', () => {
    // Graph:
    //   1 --(4)--> 3
    //   1 --(10)--> 2 --(-8)--> 3
    // Direct: 4, via 2: 10 + (-8) = 2 (shorter!)
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2, 3], [
        { from: 1, to: 3, weight: 4 },
        { from: 1, to: 2, weight: 10 },
        { from: 2, to: 3, weight: -8 },
      ]),
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }],
      startNodeId: 1,
      endNodeId: 3,
    }

    const result = bellmanFordAdapter.execute(input)

    expect(result.error).toBeUndefined()
    // Should take the longer path 1 -> 2 -> 3 because total weight is smaller
    const pathNodes = result.resultEdges!.map((e) => e.to)
    expect(pathNodes).toEqual([1, 2, 3])
  })

  it('detects negative weight cycle', () => {
    // Graph: 1 --(1)--> 2 --(1)--> 3 --(-5)--> 1
    // Cycle: 1 -> 2 -> 3 -> 1 with total weight -3 (negative cycle)
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2, 3], [
        { from: 1, to: 2, weight: 1 },
        { from: 2, to: 3, weight: 1 },
        { from: 3, to: 1, weight: -5 },
      ]),
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }],
      startNodeId: 1,
      endNodeId: 3,
    }

    const result = bellmanFordAdapter.execute(input)

    expect(result.error).toBeDefined()
    expect(result.error).toContain('negative cycle')
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

    const result = bellmanFordAdapter.execute(input)

    expect(result.error).toBeUndefined()
    const pathNodes = result.resultEdges!.map((e) => e.to)
    expect(pathNodes).toEqual([1, 2, 3])
  })

  it('works with larger graph', () => {
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

    const result = bellmanFordAdapter.execute(input)

    expect(result.error).toBeUndefined()
    // Shortest path: 1 -> 2 -> 4 (weight 3) vs 1 -> 3 -> 4 (weight 5)
    const pathNodes = result.resultEdges!.map((e) => e.to)
    expect(pathNodes).toEqual([1, 2, 4])
  })

  describe('generator', () => {
    it('yields visit steps then result steps', () => {
      const input: AlgorithmInput = {
        adjacencyList: createAdjacencyList([1, 2, 3], [
          { from: 1, to: 2, weight: 2 },
          { from: 2, to: 3, weight: 3 },
        ]),
        nodes: [{ id: 1 }, { id: 2 }, { id: 3 }],
        startNodeId: 1,
        endNodeId: 3,
      }

      const steps = [...bellmanFordAdapter.generator!(input)]

      const visitSteps = steps.filter((s) => s.type === StepType.VISIT)
      const resultSteps = steps.filter((s) => s.type === StepType.RESULT)

      expect(visitSteps.length).toBeGreaterThan(0)
      expect(resultSteps.length).toBeGreaterThan(0)

      // All visit steps should come before result steps
      const visitIndices = steps
        .map((s, i) => (s.type === StepType.VISIT ? i : -1))
        .filter((i) => i !== -1)
      const lastVisitIndex = Math.max(...visitIndices)
      const firstResultIndex = steps.findIndex((s) => s.type === StepType.RESULT)
      expect(lastVisitIndex).toBeLessThan(firstResultIndex)
    })

    it('produces same result as execute()', () => {
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

      const executeResult = bellmanFordAdapter.execute(input)
      const generatorSteps = [...bellmanFordAdapter.generator!(input)]
      const genResultSteps = generatorSteps
        .filter((s) => s.type === StepType.RESULT)
        .map((s) => s.edge)

      expect(genResultSteps).toEqual(executeResult.resultEdges)
    })
  })
})
