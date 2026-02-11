import { describe, it, expect } from 'vitest'
import cycleDetectionAdapter from './cycleDetection'
import { AlgorithmInput } from '../types'
import { createAdjacencyList } from './__tests__/testUtils'

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

  it('no false cycle in mixed graph with undirected edges', () => {
    // Mixed: 1 -- 2 (undirected), 3 -> 4 (directed, no cycle)
    // The undirected edge should NOT cause a false positive
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2, 3, 4], [
        { from: 1, to: 2, type: 'undirected' },
        { from: 3, to: 4, type: 'directed' },
      ]),
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
      startNodeId: 1,
    }

    const result = cycleDetectionAdapter.execute(input)

    expect(result.error).toBe('No cycle found in the graph.')
  })

  it('detects real cycle in mixed graph', () => {
    // Mixed: 1 -- 2 (undirected), 3 -> 4 -> 3 (directed cycle)
    const input: AlgorithmInput = {
      adjacencyList: createAdjacencyList([1, 2, 3, 4], [
        { from: 1, to: 2, type: 'undirected' },
        { from: 3, to: 4, type: 'directed' },
        { from: 4, to: 3, type: 'directed' },
      ]),
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
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
