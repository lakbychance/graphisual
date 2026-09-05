import { describe, it, expect, beforeEach } from 'vitest'
import { useGraphStore } from './graphStore'
import { useGraphHistoryStore } from './graphHistoryStore'
import { VisualizationState, VisualizationMode, StepType } from '../constants/visualization'
import type { AlgorithmStep } from '../algorithms/types'

// Reset store before each test
beforeEach(() => {
  // Reset history store
  useGraphHistoryStore.setState({ past: [], future: [] })

  // Reset graph store
  useGraphStore.setState({
    data: {
      nodes: [],
      edges: new Map(),
      nodeCounter: 0,
      stackingOrder: new Set(),
    },
    visualization: {
      algorithm: { key: 'select', text: 'Select Algorithm' },
      trace: {
        nodes: new Map(),
        edges: new Map(),
      },
      state: VisualizationState.IDLE,
      input: null,
      speed: 400,
      mode: VisualizationMode.AUTO,
      step: { index: -1, history: [], isAutoPlaying: false },
    },
    selection: {
      nodeIds: new Set<number>(),
      edge: null,
      focusedEdge: null,
    },
    viewport: { zoom: 1, pan: { x: 0, y: 0 } },
  })
})

describe('graphStore', () => {
  describe('Node Operations', () => {
    it('addNode creates a node with correct coordinates', () => {
      const { addNode } = useGraphStore.getState()

      addNode(100, 200)

      const { data } = useGraphStore.getState()
      const { nodes, nodeCounter, edges } = data
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

      const { data } = useGraphStore.getState()
      const { nodes, nodeCounter } = data
      expect(nodes).toHaveLength(3)
      expect(nodeCounter).toBe(3)
      expect(nodes.map((n: { id: number }) => n.id)).toEqual([1, 2, 3])
    })

    it('deleteNode removes node and its edges', () => {
      const { addNode, deleteNode } = useGraphStore.getState()

      // Add two nodes
      addNode(0, 0)
      addNode(100, 100)

      // Get state and add edge manually for testing
      let state = useGraphStore.getState()
      const fromNode = state.data.nodes[0]
      const toNode = state.data.nodes[1]
      state.addEdge(fromNode, toNode)

      // Delete first node
      deleteNode(1)

      state = useGraphStore.getState()
      expect(state.data.nodes).toHaveLength(1)
      expect(state.data.nodes[0].id).toBe(2)
      expect(state.data.edges.has(1)).toBe(false)
    })

    it('selectNode updates selectedNodeIds', () => {
      const { addNode, selectNode } = useGraphStore.getState()

      addNode(0, 0)
      selectNode(1)

      expect(useGraphStore.getState().selection.nodeIds.has(1)).toBe(true)
      expect(useGraphStore.getState().selection.nodeIds.size).toBe(1)

      selectNode(null)
      expect(useGraphStore.getState().selection.nodeIds.size).toBe(0)
    })

    it('selectNodes updates selectedNodeIds with multiple nodes', () => {
      const { addNode, selectNodes } = useGraphStore.getState()

      addNode(0, 0)
      addNode(50, 50)
      addNode(100, 100)
      selectNodes([1, 2, 3])

      const nodeIds = useGraphStore.getState().selection.nodeIds
      expect(nodeIds.size).toBe(3)
      expect(nodeIds.has(1)).toBe(true)
      expect(nodeIds.has(2)).toBe(true)
      expect(nodeIds.has(3)).toBe(true)
    })

    it('deselectAllNodes clears selection', () => {
      const { addNode, selectNodes, deselectAllNodes } = useGraphStore.getState()

      addNode(0, 0)
      addNode(50, 50)
      selectNodes([1, 2])

      expect(useGraphStore.getState().selection.nodeIds.size).toBe(2)

      deselectAllNodes()

      expect(useGraphStore.getState().selection.nodeIds.size).toBe(0)
    })

    it('deleteNodes removes multiple nodes and their edges in single operation', () => {
      const { addNode, addEdge, deleteNodes } = useGraphStore.getState()

      addNode(0, 0)
      addNode(100, 100)
      addNode(200, 200)

      let state = useGraphStore.getState()
      addEdge(state.data.nodes[0], state.data.nodes[1])
      addEdge(state.data.nodes[1], state.data.nodes[2])

      deleteNodes([1, 2])

      state = useGraphStore.getState()
      expect(state.data.nodes).toHaveLength(1)
      expect(state.data.nodes[0].id).toBe(3)
      expect(state.data.edges.has(1)).toBe(false)
      expect(state.data.edges.has(2)).toBe(false)
    })

    it('deleteNodes is a single undo operation', () => {
      const { addNode, deleteNodes, undo } = useGraphStore.getState()

      addNode(0, 0)
      addNode(100, 100)
      addNode(200, 200)

      expect(useGraphStore.getState().data.nodes).toHaveLength(3)

      deleteNodes([1, 2, 3])

      expect(useGraphStore.getState().data.nodes).toHaveLength(0)

      // Single undo should restore all nodes
      undo()

      expect(useGraphStore.getState().data.nodes).toHaveLength(3)
    })

    it('moveNodes moves multiple nodes by delta', () => {
      const { addNode, moveNodes } = useGraphStore.getState()

      addNode(0, 0)
      addNode(100, 100)
      addNode(200, 200)

      moveNodes([1, 2], 50, 50)

      const state = useGraphStore.getState()
      const node1 = state.data.nodes.find(n => n.id === 1)
      const node2 = state.data.nodes.find(n => n.id === 2)
      const node3 = state.data.nodes.find(n => n.id === 3)

      expect(node1?.x).toBe(50)
      expect(node1?.y).toBe(50)
      expect(node2?.x).toBe(150)
      expect(node2?.y).toBe(150)
      // Node 3 should be unchanged
      expect(node3?.x).toBe(200)
      expect(node3?.y).toBe(200)
    })

    it('moveNodes updates edges correctly', () => {
      const { addNode, addEdge, moveNodes } = useGraphStore.getState()

      addNode(0, 0)
      addNode(100, 0)

      let state = useGraphStore.getState()
      addEdge(state.data.nodes[0], state.data.nodes[1])

      moveNodes([1], 50, 50)

      state = useGraphStore.getState()
      const edge = state.data.edges.get(1)?.[0]
      expect(edge?.x1).toBe(50)
      expect(edge?.y1).toBe(50)
    })

    it('bringNodesToFront moves selected nodes to top preserving relative order', () => {
      const { addNode, bringNodesToFront } = useGraphStore.getState()

      addNode(0, 0)   // id: 1
      addNode(50, 50) // id: 2
      addNode(100, 100) // id: 3
      addNode(150, 150) // id: 4
      addNode(200, 200) // id: 5

      // Initial stacking order: [1, 2, 3, 4, 5]
      let stackingOrder = [...useGraphStore.getState().data.stackingOrder]
      expect(stackingOrder).toEqual([1, 2, 3, 4, 5])

      // Bring nodes 2 and 4 to front
      bringNodesToFront([2, 4])

      // Expected: [1, 3, 5, 2, 4] - non-selected first, then selected (preserving relative order)
      stackingOrder = [...useGraphStore.getState().data.stackingOrder]
      expect(stackingOrder).toEqual([1, 3, 5, 2, 4])
    })

    it('bringNodesToFront handles single node', () => {
      const { addNode, bringNodesToFront } = useGraphStore.getState()

      addNode(0, 0)
      addNode(50, 50)
      addNode(100, 100)

      bringNodesToFront([1])

      const stackingOrder = [...useGraphStore.getState().data.stackingOrder]
      expect(stackingOrder).toEqual([2, 3, 1])
    })

    it('bringNodesToFront handles all nodes selected', () => {
      const { addNode, bringNodesToFront } = useGraphStore.getState()

      addNode(0, 0)
      addNode(50, 50)
      addNode(100, 100)

      bringNodesToFront([1, 2, 3])

      // Order should be unchanged since all are selected
      const stackingOrder = [...useGraphStore.getState().data.stackingOrder]
      expect(stackingOrder).toEqual([1, 2, 3])
    })
  })

  describe('Edge Operations', () => {
    it('addEdge creates edge between nodes', () => {
      const { addNode, addEdge } = useGraphStore.getState()

      addNode(0, 0)
      addNode(100, 100)

      const state = useGraphStore.getState()
      addEdge(state.data.nodes[0], state.data.nodes[1])

      const edges = useGraphStore.getState().data.edges
      const node1Edges = edges.get(1)
      expect(node1Edges).toHaveLength(1)
      expect(node1Edges![0].from).toBe(1)
      expect(node1Edges![0].to).toBe(2)
    })

    it('updateEdgeType toggles directed to undirected', () => {
      const { addNode, addEdge, updateEdgeType } = useGraphStore.getState()

      addNode(0, 0)
      addNode(100, 100)

      let state = useGraphStore.getState()
      addEdge(state.data.nodes[0], state.data.nodes[1])

      updateEdgeType(1, 2, 'undirected')

      state = useGraphStore.getState()
      const edge = state.data.edges.get(1)![0]
      expect(edge.type).toBe('undirected')

      // Should have reverse edge
      const reverseEdges = state.data.edges.get(2)
      expect(reverseEdges).toHaveLength(1)
      expect(reverseEdges![0].from).toBe(2)
      expect(reverseEdges![0].to).toBe(1)
    })

    it('deleteEdge removes edge', () => {
      const { addNode, addEdge, deleteEdge } = useGraphStore.getState()

      addNode(0, 0)
      addNode(100, 100)

      let state = useGraphStore.getState()
      addEdge(state.data.nodes[0], state.data.nodes[1])

      deleteEdge(1, 2)

      state = useGraphStore.getState()
      expect(state.data.edges.get(1)).toHaveLength(0)
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

      expect(useGraphStore.getState().data.nodes).toHaveLength(2)

      undo()

      expect(useGraphStore.getState().data.nodes).toHaveLength(1)
    })

    it('redo restores undone action', () => {
      const { addNode, undo, redo } = useGraphStore.getState()

      addNode(0, 0)
      addNode(100, 100)

      undo()
      expect(useGraphStore.getState().data.nodes).toHaveLength(1)

      redo()
      expect(useGraphStore.getState().data.nodes).toHaveLength(2)
    })

    it('canRedo returns true after undo', () => {
      const { addNode, undo } = useGraphStore.getState()

      addNode(0, 0)
      expect(useGraphStore.getState().canRedo()).toBe(false)

      undo()
      expect(useGraphStore.getState().canRedo()).toBe(true)
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

    it('setVisualizationAlgorithm after a finished run clears the old highlights', () => {
      const { startVisualization, jumpToStep, finishVisualization, setVisualizationAlgorithm } = useGraphStore.getState()
      startVisualization([{ type: StepType.VISIT, edge: { from: -1, to: 1 } }])
      jumpToStep(0)
      finishVisualization()
      expect(useGraphStore.getState().visualization.trace.nodes.size).toBe(1)

      setVisualizationAlgorithm({ key: 'bfs', text: 'BFS' })

      const { visualization } = useGraphStore.getState()
      expect(visualization.trace.nodes.size).toBe(0)
      expect(visualization.state).toBe(VisualizationState.IDLE)
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

  describe('Visualization Run', () => {
    // Graph: 1 -> 2 (directed), 2 -- 3 (undirected)
    const setupGraph = () => {
      const { addNode, addEdge, updateEdgeType } = useGraphStore.getState()
      addNode(100, 100)
      addNode(200, 200)
      addNode(300, 300)
      const { nodes } = useGraphStore.getState().data
      addEdge(nodes[0], nodes[1])
      addEdge(nodes[1], nodes[2])
      updateEdgeType(2, 3, 'undirected')
    }

    const steps: AlgorithmStep[] = [
      { type: StepType.VISIT, edge: { from: -1, to: 1 } },
      { type: StepType.VISIT, edge: { from: 1, to: 2 } },
      { type: StepType.VISIT, edge: { from: 2, to: 3 } },
      { type: StepType.RESULT, edge: { from: 1, to: 2 } },
    ]

    it('startVisualization stores steps with nothing applied yet', () => {
      setupGraph()
      useGraphStore.getState().startVisualization(steps)

      const { visualization } = useGraphStore.getState()
      expect(visualization.state).toBe(VisualizationState.RUNNING)
      expect(visualization.step.index).toBe(-1)
      expect(visualization.step.history).toBe(steps)
      expect(visualization.trace.nodes.size).toBe(0)
    })

    it('stepForward highlights the target node and edge', () => {
      setupGraph()
      const { startVisualization, stepForward } = useGraphStore.getState()
      startVisualization(steps)

      stepForward()
      expect(useGraphStore.getState().visualization.trace.nodes.get(1)?.isVisited).toBe(true)
      expect(useGraphStore.getState().visualization.trace.edges.size).toBe(0) // root step has no edge

      stepForward()
      const { trace } = useGraphStore.getState().visualization
      expect(trace.nodes.get(2)?.isVisited).toBe(true)
      expect(trace.edges.get('1-2')?.isUsedInTraversal).toBe(true)
      expect(trace.edges.has('2-1')).toBe(false) // directed: no reverse
    })

    it('undirected edges are highlighted in both directions', () => {
      setupGraph()
      const { startVisualization, jumpToStep } = useGraphStore.getState()
      startVisualization(steps)
      jumpToStep(2)

      const { trace } = useGraphStore.getState().visualization
      expect(trace.edges.get('2-3')?.isUsedInTraversal).toBe(true)
      expect(trace.edges.get('3-2')?.isUsedInTraversal).toBe(true)
    })

    it('result steps add path flags on top of visited flags', () => {
      setupGraph()
      const { startVisualization, jumpToStep } = useGraphStore.getState()
      startVisualization(steps)
      jumpToStep(3)

      const { trace } = useGraphStore.getState().visualization
      expect(trace.nodes.get(2)).toEqual({ isVisited: true, isInShortestPath: true })
      expect(trace.edges.get('1-2')).toEqual({ isUsedInTraversal: true, isUsedInShortestPath: true })
    })

    it('stepBackward removes highlights again', () => {
      setupGraph()
      const { startVisualization, jumpToStep, stepBackward } = useGraphStore.getState()
      startVisualization(steps)
      jumpToStep(2)
      stepBackward()

      const { step, trace } = useGraphStore.getState().visualization
      expect(step.index).toBe(1)
      expect(trace.nodes.has(3)).toBe(false)
      expect(trace.edges.has('2-3')).toBe(false)
    })

    it('stepForward stops at the last step and turns off auto-play there', () => {
      setupGraph()
      const { startVisualization, startAutoPlay, stepForward } = useGraphStore.getState()
      startVisualization(steps)
      startAutoPlay()
      steps.forEach(() => stepForward())
      stepForward()

      const { step } = useGraphStore.getState().visualization
      expect(step.index).toBe(steps.length - 1)
      expect(step.isAutoPlaying).toBe(false)
    })

    it('jumpToStep clamps out-of-range indices to the history bounds', () => {
      setupGraph()
      const { startVisualization, jumpToStep } = useGraphStore.getState()
      startVisualization(steps)

      jumpToStep(99)
      expect(useGraphStore.getState().visualization.step.index).toBe(steps.length - 1)
      expect(useGraphStore.getState().visualization.trace.nodes.size).toBe(3)

      jumpToStep(-5)
      expect(useGraphStore.getState().visualization.step.index).toBe(-1)
      expect(useGraphStore.getState().visualization.trace.nodes.size).toBe(0)
    })

    it('finishVisualization ends the run but keeps highlights', () => {
      setupGraph()
      const { startVisualization, jumpToStep, finishVisualization } = useGraphStore.getState()
      startVisualization(steps)
      jumpToStep(3)
      finishVisualization()

      const { visualization } = useGraphStore.getState()
      expect(visualization.state).toBe(VisualizationState.DONE)
      expect(visualization.algorithm).toEqual({ key: 'select', text: 'Select Algorithm' })
      expect(visualization.step.history).toHaveLength(0)
      expect(visualization.trace.nodes.size).toBe(3)
    })

    it('clearVisualization removes highlights and step history', () => {
      setupGraph()
      const { startVisualization, jumpToStep, clearVisualization } = useGraphStore.getState()
      startVisualization(steps)
      jumpToStep(3)
      clearVisualization()

      const { visualization } = useGraphStore.getState()
      expect(visualization.state).toBe(VisualizationState.IDLE)
      expect(visualization.step.history).toHaveLength(0)
      expect(visualization.trace.nodes.size).toBe(0)
      expect(visualization.trace.edges.size).toBe(0)
    })

    it('highlights live in trace maps, not on graph data', () => {
      setupGraph()
      const originalNode = useGraphStore.getState().data.nodes[0]
      const originalEdge = useGraphStore.getState().data.edges.get(1)?.[0]

      const { startVisualization, jumpToStep } = useGraphStore.getState()
      startVisualization(steps)
      jumpToStep(3)

      const { data } = useGraphStore.getState()
      expect(data.nodes[0]).toBe(originalNode)
      expect(data.edges.get(1)?.[0]).toBe(originalEdge)
    })
  })
})

