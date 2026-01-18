import { describe, it, expect, beforeEach } from 'vitest'
import { useGraphStore } from './graphStore'
import { useGraphHistoryStore } from './graphHistoryStore'

// Reset store before each test
beforeEach(() => {
  // Reset history store
  useGraphHistoryStore.setState({ past: [], future: [] })

  // Reset graph store
  useGraphStore.setState({
    nodes: [],
    edges: new Map(),
    nodeCounter: 0,
    visualization: {
      algorithm: { key: 'select', text: 'Select Algorithm' },
      trace: {
        nodes: new Map(),
        edges: new Map(),
      },
      state: 'idle',
      input: null,
      speed: 400,
      mode: 'auto',
    },
    selectedNodeId: null,
    selectedEdgeForEdit: null,
    viewport: { zoom: 1, pan: { x: 0, y: 0 } },
  })
})

describe('graphStore', () => {
  describe('Node Operations', () => {
    it('addNode creates a node with correct coordinates', () => {
      const { addNode } = useGraphStore.getState()

      addNode(100, 200)

      const { nodes, nodeCounter, edges } = useGraphStore.getState()
      expect(nodes).toHaveLength(1)
      expect(nodes[0].x).toBe(100)
      expect(nodes[0].y).toBe(200)
      expect(nodes[0].id).toBe(1)
      expect(nodeCounter).toBe(1)
      expect(edges.has(1)).toBe(true)
    })

    it('addNode increments nodeCounter correctly', () => {
      const { addNode } = useGraphStore.getState()

      addNode(0, 0)
      addNode(50, 50)
      addNode(100, 100)

      const { nodes, nodeCounter } = useGraphStore.getState()
      expect(nodes).toHaveLength(3)
      expect(nodeCounter).toBe(3)
      expect(nodes.map(n => n.id)).toEqual([1, 2, 3])
    })

    it('deleteNode removes node and its edges', () => {
      const { addNode, deleteNode } = useGraphStore.getState()

      // Add two nodes
      addNode(0, 0)
      addNode(100, 100)

      // Get state and add edge manually for testing
      let state = useGraphStore.getState()
      const fromNode = state.nodes[0]
      const toNode = state.nodes[1]
      state.addEdge(fromNode, toNode)

      // Delete first node
      deleteNode(1)

      state = useGraphStore.getState()
      expect(state.nodes).toHaveLength(1)
      expect(state.nodes[0].id).toBe(2)
      expect(state.edges.has(1)).toBe(false)
    })

    it('selectNode updates selectedNodeId', () => {
      const { addNode, selectNode } = useGraphStore.getState()

      addNode(0, 0)
      selectNode(1)

      expect(useGraphStore.getState().selectedNodeId).toBe(1)

      selectNode(null)
      expect(useGraphStore.getState().selectedNodeId).toBe(null)
    })
  })

  describe('Edge Operations', () => {
    it('addEdge creates edge between nodes', () => {
      const { addNode, addEdge } = useGraphStore.getState()

      addNode(0, 0)
      addNode(100, 100)

      const state = useGraphStore.getState()
      addEdge(state.nodes[0], state.nodes[1])

      const edges = useGraphStore.getState().edges
      const node1Edges = edges.get(1)
      expect(node1Edges).toHaveLength(1)
      expect(node1Edges![0].from).toBe('1')
      expect(node1Edges![0].to).toBe('2')
    })

    it('updateEdgeType toggles directed to undirected', () => {
      const { addNode, addEdge, updateEdgeType } = useGraphStore.getState()

      addNode(0, 0)
      addNode(100, 100)

      let state = useGraphStore.getState()
      addEdge(state.nodes[0], state.nodes[1])

      updateEdgeType(1, 2, 'undirected')

      state = useGraphStore.getState()
      const edge = state.edges.get(1)![0]
      expect(edge.type).toBe('undirected')

      // Should have reverse edge
      const reverseEdges = state.edges.get(2)
      expect(reverseEdges).toHaveLength(1)
      expect(reverseEdges![0].from).toBe('2')
      expect(reverseEdges![0].to).toBe('1')
    })

    it('deleteEdge removes edge', () => {
      const { addNode, addEdge, deleteEdge } = useGraphStore.getState()

      addNode(0, 0)
      addNode(100, 100)

      let state = useGraphStore.getState()
      addEdge(state.nodes[0], state.nodes[1])

      deleteEdge(1, 2)

      state = useGraphStore.getState()
      expect(state.edges.get(1)).toHaveLength(0)
    })
  })

  describe('History Operations', () => {
    it('canUndo returns false when no history', () => {
      expect(useGraphStore.getState().canUndo()).toBe(false)
    })

    it('canUndo returns true after action', () => {
      const { addNode } = useGraphStore.getState()
      addNode(0, 0)
      expect(useGraphStore.getState().canUndo()).toBe(true)
    })

    it('undo reverts to previous state', () => {
      const { addNode, undo } = useGraphStore.getState()

      addNode(0, 0)
      addNode(100, 100)

      expect(useGraphStore.getState().nodes).toHaveLength(2)

      undo()

      expect(useGraphStore.getState().nodes).toHaveLength(1)
    })

    it('redo restores undone action', () => {
      const { addNode, undo, redo } = useGraphStore.getState()

      addNode(0, 0)
      addNode(100, 100)

      undo()
      expect(useGraphStore.getState().nodes).toHaveLength(1)

      redo()
      expect(useGraphStore.getState().nodes).toHaveLength(2)
    })

    it('canRedo returns true after undo', () => {
      const { addNode, undo } = useGraphStore.getState()

      addNode(0, 0)
      expect(useGraphStore.getState().canRedo()).toBe(false)

      undo()
      expect(useGraphStore.getState().canRedo()).toBe(true)
    })

    it('resetGraph clears all state', () => {
      const { addNode, resetGraph } = useGraphStore.getState()

      addNode(0, 0)
      addNode(100, 100)

      resetGraph()

      const state = useGraphStore.getState()
      expect(state.nodes).toHaveLength(0)
      expect(state.edges.size).toBe(0)

      // History is now in the history store
      const historyState = useGraphHistoryStore.getState()
      expect(historyState.past).toHaveLength(0)
      expect(historyState.future).toHaveLength(0)
    })
  })

  describe('Visualization State', () => {
    it('setVisualizationAlgorithm updates algorithm', () => {
      const { setVisualizationAlgorithm } = useGraphStore.getState()

      setVisualizationAlgorithm({ key: 'bfs', text: 'BFS' })

      expect(useGraphStore.getState().visualization.algorithm).toEqual({ key: 'bfs', text: 'BFS' })
    })

    it('setVisualizationAlgorithm resets input', () => {
      const { visualization } = useGraphStore.getState()
      useGraphStore.setState({
        visualization: { ...visualization, input: { startNodeId: 1, endNodeId: 2 } }
      })

      const { setVisualizationAlgorithm } = useGraphStore.getState()
      setVisualizationAlgorithm({ key: 'dfs', text: 'DFS' })

      expect(useGraphStore.getState().visualization.input).toBe(null)
    })

    it('setVisualizationState updates state', () => {
      const { setVisualizationState } = useGraphStore.getState()

      setVisualizationState('running')
      expect(useGraphStore.getState().visualization.state).toBe('running')

      setVisualizationState('done')
      expect(useGraphStore.getState().visualization.state).toBe('done')

      setVisualizationState('idle')
      expect(useGraphStore.getState().visualization.state).toBe('idle')
    })

    it('resetVisualization resets to defaults', () => {
      const { setVisualizationAlgorithm, resetVisualization, visualization } = useGraphStore.getState()

      setVisualizationAlgorithm({ key: 'bfs', text: 'BFS' })
      useGraphStore.setState({
        visualization: { ...visualization, input: { startNodeId: 1, endNodeId: 2 } }
      })

      resetVisualization()

      const state = useGraphStore.getState()
      expect(state.visualization.algorithm).toEqual({ key: 'select', text: 'Select Algorithm' })
      expect(state.visualization.input).toBe(null)
    })
  })

  describe('UI State', () => {
    it('setViewportZoom updates zoom level', () => {
      const { setViewportZoom } = useGraphStore.getState()

      setViewportZoom(1.5)
      expect(useGraphStore.getState().viewport.zoom).toBe(1.5)

      setViewportZoom(0.5)
      expect(useGraphStore.getState().viewport.zoom).toBe(0.5)
    })

    it('setVisualizationSpeed updates speed', () => {
      const { setVisualizationSpeed } = useGraphStore.getState()

      setVisualizationSpeed(200)
      expect(useGraphStore.getState().visualization.speed).toBe(200)
    })
  })

  describe('Trace Maps', () => {
    it('setTraceNode sets flags for a node', () => {
      const { addNode, setTraceNode } = useGraphStore.getState()
      addNode(100, 100)

      setTraceNode(1, { isVisited: true })

      const { visualization } = useGraphStore.getState()
      expect(visualization.trace.nodes.get(1)?.isVisited).toBe(true)
    })

    it('setTraceEdge sets flags for an edge', () => {
      const { addNode, addEdge, setTraceEdge } = useGraphStore.getState()
      addNode(100, 100)
      addNode(200, 200)
      const state = useGraphStore.getState()
      addEdge(state.nodes[0], state.nodes[1])

      setTraceEdge(1, 2, { isUsedInTraversal: true })

      const { visualization } = useGraphStore.getState()
      expect(visualization.trace.edges.get('1-2')?.isUsedInTraversal).toBe(true)
    })

    it('clearVisualization clears all trace state', () => {
      const { addNode, setTraceNode, setTraceEdge, clearVisualization } = useGraphStore.getState()
      addNode(100, 100)
      addNode(200, 200)

      setTraceNode(1, { isVisited: true })
      setTraceNode(2, { isInShortestPath: true })
      setTraceEdge(1, 2, { isUsedInTraversal: true })

      expect(useGraphStore.getState().visualization.trace.nodes.size).toBe(2)
      expect(useGraphStore.getState().visualization.trace.edges.size).toBe(1)

      clearVisualization()

      const state = useGraphStore.getState()
      expect(state.visualization.trace.nodes.size).toBe(0)
      expect(state.visualization.trace.edges.size).toBe(0)
      expect(state.visualization.state).toBe('idle')
    })

    it('trace maps are separate from graph data', () => {
      const { addNode, addEdge, setTraceNode, setTraceEdge } = useGraphStore.getState()
      addNode(100, 100)
      addNode(200, 200)
      const state = useGraphStore.getState()
      addEdge(state.nodes[0], state.nodes[1])

      // Get original references
      const originalNode = useGraphStore.getState().nodes[0]
      const originalEdge = useGraphStore.getState().edges.get(1)?.[0]

      // Set visualization flags
      setTraceNode(1, { isVisited: true })
      setTraceEdge(1, 2, { isUsedInTraversal: true })

      // Node and edge objects should be unchanged
      const newState = useGraphStore.getState()
      expect(newState.nodes[0]).toBe(originalNode)
      expect(newState.edges.get(1)?.[0]).toBe(originalEdge)

      // Visualization flags are in trace maps
      expect(newState.visualization.trace.nodes.get(1)?.isVisited).toBe(true)
      expect(newState.visualization.trace.edges.get('1-2')?.isUsedInTraversal).toBe(true)
    })
  })
})
