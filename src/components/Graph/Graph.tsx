import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Node } from "../Graph/Node/Node";
import { findToNodeForTouchBasedDevices } from "../../utility/calc";
import { DRAG_THRESHOLD, TIMING } from "../../utility/constants";
import { hasNegativeWeights, ALGORITHMS_NO_NEGATIVE_WEIGHTS } from "../../utility/graphUtils";
import { INode, IEdge, GraphSnapshot } from "./IGraph";
import { algorithmRegistry, AlgorithmType, EdgeInfo, AlgorithmStep } from "../../algorithms";
import { EdgePopup } from "./EdgePopup";
import { toast } from "sonner";
import { useGraphStore, selectStepIndex, selectStepHistory } from "../../store/graphStore";
import { useGraphHistoryStore } from "../../store/graphHistoryStore";
import { useShallow } from "zustand/shallow";
import { debounce } from "../../utility/debounce";
import { CanvasDefs } from "./defs/CanvasDefs";
import { NodeDefs } from "./defs/NodeDefs";
import { EdgeDefs } from "./defs/EdgeDefs";
import { GridBackground } from "./GridBackground";
import { DragPreviewEdge } from "./DragPreviewEdge";

export const Graph = () => {
  // Get state from store
  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  // Subscribe to node IDs only for rendering - prevents re-renders when node positions change
  const nodeIds = useGraphStore(
    useShallow((state) => state.nodes.map((n) => n.id))
  );
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId);
  const selectedEdgeForEdit = useGraphStore((state) => state.selectedEdgeForEdit);
  const visualizationAlgorithm = useGraphStore((state) => state.visualization.algorithm);
  const visualizationInput = useGraphStore((state) => state.visualization.input);
  const visualizationState = useGraphStore((state) => state.visualization.state);
  const visualizationSpeed = useGraphStore((state) => state.visualization.speed);

  // Derive boolean for simpler component logic and Node prop
  const isVisualizing = visualizationState === 'running';
  const zoom = useGraphStore((state) => state.viewport.zoom);
  const pan = useGraphStore((state) => state.viewport.pan);
  const visualizationMode = useGraphStore((state) => state.visualization.mode);
  const stepIndex = useGraphStore(selectStepIndex);
  const stepHistory = useGraphStore(selectStepHistory);

  const addNode = useGraphStore((state) => state.addNode);
  const moveNode = useGraphStore((state) => state.moveNode);
  const addEdge = useGraphStore((state) => state.addEdge);
  const selectNode = useGraphStore((state) => state.selectNode);
  const selectEdgeForEdit = useGraphStore((state) => state.selectEdgeForEdit);
  const clearEdgeSelection = useGraphStore((state) => state.clearEdgeSelection);
  const setVisualizationInput = useGraphStore((state) => state.setVisualizationInput);
  const setVisualizationState = useGraphStore((state) => state.setVisualizationState);
  const resetVisualization = useGraphStore((state) => state.resetVisualization);
  const updateEdgeTypeAction = useGraphStore((state) => state.updateEdgeType);
  const updateEdgeWeightAction = useGraphStore((state) => state.updateEdgeWeight);
  const reverseEdgeAction = useGraphStore((state) => state.reverseEdge);
  const deleteEdgeAction = useGraphStore((state) => state.deleteEdge);
  const setViewportPan = useGraphStore((state) => state.setViewportPan);
  const initStepThrough = useGraphStore((state) => state.initStepThrough);

  // Local UI state (not shared with other components)
  const [mockEdge, setMockEdge] = useState<IEdge | null>(null);
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });

  // Refs
  const graph = useRef<SVGSVGElement | null>(null);
  const isDraggingEdge = useRef(false);
  const justClosedPopup = useRef(false);
  const isDraggingCanvas = useRef(false);
  const dragStartSnapshot = useRef<GraphSnapshot | null>(null);

  // Refs to track latest state during visualization (for setTimeout callbacks)
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  // Helper to create a snapshot for history
  const createSnapshot = useCallback((
    newNodes: INode[],
    newEdges: Map<number, IEdge[]>,
    newNodeCounter: number
  ): GraphSnapshot => ({
    nodes: newNodes,
    edges: Array.from(newEdges.entries()).map(([k, v]) => [k, v || []]),
    nodeCounter: newNodeCounter,
  }), []);

  // Debounced function to record drag start state to history
  const debouncedRecordDrag = useMemo(
    () => debounce(() => {
      if (dragStartSnapshot.current) {
        useGraphHistoryStore.getState().push(dragStartSnapshot.current);
        dragStartSnapshot.current = null;
      }
    }, TIMING.DEBOUNCE),
    []
  );

  // Update SVG dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (graph.current) {
        const rect = graph.current.getBoundingClientRect();
        setSvgDimensions({ width: rect.width, height: rect.height });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Calculate viewBox based on zoom and pan
  const viewBox = useMemo(() => {
    if (svgDimensions.width === 0 || svgDimensions.height === 0) return undefined;
    const viewBoxWidth = svgDimensions.width / zoom;
    const viewBoxHeight = svgDimensions.height / zoom;
    // Center the view and apply pan offset (subtract pan to move view opposite to drag direction)
    const viewBoxMinX = (svgDimensions.width - viewBoxWidth) / 2 - pan.x;
    const viewBoxMinY = (svgDimensions.height - viewBoxHeight) / 2 - pan.y;
    return `${viewBoxMinX} ${viewBoxMinY} ${viewBoxWidth} ${viewBoxHeight}`;
  }, [svgDimensions, zoom, pan]);

  // Convert screen coordinates to SVG coordinates
  const screenToSvgCoords = useCallback((clientX: number, clientY: number) => {
    if (!graph.current) return { x: 0, y: 0 };
    const point = graph.current.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const ctm = graph.current.getScreenCTM()?.inverse();
    if (!ctm) return { x: 0, y: 0 };
    const svgPoint = point.matrixTransform(ctm);
    return { x: svgPoint.x, y: svgPoint.y };
  }, []);

  // Get the current algorithm from registry
  const currentAlgorithm = visualizationAlgorithm?.key
    ? algorithmRegistry.get(visualizationAlgorithm.key)
    : undefined;

  // Prevent touch scroll on SVG
  useEffect(() => {
    const graphEl = graph.current;
    if (graphEl) {
      const preventTouch = (e: TouchEvent) => e.preventDefault();
      graphEl.addEventListener("touchmove", preventTouch);
      return () => graphEl.removeEventListener("touchmove", preventTouch);
    }
  }, []);

  // Apply step-through visualization when stepIndex changes
  useEffect(() => {
    if (visualizationMode !== 'manual' || stepHistory.length === 0) return;

    // Clear all visualization and rebuild from scratch
    const { clearVisualization: clearVis, setTraceNode, setTraceEdge } = useGraphStore.getState();

    // Clear previous visualization state (but keep visualizationState as 'running')
    clearVis();
    // Restore running state since clearVisualization sets it to idle
    const { visualization } = useGraphStore.getState();
    useGraphStore.setState({ visualization: { ...visualization, state: 'running' } });

    if (stepIndex < 0) return;

    // Apply all steps up to current index
    for (let i = 0; i <= stepIndex; i++) {
      const step = stepHistory[i];
      const targetId = step.edge.to;
      const fromId = step.edge.from;

      // Mark the node
      if (step.type === 'visit') {
        setTraceNode(targetId, { isVisited: true });
      } else {
        setTraceNode(targetId, { isInShortestPath: true });
      }

      // Mark the edge (if not from root)
      if (fromId !== -1) {
        if (step.type === 'visit') {
          setTraceEdge(fromId, targetId, { isUsedInTraversal: true });
        } else {
          setTraceEdge(fromId, targetId, { isUsedInShortestPath: true });
        }
      }
    }
  }, [visualizationMode, stepIndex, stepHistory]);

  // Visualization helper - uses separate visualization maps
  const visualizeSetState = useCallback((
    currentEdge: IEdge,
    edgeAttribute: string,
    nodeAttribute: string
  ) => {
    const { setTraceNode, setTraceEdge } = useGraphStore.getState();
    const currentEdges = edgesRef.current;

    const fromId = parseInt(currentEdge.from);
    const toId = parseInt(currentEdge.to);

    // Set node visualization
    setTraceNode(toId, { [nodeAttribute]: true });

    // Set edge visualization - handle both directed and undirected edges
    const edgeList = currentEdges.get(fromId);
    if (edgeList) {
      const edge = edgeList.find((e) => parseInt(e.to) === toId);
      if (edge) {
        setTraceEdge(fromId, toId, { [edgeAttribute]: true });
        // For undirected edges, also mark the reverse direction
        if (edge.type === "undirected") {
          setTraceEdge(toId, fromId, { [edgeAttribute]: true });
        }
      }
    }
  }, []);

  const visualizeShortestPath = useCallback((shortestPath: IEdge[]) => {
    for (let i = 0; i <= shortestPath.length; i++) {
      if (i === shortestPath.length) {
        setTimeout(() => {
          setVisualizationState('done');
          resetVisualization();
        }, visualizationSpeed * i);
        return;
      }
      setTimeout(() => {
        const currentEdge = shortestPath[i];
        const toId = parseInt(currentEdge.to);
        const { visualization } = useGraphStore.getState();
        const isNodeInShortestPath = visualization.trace.nodes.get(toId)?.isInShortestPath === true;
        if (!isNodeInShortestPath) {
          visualizeSetState(currentEdge, "isUsedInShortestPath", "isInShortestPath");
        }
      }, visualizationSpeed * i);
    }
  }, [visualizationSpeed, visualizeSetState, setVisualizationState, resetVisualization]);

  const visualizeGraph = useCallback((visitedEdges: IEdge[], shortestPath: IEdge[] = []) => {
    setVisualizationState('running');

    for (let i = 0; i <= visitedEdges.length; i++) {
      if (i === visitedEdges.length) {
        setTimeout(() => {
          setVisualizationInput(null);
          visualizeShortestPath(shortestPath);
        }, visualizationSpeed * i);
        return;
      }
      setTimeout(() => {
        const currentEdge = visitedEdges[i];
        const toId = parseInt(currentEdge.to);
        const { visualization } = useGraphStore.getState();
        const isNodeTraversed = visualization.trace.nodes.get(toId)?.isVisited === true;
        if (!isNodeTraversed) {
          visualizeSetState(currentEdge, "isUsedInTraversal", "isVisited");
        }
      }, visualizationSpeed * i);
    }
  }, [visualizationSpeed, visualizeShortestPath, visualizeSetState, setVisualizationState, setVisualizationInput]);

  // Convert edges to algorithm input format
  const convertToAlgorithmInput = useCallback((): Map<number, EdgeInfo[]> => {
    const result = new Map<number, EdgeInfo[]>();
    edges.forEach((edgeList, nodeId) => {
      const converted: EdgeInfo[] = (edgeList || []).map((e) => ({
        from: parseInt(e.from),
        to: parseInt(e.to),
        weight: e.weight,
        type: e.type as "directed" | "undirected",
      }));
      result.set(nodeId, converted);
    });
    return result;
  }, [edges]);

  // Convert algorithm result to visualization format
  const convertToVisualizationEdges = useCallback((edgeRefs: Array<{ from: number; to: number }>): IEdge[] => {
    return edgeRefs.map((ref) => ({
      x1: NaN, x2: NaN, y1: NaN, y2: NaN, nodeX2: NaN, nodeY2: NaN,
      from: ref.from === -1 ? "Infinity" : ref.from.toString(),
      to: ref.to.toString(),
      type: "directed",
      weight: NaN,
      isUsedInTraversal: false,
    }));
  }, []);

  // Run algorithm
  const runAlgorithm = useCallback((startNodeId: number, endNodeId?: number) => {
    if (!currentAlgorithm) return;

    // Check for negative weights with incompatible algorithms
    if (visualizationAlgorithm?.key && ALGORITHMS_NO_NEGATIVE_WEIGHTS.has(visualizationAlgorithm.key) && hasNegativeWeights(edges)) {
      toast.warning(`${visualizationAlgorithm.text} doesn't support negative edge weights. Use Bellman-Ford instead.`);
      setVisualizationInput(null);
      resetVisualization();
      return;
    }

    const input = {
      adjacencyList: convertToAlgorithmInput(),
      nodes: nodes.map((n) => ({ id: n.id, x: n.x, y: n.y })),
      startNodeId,
      endNodeId,
    };

    // Check if algorithm has a generator (for step-through mode)
    if (visualizationMode === 'manual' && currentAlgorithm.generator) {
      // Run execute() first to check for errors (same logic as auto mode)
      const result = currentAlgorithm.execute(input);

      if (result.error) {
        const failureMessage = currentAlgorithm.metadata.failureMessage || "Graph violates the requirements of the algorithm.";
        toast.error(failureMessage);
        setVisualizationInput(null);
        resetVisualization();
        return;
      }

      // No error - collect steps from generator for step-through visualization
      const generator = currentAlgorithm.generator(input);
      const steps: AlgorithmStep[] = [...generator];

      // Initialize step-through mode
      initStepThrough(steps);
      return;
    }

    // Auto mode: use existing setTimeout-based visualization
    const result = currentAlgorithm.execute(input);

    if (result.error) {
      const failureMessage = currentAlgorithm.metadata.failureMessage || "Graph violates the requirements of the algorithm.";
      toast.error(failureMessage);
      setVisualizationInput(null);
      resetVisualization();
      return;
    }

    const visitedEdges = convertToVisualizationEdges(result.visitedEdges);
    const resultEdges = result.resultEdges ? convertToVisualizationEdges(result.resultEdges) : [];
    visualizeGraph(visitedEdges, resultEdges);
  }, [currentAlgorithm, nodes, edges, visualizationAlgorithm, visualizationMode, convertToAlgorithmInput, convertToVisualizationEdges, visualizeGraph, setVisualizationInput, resetVisualization, initStepThrough]);

  // Store pan at drag start for relative panning
  const panAtDragStart = useRef({ x: 0, y: 0 });

  // Handle canvas pointer down - implements panning
  const handleCanvasPointerDown = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    const target = event.target as SVGElement;
    if (target.tagName !== "svg") return;
    if (isVisualizing) return; // Don't pan during visualization

    const startX = event.clientX;
    const startY = event.clientY;
    panAtDragStart.current = { ...pan };
    isDraggingCanvas.current = false;

    const handlePointerMove = (e: PointerEvent) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      if (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD) {
        isDraggingCanvas.current = true;
        // Scale delta by zoom for consistent feel at different zoom levels
        setViewportPan(panAtDragStart.current.x + deltaX / zoom, panAtDragStart.current.y + deltaY / zoom);
      }
    };

    const handlePointerUp = () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      setTimeout(() => { isDraggingCanvas.current = false; }, TIMING.POPUP_DELAY);
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
  }, [pan, zoom, isVisualizing, setViewportPan]);

  // Handle click on canvas/node
  const handleSelect = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    const target = event.target as SVGSVGElement;
    const isNode = target.tagName === "circle";

    // Algorithm mode
    if (currentAlgorithm && isNode && !isVisualizing) {
      const nodeId = parseInt(target.id);
      const algoType = currentAlgorithm.metadata.type;

      if (algoType === AlgorithmType.PATHFINDING) {
        if (!visualizationInput) {
          setVisualizationInput({ startNodeId: nodeId, endNodeId: -1 });
        } else {
          setVisualizationInput({ ...visualizationInput, endNodeId: nodeId });
          runAlgorithm(visualizationInput.startNodeId, nodeId);
        }
      } else {
        runAlgorithm(nodeId);
      }
      return;
    }

    // Deselect node when clicking canvas
    if (!isNode && selectedNodeId !== null) {
      selectNode(null);
    }

    // Create node on empty canvas (not during visualization or algorithm selection)
    if (!isNode && selectedNodeId === null && !selectedEdgeForEdit && !isDraggingEdge.current && !justClosedPopup.current && !isDraggingCanvas.current && !isVisualizing && !currentAlgorithm) {
      const { x, y } = screenToSvgCoords(event.clientX, event.clientY);
      addNode(x, y);
    }
  }, [currentAlgorithm, isVisualizing, visualizationInput, selectedNodeId, selectedEdgeForEdit, screenToSvgCoords, runAlgorithm, setVisualizationInput, selectNode, addNode]);

  // Handle edge click
  const handleEdge = useCallback((edge: IEdge, fromNodeId: number, clickPosition: { x: number; y: number }) => {
    if (isVisualizing) return;
    const { nodes } = useGraphStore.getState();
    const fromNode = nodes.find(n => n.id === fromNodeId);
    if (!fromNode) return;
    selectEdgeForEdit(edge, fromNode, clickPosition);
  }, [isVisualizing, selectEdgeForEdit]);

  // Close edge popup
  const closeEdgePopup = useCallback(() => {
    justClosedPopup.current = true;
    clearEdgeSelection();
    setTimeout(() => { justClosedPopup.current = false; }, TIMING.POPUP_DELAY);
  }, [clearEdgeSelection]);

  // Update edge type
  const updateEdgeType = useCallback((newType: "directed" | "undirected") => {
    if (!selectedEdgeForEdit) return;
    const { edge, sourceNode } = selectedEdgeForEdit;
    updateEdgeTypeAction(sourceNode.id, parseInt(edge.to), newType);
  }, [selectedEdgeForEdit, updateEdgeTypeAction]);

  // Update edge weight
  const updateEdgeWeight = useCallback((newWeight: number) => {
    if (!selectedEdgeForEdit) return;
    const { edge, sourceNode } = selectedEdgeForEdit;
    updateEdgeWeightAction(sourceNode.id, parseInt(edge.to), newWeight);
  }, [selectedEdgeForEdit, updateEdgeWeightAction]);

  // Reverse edge
  const reverseEdge = useCallback(() => {
    if (!selectedEdgeForEdit) return;
    const { edge, sourceNode } = selectedEdgeForEdit;
    reverseEdgeAction(sourceNode.id, parseInt(edge.to));
  }, [selectedEdgeForEdit, reverseEdgeAction]);

  // Delete edge
  const deleteEdge = useCallback(() => {
    if (!selectedEdgeForEdit) return;
    const { edge, sourceNode } = selectedEdgeForEdit;
    deleteEdgeAction(sourceNode.id, parseInt(edge.to));
  }, [selectedEdgeForEdit, deleteEdgeAction]);

  // Handle node movement
  const handleNodeMove = useCallback((nodeId: number, x: number, y: number) => {
    // Get current state at call-time instead of closing over nodes/edges
    const { nodes, edges, nodeCounter } = useGraphStore.getState();

    // Capture state before first move
    if (!dragStartSnapshot.current) {
      dragStartSnapshot.current = createSnapshot(nodes, edges, nodeCounter);
    }
    moveNode(nodeId, x, y);
    debouncedRecordDrag();
  }, [createSnapshot, debouncedRecordDrag, moveNode]);

  // Handle connector drag start
  const handleConnectorDragStart = useCallback(
    (sourceNodeId: number, _position: string, startX: number, startY: number) => {
      if (!graph.current) return;
      isDraggingEdge.current = true;

      const handlePointerMove = (e: PointerEvent) => {
        const { x: endX, y: endY } = screenToSvgCoords(e.clientX, e.clientY);
        setMockEdge({
          x1: startX, y1: startY, x2: endX, y2: endY,
          nodeX2: 0, nodeY2: 0,
          from: sourceNodeId.toString(), to: "",
          weight: 0, type: "directed",
        });
      };

      const handlePointerUp = (e: PointerEvent) => {
        document.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerup", handlePointerUp);

        // Get current state at call-time
        const { nodes, edges } = useGraphStore.getState();
        const sourceNode = nodes.find(n => n.id === sourceNodeId);
        if (!sourceNode) { setMockEdge(null); return; }

        const target = e.target as SVGElement;
        let targetNode: INode | undefined;

        if (target.tagName === "circle" && target.id) {
          const targetNodeId = parseInt(target.id);
          if (!isNaN(targetNodeId)) {
            targetNode = nodes.find((n) => n.id === targetNodeId);
          }
        }

        if (!targetNode) {
          const { x: endX, y: endY } = screenToSvgCoords(e.clientX, e.clientY);
          targetNode = findToNodeForTouchBasedDevices(endX, endY, nodes);
        }

        if (targetNode && targetNode.id !== sourceNodeId) {
          const existingEdges = edges.get(sourceNodeId) || [];
          const edgeExists = existingEdges.some((edge) => parseInt(edge.to) === targetNode!.id);

          if (!edgeExists) {
            addEdge(sourceNode, targetNode);
          }
        }

        setMockEdge(null);
        setTimeout(() => { isDraggingEdge.current = false; }, TIMING.POPUP_DELAY);
      };

      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerUp);
    },
    [screenToSvgCoords, addEdge]
  );

  return (
    <div className="relative flex-1 w-full h-full flex flex-col">
      <svg
        ref={graph}
        className="flex-1 w-full h-full cursor-crosshair"
        onPointerDown={handleCanvasPointerDown}
        onClick={handleSelect}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <CanvasDefs />
          <NodeDefs />
          <EdgeDefs />
        </defs>

        <GridBackground />

        {nodeIds.map((nodeId) => (
          <Node
            key={nodeId}
            nodeId={nodeId}
            onNodeMove={handleNodeMove}
            onEdgeClick={handleEdge}
            onConnectorDragStart={handleConnectorDragStart}
            isVisualizing={isVisualizing}
            isAlgorithmSelected={!!currentAlgorithm}
            svgRef={graph}
            onNodeSelect={selectNode}
            screenToSvgCoords={screenToSvgCoords}
          />
        ))}

        <DragPreviewEdge edge={mockEdge} />

      </svg>

      {/* Edge popup - rendered outside SVG using Popover */}
      {selectedEdgeForEdit && (() => {
        const { edge, clickPosition } = selectedEdgeForEdit;
        return (
          <EdgePopup
            edge={edge}
            anchorPosition={clickPosition}
            onClose={closeEdgePopup}
            onUpdateType={updateEdgeType}
            onUpdateWeight={updateEdgeWeight}
            onReverse={reverseEdge}
            onDelete={deleteEdge}
          />
        );
      })()}
    </div>
  );
};
