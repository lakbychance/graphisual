import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Node } from "../Graph/Node/Node";
import { findToNodeForTouchBasedDevices } from "../../utility/calc";
import { DRAG_THRESHOLD, TIMING, ZOOM } from "../../utility/constants";
import { hasNegativeWeights, ALGORITHMS_NO_NEGATIVE_WEIGHTS } from "../../utility/graphUtils";
import { INode, IEdge } from "./IGraph";
import { algorithmRegistry, AlgorithmType, EdgeInfo, AlgorithmStep } from "../../algorithms";
import { EdgePopup } from "./EdgePopup";
import { toast } from "sonner";
import { useGraphStore } from "../../store/graphStore";
import { useStepThroughVisualization } from "../../hooks/useStepThroughVisualization";
import { useGestureZoom } from "../../hooks/useGestureZoom";
import { useSpringViewport } from "../../hooks/useSpringViewport";
import { useShallow } from "zustand/shallow";
import { CanvasDefs } from "./defs/CanvasDefs";
import { NodeDefs } from "./defs/NodeDefs";
import { EdgeDefs } from "./defs/EdgeDefs";
import { GridBackground } from "./GridBackground";
import { DragPreviewEdge } from "./DragPreviewEdge";
import { VisualizationState, VisualizationMode, EDGE_TYPE, StepType, type EdgeType } from "../../constants";
import { animateSequence, AnimationController } from "../../utility/animateSequence";

export const Graph = () => {
  // Get state from store
  const nodes = useGraphStore((state) => state.data.nodes);
  const edges = useGraphStore((state) => state.data.edges);
  // Subscribe to node IDs only for rendering - prevents re-renders when node positions change
  const nodeIds = useGraphStore(
    useShallow((state) => state.data.nodes.map((n) => n.id))
  );
  const selectedNodeId = useGraphStore((state) => state.selection.nodeId);
  const selectedEdge = useGraphStore((state) => state.selection.edge);
  const visualizationAlgorithm = useGraphStore((state) => state.visualization.algorithm);
  const visualizationInput = useGraphStore((state) => state.visualization.input);
  const visualizationState = useGraphStore((state) => state.visualization.state);
  const visualizationSpeed = useGraphStore((state) => state.visualization.speed);

  // Derive boolean for simpler component logic and Node prop
  const isVisualizing = visualizationState === VisualizationState.RUNNING;
  const zoomTarget = useGraphStore((state) => state.viewport.zoom);
  const panTarget = useGraphStore((state) => state.viewport.pan);
  const visualizationMode = useGraphStore((state) => state.visualization.mode);

  // Animated viewport values (spring-smoothed)
  const { zoom, pan } = useSpringViewport({ zoomTarget, panTarget });

  const addNode = useGraphStore((state) => state.addNode);
  const moveNode = useGraphStore((state) => state.moveNode);
  const addEdge = useGraphStore((state) => state.addEdge);
  const selectNode = useGraphStore((state) => state.selectNode);
  const selectEdgeAction = useGraphStore((state) => state.selectEdge);
  const clearEdgeSelection = useGraphStore((state) => state.clearEdgeSelection);
  const setVisualizationInput = useGraphStore((state) => state.setVisualizationInput);
  const setVisualizationState = useGraphStore((state) => state.setVisualizationState);
  const resetVisualization = useGraphStore((state) => state.resetVisualization);
  const updateEdgeTypeAction = useGraphStore((state) => state.updateEdgeType);
  const updateEdgeWeightAction = useGraphStore((state) => state.updateEdgeWeight);
  const reverseEdgeAction = useGraphStore((state) => state.reverseEdge);
  const deleteEdgeAction = useGraphStore((state) => state.deleteEdge);
  const setViewportPan = useGraphStore((state) => state.setViewportPan);
  const setViewportZoom = useGraphStore((state) => state.setViewportZoom);
  const initStepThrough = useGraphStore((state) => state.initStepThrough);

  // Local UI state (not shared with other components)
  const [mockEdge, setMockEdge] = useState<IEdge | null>(null);
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });

  // Refs
  const graph = useRef<SVGSVGElement | null>(null);
  const isDraggingEdge = useRef(false);
  const justClosedPopup = useRef(false);
  const isDraggingCanvas = useRef(false);

  // Refs to track latest state during visualization (for setTimeout callbacks)
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  // Animation controller for cancellation
  const animationRef = useRef<AnimationController | null>(null);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      animationRef.current?.cancel();
    };
  }, []);

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
  useStepThroughVisualization();

  // Enable pinch-to-zoom and trackpad zoom (disabled during visualization)
  const { isGestureActive } = useGestureZoom({
    svgRef: graph,
    zoom: zoomTarget,
    setZoom: setViewportZoom,
    pan: panTarget,
    setPan: setViewportPan,
    minZoom: ZOOM.MIN,
    maxZoom: ZOOM.MAX,
    enabled: !isVisualizing,
  });

  // Marks an edge and its target node for visualization
  const markEdgeAndNode = useCallback((currentEdge: IEdge, stepType: StepType) => {
    const { setTraceNode, setTraceEdge } = useGraphStore.getState();
    const fromId = parseInt(currentEdge.from);
    const toId = parseInt(currentEdge.to);

    // Type-safe node flags
    if (stepType === StepType.VISIT) {
      setTraceNode(toId, { isVisited: true });
    } else {
      setTraceNode(toId, { isInShortestPath: true });
    }

    // Type-safe edge flags
    const edgeList = edgesRef.current.get(fromId);
    if (edgeList) {
      const edge = edgeList.find((e) => parseInt(e.to) === toId);
      if (edge) {
        const edgeFlags = stepType === StepType.VISIT
          ? { isUsedInTraversal: true }
          : { isUsedInShortestPath: true };

        setTraceEdge(fromId, toId, edgeFlags);
        // For undirected edges, also mark the reverse direction
        if (edge.type === EDGE_TYPE.UNDIRECTED) {
          setTraceEdge(toId, fromId, edgeFlags);
        }
      }
    }
  }, []);

  // Animates the result/shortest path
  const visualizeResultPath = useCallback((resultEdges: IEdge[]) => {
    animationRef.current = animateSequence({
      items: resultEdges,
      delayMs: visualizationSpeed,
      onStep: (edge) => {
        const toId = parseInt(edge.to);
        const { visualization } = useGraphStore.getState();
        if (!visualization.trace.nodes.get(toId)?.isInShortestPath) {
          markEdgeAndNode(edge, StepType.RESULT);
        }
      },
      onComplete: () => {
        setVisualizationState(VisualizationState.DONE);
        resetVisualization();
      },
    });
  }, [visualizationSpeed, markEdgeAndNode, setVisualizationState, resetVisualization]);

  // Animates traversal, then chains to result path visualization
  const visualizeTraversedEdges = useCallback((visitedEdges: IEdge[], resultEdges: IEdge[] = []) => {
    animationRef.current?.cancel();
    setVisualizationState(VisualizationState.RUNNING);

    animationRef.current = animateSequence({
      items: visitedEdges,
      delayMs: visualizationSpeed,
      onStep: (edge) => {
        const toId = parseInt(edge.to);
        const { visualization } = useGraphStore.getState();
        if (!visualization.trace.nodes.get(toId)?.isVisited) {
          markEdgeAndNode(edge, StepType.VISIT);
        }
      },
      onComplete: () => {
        setVisualizationInput(null);
        visualizeResultPath(resultEdges);
      },
    });
  }, [visualizationSpeed, visualizeResultPath, markEdgeAndNode, setVisualizationState, setVisualizationInput]);

  // Convert edges to algorithm input format
  const convertToAlgorithmInput = useCallback((): Map<number, EdgeInfo[]> => {
    const result = new Map<number, EdgeInfo[]>();
    edges.forEach((edgeList, nodeId) => {
      const converted: EdgeInfo[] = (edgeList || []).map((e) => ({
        from: parseInt(e.from),
        to: parseInt(e.to),
        weight: e.weight,
        type: e.type as EdgeType,
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
      type: EDGE_TYPE.DIRECTED,
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
    if (visualizationMode === VisualizationMode.MANUAL && currentAlgorithm.generator) {
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
    visualizeTraversedEdges(visitedEdges, resultEdges);
  }, [currentAlgorithm, nodes, edges, visualizationAlgorithm, visualizationMode, convertToAlgorithmInput, convertToVisualizationEdges, visualizeTraversedEdges, setVisualizationInput, resetVisualization, initStepThrough]);

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
      // Skip panning when gesture (pinch/trackpad zoom) is active
      if (isGestureActive()) return;

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
    if (!isNode && selectedNodeId === null && !selectedEdge && !isDraggingEdge.current && !justClosedPopup.current && !isDraggingCanvas.current && !isVisualizing && !currentAlgorithm) {
      const { x, y } = screenToSvgCoords(event.clientX, event.clientY);
      addNode(x, y);
    }
  }, [currentAlgorithm, isVisualizing, visualizationInput, selectedNodeId, selectedEdge, screenToSvgCoords, runAlgorithm, setVisualizationInput, selectNode, addNode]);

  // Handle edge click
  const handleEdge = useCallback((edge: IEdge, fromNodeId: number, clickPosition: { x: number; y: number }) => {
    if (isVisualizing) return;
    const { data } = useGraphStore.getState();
    const fromNode = data.nodes.find(n => n.id === fromNodeId);
    if (!fromNode) return;
    selectEdgeAction(edge, fromNode, clickPosition);
  }, [isVisualizing, selectEdgeAction]);

  // Close edge popup
  const closeEdgePopup = useCallback(() => {
    justClosedPopup.current = true;
    clearEdgeSelection();
    setTimeout(() => { justClosedPopup.current = false; }, TIMING.POPUP_DELAY);
  }, [clearEdgeSelection]);

  // Update edge type
  const updateEdgeType = useCallback((newType: EdgeType) => {
    if (!selectedEdge) return;
    const { edge, sourceNode } = selectedEdge;
    updateEdgeTypeAction(sourceNode.id, parseInt(edge.to), newType);
  }, [selectedEdge, updateEdgeTypeAction]);

  // Update edge weight
  const updateEdgeWeight = useCallback((newWeight: number) => {
    if (!selectedEdge) return;
    const { edge, sourceNode } = selectedEdge;
    updateEdgeWeightAction(sourceNode.id, parseInt(edge.to), newWeight);
  }, [selectedEdge, updateEdgeWeightAction]);

  // Reverse edge
  const reverseEdge = useCallback(() => {
    if (!selectedEdge) return;
    const { edge, sourceNode } = selectedEdge;
    reverseEdgeAction(sourceNode.id, parseInt(edge.to));
  }, [selectedEdge, reverseEdgeAction]);

  // Delete edge
  const deleteEdge = useCallback(() => {
    if (!selectedEdge) return;
    const { edge, sourceNode } = selectedEdge;
    deleteEdgeAction(sourceNode.id, parseInt(edge.to));
  }, [selectedEdge, deleteEdgeAction]);

  // Handle node movement - history is now managed by batchedAutoHistory in the store
  const handleNodeMove = useCallback((nodeId: number, x: number, y: number) => {
    moveNode(nodeId, x, y);
  }, [moveNode]);

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
          weight: 0, type: EDGE_TYPE.DIRECTED,
        });
      };

      const handlePointerUp = (e: PointerEvent) => {
        document.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerup", handlePointerUp);

        // Get current state at call-time
        const { data } = useGraphStore.getState();
        const { nodes, edges } = data;
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
            onNodeSelect={selectNode}
            screenToSvgCoords={screenToSvgCoords}
            isGestureActive={isGestureActive}
          />
        ))}

        <DragPreviewEdge edge={mockEdge} />

      </svg>

      {/* Edge popup - rendered outside SVG using Popover */}
      {selectedEdge && (() => {
        const { edge, clickPosition } = selectedEdge;
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
