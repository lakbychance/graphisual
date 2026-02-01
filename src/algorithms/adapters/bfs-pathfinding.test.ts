import { describe, it, expect } from 'vitest'
import bfsPathfindingAdapter from './bfs-pathfinding'
import { AlgorithmInput, EdgeInfo, StepType } from '../types'

// Helper to create adjacency list from edges
function createAdjacencyList(
  nodeIds: number[],
  edges: Array<{ from: number; to: number; weight?: number }>
): Map<number, EdgeInfo[]> {
  const adjacencyList = new Map<number, EdgeInfo[]>()

  // Initialize all nodes
  for (const id of nodeIds) {
    adjacencyList.set(id, [])
  }

  // Add edges
  for (const edge of edges) {
    const edgeInfo: EdgeInfo = {
      from: edge.from,
      to: edge.to,
      weight: edge.weight ?? 0,
      type: 'directed',
    }
    adjacencyList.get(edge.from)?.push(edgeInfo)
  }

  return adjacencyList
}

describe('BFS Pathfinding Algorithm', () => {
  it('has correct metadata', () => {
    expect(bfsPathfindingAdapter.metadata.id).toBe('bfs-pathfinding')
    expect(bfsPathfindingAdapter.metadata.name).toBe('BFS Path')
    expect(bfsPathfindingAdapter.metadata.type).toBe('pathfinding')
    expect(bfsPathfindingAdapter.metadata.inputStepHints).toEqual([
      'Select the source node',
      'Now select the destination node',
    ])
  })

  it('finds shortest path in a simple linear graph', () => {
    // Graph: 1 -> 2 -> 3
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2, 3], [
        { from: 1, to: 2 },
        { from: 2, to: 3 },
      ]),
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }],
      startNodeId: 1,
      endNodeId: 3,
    }

    const result = bfsPathfindingAdapter.execute(input)

    expect(result.resultEdges).toBeDefined()
    expect(result.resultEdges).toHaveLength(3)
    expect(result.resultEdges![0]).toEqual({ from: -1, to: 1 })
    expect(result.resultEdges![1]).toEqual({ from: 1, to: 2 })
    expect(result.resultEdges![2]).toEqual({ from: 2, to: 3 })
  })

  it('finds shortest path when multiple paths exist', () => {
    // Graph: 1 -> 2 -> 3 -> 5
    //        1 -> 4 -> 5 (shorter)
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2, 3, 4, 5], [
        { from: 1, to: 2 },
        { from: 2, to: 3 },
        { from: 3, to: 5 },
        { from: 1, to: 4 },
        { from: 4, to: 5 },
      ]),
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
      startNodeId: 1,
      endNodeId: 5,
    }

    const result = bfsPathfindingAdapter.execute(input)

    // BFS finds shortest path (by edge count): 1 -> 4 -> 5 (2 edges, not 3)
    expect(result.resultEdges).toBeDefined()
    // Path should be 1 -> 4 -> 5 (3 nodes including start marker)
    expect(result.resultEdges!.length).toBeLessThanOrEqual(3)
  })

  it('handles same start and end node', () => {
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2], [{ from: 1, to: 2 }]),
      nodes: [{ id: 1 }, { id: 2 }],
      startNodeId: 1,
      endNodeId: 1,
    }

    const result = bfsPathfindingAdapter.execute(input)

    expect(result.resultEdges).toBeDefined()
    expect(result.resultEdges).toHaveLength(1)
    expect(result.resultEdges![0]).toEqual({ from: -1, to: 1 })
  })

  it('returns error when no path exists', () => {
    // Graph: 1 -> 2    3 (disconnected)
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2, 3], [{ from: 1, to: 2 }]),
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }],
      startNodeId: 1,
      endNodeId: 3,
    }

    const result = bfsPathfindingAdapter.execute(input)

    expect(result.error).toBeDefined()
    expect(result.error).toContain('No path found')
  })

  it('returns error when end node is not provided', () => {
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2], [{ from: 1, to: 2 }]),
      nodes: [{ id: 1 }, { id: 2 }],
      startNodeId: 1,
    }

    const result = bfsPathfindingAdapter.execute(input)

    expect(result.error).toBeDefined()
    expect(result.error).toContain('End node is required')
  })

  it('handles cyclic graphs correctly', () => {
    // Graph: 1 -> 2 -> 3 -> 1 (cycle), 3 -> 4
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2, 3, 4], [
        { from: 1, to: 2 },
        { from: 2, to: 3 },
        { from: 3, to: 1 },
        { from: 3, to: 4 },
      ]),
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
      startNodeId: 1,
      endNodeId: 4,
    }

    const result = bfsPathfindingAdapter.execute(input)

    expect(result.resultEdges).toBeDefined()
    // Path: 1 -> 2 -> 3 -> 4
    expect(result.resultEdges!.length).toBe(4)
  })

  describe('generator', () => {
    it('yields visit steps then result steps', () => {
      const input: AlgorithmInput = {
        adjacencyList: createAdjacencyList([1, 2, 3], [
          { from: 1, to: 2 },
          { from: 2, to: 3 },
        ]),
        nodes: [{ id: 1 }, { id: 2 }, { id: 3 }],
        startNodeId: 1,
        endNodeId: 3,
      }

      const steps = [...bfsPathfindingAdapter.generator!(input)]

      // Should have visit steps followed by result steps
      const visitSteps = steps.filter((s) => s.type === StepType.VISIT)
      const resultSteps = steps.filter((s) => s.type === StepType.RESULT)

      expect(visitSteps.length).toBeGreaterThan(0)
      expect(resultSteps.length).toBeGreaterThan(0)

      // All visit steps should come before result steps
      const visitIndices = steps.map((s, i) => (s.type === StepType.VISIT ? i : -1)).filter(i => i !== -1)
      const lastVisitIndex = Math.max(...visitIndices)
      const firstResultIndex = steps.findIndex((s) => s.type === StepType.RESULT)
      expect(lastVisitIndex).toBeLessThan(firstResultIndex)
    })

    it('produces same result as execute()', () => {
      const input: AlgorithmInput = {
        adjacencyList: createAdjacencyList([1, 2, 3, 4], [
          { from: 1, to: 2 },
          { from: 1, to: 3 },
          { from: 2, to: 4 },
          { from: 3, to: 4 },
        ]),
        nodes: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
        startNodeId: 1,
        endNodeId: 4,
      }

      const executeResult = bfsPathfindingAdapter.execute(input)
      const generatorSteps = [...bfsPathfindingAdapter.generator!(input)]
      const genResultSteps = generatorSteps
        .filter((s) => s.type === StepType.RESULT)
        .map((s) => s.edge)

      expect(genResultSteps).toEqual(executeResult.resultEdges)
    })
  })
})
