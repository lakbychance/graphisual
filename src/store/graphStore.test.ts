import { describe, it, expect, beforeEach } from 'vitest'
import { useGraphStore } from './graphStore'

// Reset store before each test
beforeEach(() => {
  useGraphStore.setState({
    nodes: [],
    edges: new Map(),
    nodeCounter: 0,
    past: [],
    future: [],
    selectedNodeId: null,
    selectedEdgeForEdit: null,
    selectedAlgo: { key: 'select', text: 'Select Algorithm' },
    nodeSelection: { isStartNodeSelected: false, isEndNodeSelected: false },
    pathFindingNode: null,
    isVisualizing: false,
    isVisualizationDone: false,
    visualizationSpeed: 400,
    zoom: 1,
    pan: { x: 0, y: 0 },
    stepMode: 'auto',
    stepIndex: -1,
    stepHistory: [],
    isStepComplete: false,
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
      expect(state.past).toHaveLength(0)
      expect(state.future).toHaveLength(0)
    })
  })

  describe('Algorithm State', () => {
    it('setAlgorithm updates selectedAlgo', () => {
      const { setAlgorithm } = useGraphStore.getState()

      setAlgorithm({ key: 'bfs', text: 'BFS' })

      expect(useGraphStore.getState().selectedAlgo).toEqual({ key: 'bfs', text: 'BFS' })
    })

    it('setAlgorithm resets pathFindingNode', () => {
      useGraphStore.setState({ pathFindingNode: { startNodeId: 1, endNodeId: 2 } })

      const { setAlgorithm } = useGraphStore.getState()
      setAlgorithm({ key: 'dfs', text: 'DFS' })

      expect(useGraphStore.getState().pathFindingNode).toBe(null)
    })

    it('setVisualizing updates isVisualizing', () => {
      const { setVisualizing } = useGraphStore.getState()

      setVisualizing(true)
      expect(useGraphStore.getState().isVisualizing).toBe(true)

      setVisualizing(false)
      expect(useGraphStore.getState().isVisualizing).toBe(false)
    })

    it('resetAlgorithmState resets to defaults', () => {
      const { setAlgorithm, resetAlgorithmState } = useGraphStore.getState()

      setAlgorithm({ key: 'bfs', text: 'BFS' })
      useGraphStore.setState({ pathFindingNode: { startNodeId: 1, endNodeId: 2 } })

      resetAlgorithmState()

      const state = useGraphStore.getState()
      expect(state.selectedAlgo).toEqual({ key: 'select', text: 'Select Algorithm' })
      expect(state.pathFindingNode).toBe(null)
    })
  })

  describe('UI State', () => {
    it('setZoom updates zoom level', () => {
      const { setZoom } = useGraphStore.getState()

      setZoom(1.5)
      expect(useGraphStore.getState().zoom).toBe(1.5)

      setZoom(0.5)
      expect(useGraphStore.getState().zoom).toBe(0.5)
    })

    it('setVisualizationSpeed updates speed', () => {
      const { setVisualizationSpeed } = useGraphStore.getState()

      setVisualizationSpeed(200)
      expect(useGraphStore.getState().visualizationSpeed).toBe(200)
    })
  })
})
