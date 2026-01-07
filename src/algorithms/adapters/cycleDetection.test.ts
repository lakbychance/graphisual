import { describe, it, expect } from 'vitest'
import cycleDetectionAdapter from './cycleDetection'
import { AlgorithmInput, EdgeInfo } from '../types'

function createAdjacencyList(
  nodeIds: number[],
  edges: Array<{ from: number; to: number; type?: 'directed' | 'undirected' }>
): Map<number, EdgeInfo[]> {
  const adjacencyList = new Map<number, EdgeInfo[]>()

  for (const id of nodeIds) {
    adjacencyList.set(id, [])
  }

  for (const edge of edges) {
    const edgeType = edge.type ?? 'directed'
    const edgeInfo: EdgeInfo = {
      from: edge.from,
      to: edge.to,
      weight: 0,
      type: edgeType,
    }
    adjacencyList.get(edge.from)?.push(edgeInfo)

    if (edgeType === 'undirected') {
      adjacencyList.get(edge.to)?.push({
        from: edge.to,
        to: edge.from,
        weight: 0,
        type: 'undirected',
      })
    }
  }

  return adjacencyList
}

describe('Cycle Detection Algorithm', () => {
  it('has correct metadata', () => {
    expect(cycleDetectionAdapter.metadata.id).toBe('cycle-detection')
    expect(cycleDetectionAdapter.metadata.name).toBe('Cycle Detection')
    expect(cycleDetectionAdapter.metadata.type).toBe('traversal')
  })

  it('detects a simple cycle in directed graph', () => {
    // Graph: 1 -> 2 -> 3 -> 1 (cycle)
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2, 3], [
        { from: 1, to: 2, type: 'directed' },
        { from: 2, to: 3, type: 'directed' },
        { from: 3, to: 1, type: 'directed' },
      ]),
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }],
      startNodeId: 1,
    }

    const result = cycleDetectionAdapter.execute(input)

    expect(result.error).toBeUndefined()
    expect(result.resultEdges).toBeDefined()
    expect(result.resultEdges!.length).toBeGreaterThan(0)
  })

  it('reports no cycle in acyclic directed graph', () => {
    // Graph: 1 -> 2 -> 3 (no cycle)
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2, 3], [
        { from: 1, to: 2, type: 'directed' },
        { from: 2, to: 3, type: 'directed' },
      ]),
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }],
      startNodeId: 1,
    }

    const result = cycleDetectionAdapter.execute(input)

    expect(result.error).toBe('No cycle found in the graph.')
  })

  it('detects cycle in undirected graph', () => {
    // Triangle: 1 -- 2 -- 3 -- 1
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2, 3], [
        { from: 1, to: 2, type: 'undirected' },
        { from: 2, to: 3, type: 'undirected' },
        { from: 3, to: 1, type: 'undirected' },
      ]),
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }],
      startNodeId: 1,
    }

    const result = cycleDetectionAdapter.execute(input)

    expect(result.error).toBeUndefined()
    expect(result.resultEdges).toBeDefined()
  })

  it('reports no cycle for undirected line graph', () => {
    // Line: 1 -- 2 -- 3 (no cycle, just a path)
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2, 3], [
        { from: 1, to: 2, type: 'undirected' },
        { from: 2, to: 3, type: 'undirected' },
      ]),
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }],
      startNodeId: 1,
    }

    const result = cycleDetectionAdapter.execute(input)

    expect(result.error).toBe('No cycle found in the graph.')
  })

  it('handles single node without edges', () => {
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1], []),
      nodes: [{ id: 1 }],
      startNodeId: 1,
    }

    const result = cycleDetectionAdapter.execute(input)

    expect(result.error).toBe('No cycle found in the graph.')
  })

  it('detects self-loop as cycle', () => {
    // Graph: 1 -> 1 (self-loop)
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1], [
        { from: 1, to: 1, type: 'directed' },
      ]),
      nodes: [{ id: 1 }],
      startNodeId: 1,
    }

    const result = cycleDetectionAdapter.execute(input)

    expect(result.error).toBeUndefined()
    expect(result.resultEdges).toBeDefined()
  })

  it('finds cycle in disconnected component', () => {
    // 1 -> 2    3 -> 4 -> 3 (cycle in second component)
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2, 3, 4], [
        { from: 1, to: 2, type: 'directed' },
        { from: 3, to: 4, type: 'directed' },
        { from: 4, to: 3, type: 'directed' },
      ]),
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
      startNodeId: 1,
    }

    const result = cycleDetectionAdapter.execute(input)

    // Should find cycle in 3-4 component
    expect(result.error).toBeUndefined()
    expect(result.resultEdges).toBeDefined()
  })
})
