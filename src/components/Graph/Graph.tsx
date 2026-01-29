import { useState, useRef, useCallback, useMemo, useImperativeHandle, type Ref } from "react";
import { Node } from "../Graph/Node/Node";
import { NodeEdges } from "./NodeEdges";
import { ZOOM } from "../../constants/ui";
import { GraphEdge } from "./types";
import { EdgePopup } from "./EdgePopup";
import { useGraphStore } from "../../store/graphStore";
import { calculateTextLoc } from "../../utils/geometry/calc";
import { useStepThroughVisualization } from "../../hooks/useStepThroughVisualization";
import { useGestureZoom } from "../../hooks/useGestureZoom";
import { useSpringViewport } from "../../hooks/useSpringViewport";
import { useCanvasPan } from "../../hooks/useCanvasPan";
import { useEdgeDragging } from "../../hooks/useEdgeDragging";
import { useEdgeSelection } from "../../hooks/useEdgeSelection";
import { useAlgorithmNodeClick } from "../../hooks/useAlgorithmNodeClick";
import { useVisualizationExecution } from "../../hooks/useVisualizationExecution";
import { useNodeActions } from "../../hooks/useNodeActions";
import { useElementDimensions } from "../../hooks/useElementDimensions";
import { useShallow } from "zustand/shallow";
import { CanvasDefs } from "./defs/CanvasDefs";
import { NodeDefs } from "./defs/NodeDefs";
import { EdgeDefs } from "./defs/EdgeDefs";
import { GridBackground } from "./GridBackground";
import { DragPreviewEdge } from "./DragPreviewEdge";
import { findNodeInDirection, type Direction } from "../../utils/focus/findNodeInDirection";
import { VisualizationMode, VisualizationState } from "../../constants/visualization";

export interface GraphHandle {
  getSvgElement: () => SVGSVGElement | null;
}

export function Graph({ ref }: { ref?: Ref<GraphHandle> }) {
  // Subscribe to stacking order for rendering - determines z-order of nodes
  const orderedNodeIds = useGraphStore(
    useShallow((state) => [...state.data.stackingOrder])
  );
  const nodes = useGraphStore(useShallow((state) => state.data.nodes));
  const edges = useGraphStore((state) => state.data.edges);
  const selectedNodeId = useGraphStore((state) => state.selection.nodeId);
  const selectedEdge = useGraphStore((state) => state.selection.edge);
  const focusedEdge = useGraphStore((state) => state.selection.focusedEdge);
  const zoomTarget = useGraphStore((state) => state.viewport.zoom);
  const panTarget = useGraphStore((state) => state.viewport.pan);
  const visualizationMode = useGraphStore((state) => state.visualization.mode);
  const visualizationState = useGraphStore((state) => state.visualization.state);

  // Animated viewport values (spring-smoothed)
  const { zoom, pan } = useSpringViewport({ zoomTarget, panTarget });

  const { addNode, moveNode, selectNode } = useNodeActions();
  const setViewportPan = useGraphStore((state) => state.setViewportPan);
  const setViewportZoom = useGraphStore((state) => state.setViewportZoom);
  const setFocusedEdge = useGraphStore((state) => state.setFocusedEdge);
  const clearFocusedEdge = useGraphStore((state) => state.clearFocusedEdge);
  const selectEdgeAction = useGraphStore((state) => state.selectEdge);

  // Shared algorithm node click handler
  const { handleNodeClick } = useAlgorithmNodeClick();

  // Visualization execution hook - only need currentAlgorithm and isVisualizing for checks
  const { currentAlgorithm, isVisualizing } = useVisualizationExecution();

  // Local UI state (not shared with other components)
  const [mockEdge, setMockEdge] = useState<GraphEdge | null>(null);

  // Refs
  const graph = useRef<SVGSVGElement | null>(null);

  // Expose SVG element via imperative handle for export functionality
  useImperativeHandle(ref, () => ({
    getSvgElement: () => graph.current,
  }), []);

  // Track SVG dimensions for viewBox calculation
  const svgDimensions = useElementDimensions(graph);

  // Calculate viewBox based on zoom and pan
  // ViewBox is centered at origin (0,0) so graphs generated around origin appear centered
  const viewBox = useMemo(() => {
    if (svgDimensions.width === 0 || svgDimensions.height === 0) return undefined;
    const viewBoxWidth = svgDimensions.width / zoom;
    const viewBoxHeight = svgDimensions.height / zoom;
    // Center the view at origin and apply pan offset
    const viewBoxMinX = -viewBoxWidth / 2 - pan.x;
    const viewBoxMinY = -viewBoxHeight / 2 - pan.y;
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

  // Convert SVG coordinates to screen coordinates
  const svgToScreenCoords = useCallback((svgX: number, svgY: number) => {
    if (!graph.current) return { x: 0, y: 0 };
    const point = graph.current.createSVGPoint();
    point.x = svgX;
    point.y = svgY;
    const ctm = graph.current.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const screenPoint = point.matrixTransform(ctm);
    return { x: screenPoint.x, y: screenPoint.y };
  }, []);

  // Apply step-through visualization when stepIndex changes
  useStepThroughVisualization();

  // Enable pinch-to-zoom, trackpad zoom, and mouse wheel zoom
  const { isGestureActive } = useGestureZoom({
    svgRef: graph,
    zoom: zoomTarget,
    setZoom: setViewportZoom,
    pan: panTarget,
    setPan: setViewportPan,
    minZoom: ZOOM.MIN,
    maxZoom: ZOOM.MAX,
  });

  // Canvas panning hook
  const { handleCanvasPointerDown, isDraggingCanvas } = useCanvasPan({
    pan,
    zoom,
    isGestureActive,
    setViewportPan,
  });

  // Edge dragging hook
  const { handleConnectorDragStart, isDraggingEdge } = useEdgeDragging({
    graphRef: graph,
    screenToSvgCoords,
    setMockEdge,
  });

  // Edge selection hook
  const {
    handleEdge,
    closeEdgePopup,
    updateEdgeType,
    updateEdgeWeight,
    reverseEdge,
    deleteEdge,
  } = useEdgeSelection({ isVisualizing });

  // Handle click on canvas/node
  const handleCanvasClick = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    const target = event.target as SVGSVGElement;
    const isNode = target.tagName === "circle";

    // Algorithm mode - delegate to shared hook
    if (currentAlgorithm && isNode && !isVisualizing) {
      const nodeId = parseInt(target.id);
      handleNodeClick(nodeId);
      return;
    }

    // Deselect node when clicking canvas
    if (!isNode && selectedNodeId !== null) {
      selectNode(null);
    }

    // Create node on empty canvas (not during visualization or algorithm selection)
    if (!isNode && selectedNodeId === null && !isDraggingEdge.current && !isDraggingCanvas.current && !isVisualizing && !currentAlgorithm) {
      const { x, y } = screenToSvgCoords(event.clientX, event.clientY);
      addNode(x, y);
    }
  }, [currentAlgorithm, isVisualizing, handleNodeClick, selectedNodeId, screenToSvgCoords, selectNode, addNode, isDraggingEdge, isDraggingCanvas]);

  // Check if we're in step mode (manual visualization with steps)
  const isInStepMode = visualizationMode === VisualizationMode.MANUAL &&
    visualizationState === VisualizationState.RUNNING;


  // Handle keyboard navigation
  const handleCanvasKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Skip during step mode (arrows control stepping)
    if (isInStepMode) return;

    const isArrowKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key);

    // === E key: cycle through edges ===
    if (e.key === 'e' || e.key === 'E') {
      const nodeId = focusedEdge?.from ?? selectedNodeId;
      if (nodeId === null) return;

      const outgoingEdges = edges.get(nodeId) || [];
      if (outgoingEdges.length === 0) return;

      e.preventDefault();

      if (!focusedEdge) {
        // First press: focus first edge
        setFocusedEdge(nodeId, outgoingEdges[0].to);
      } else {
        // Subsequent presses: cycle to next edge
        const currentIndex = outgoingEdges.findIndex(edge => edge.to === focusedEdge.to);
        const nextIndex = (currentIndex + 1) % outgoingEdges.length;
        setFocusedEdge(nodeId, outgoingEdges[nextIndex].to);
      }
      return;
    }

    // === Enter key: open edge popup ===
    if (e.key === 'Enter' && focusedEdge) {
      e.preventDefault();
      const edgeList = edges.get(focusedEdge.from);
      const edge = edgeList?.find(edge => edge.to === focusedEdge.to);
      if (edge) {
        const sourceNode = nodes.find(n => n.id === focusedEdge.from);
        if (sourceNode) {
          let centerX: number, centerY: number;
          if (edge.type === 'directed') {
            const { c1x, c1y } = calculateTextLoc(edge.x1, edge.y1, edge.x2, edge.y2);
            centerX = (edge.x1 + 2 * c1x + edge.x2) / 4;
            centerY = (edge.y1 + 2 * c1y + edge.y2) / 4;
          } else {
            centerX = (edge.x1 + edge.nodeX2) / 2;
            centerY = (edge.y1 + edge.nodeY2) / 2;
          }
          const clickPosition = svgToScreenCoords(centerX, centerY);
          selectEdgeAction(edge, sourceNode, clickPosition);
        }
      }
      return;
    }

    // === Escape key: clear edge focus ===
    if (e.key === 'Escape' && focusedEdge) {
      e.preventDefault();
      clearFocusedEdge();
      return;
    }

    // === Arrow keys: proximity-based node navigation ===
    if (isArrowKey) {
      e.preventDefault();

      // Clear edge focus when navigating with arrows
      if (focusedEdge) {
        clearFocusedEdge();
      }

      const arrowKeyMap: Record<string, Direction> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      };
      const direction = arrowKeyMap[e.key];

      // If no node selected, select topmost node
      if (selectedNodeId === null) {
        if (orderedNodeIds.length > 0) {
          const topmostNodeId = orderedNodeIds[orderedNodeIds.length - 1];
          selectNode(topmostNodeId);
        }
        return;
      }

      // Find current node and navigate to nearest in direction
      const currentNode = nodes.find(n => n.id === selectedNodeId);
      if (!currentNode) return;

      const nextNode = findNodeInDirection(currentNode, nodes, direction);
      if (nextNode) {
        selectNode(nextNode.id);
      }
    }
  }, [isInStepMode, selectedNodeId, orderedNodeIds, nodes, edges, focusedEdge, selectNode, setFocusedEdge, clearFocusedEdge, selectEdgeAction, svgToScreenCoords]);

  // Handle blur - deselect node and clear edge focus when focus leaves the graph
  // But don't clear if focus is moving to the edge popup
  const handleCanvasBlur = useCallback((e: React.FocusEvent) => {
    // Check if focus is moving to a popup (identified by data attribute or role)
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    const isMovingToPopup = relatedTarget?.closest('[role="dialog"]') !== null;

    if (isMovingToPopup) return;

    if (selectedNodeId !== null) {
      selectNode(null);
    }
    if (focusedEdge !== null) {
      clearFocusedEdge();
    }
  }, [selectedNodeId, focusedEdge, selectNode, clearFocusedEdge]);

  // Wrapper for closeEdgePopup that refocuses the canvas (only for keyboard navigation)
  const handleCloseEdgePopup = useCallback(() => {
    closeEdgePopup();
    // Only refocus SVG if coming from keyboard navigation (focusedEdge is set)
    // Mouse interactions clear focusedEdge, so we don't refocus and auto-select a node
    if (focusedEdge) {
      graph.current?.focus();
    }
  }, [closeEdgePopup, focusedEdge]);

  // Hide content until viewBox is ready to prevent flicker on mount
  const isReady = viewBox !== undefined;

  return (
    <div className="relative flex-1 w-full h-full flex flex-col">
      <svg
        ref={graph}
        tabIndex={0}
        className="flex-1 w-full h-full cursor-crosshair focus:outline-none"
        style={{ visibility: isReady ? 'visible' : 'hidden' }}
        onPointerDown={handleCanvasPointerDown}
        onClick={handleCanvasClick}
        onBlur={handleCanvasBlur}
        onKeyDown={handleCanvasKeyDown}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid slice"
        role="application"
        aria-label="Graph canvas"
      >
        <defs>
          <CanvasDefs />
          <NodeDefs />
          <EdgeDefs />
        </defs>

        <GridBackground />

        {/* Edges layer - rendered first so all edges are behind all nodes */}
        {orderedNodeIds.map((nodeId) => (
          <NodeEdges
            key={`edges-${nodeId}`}
            nodeId={nodeId}
            isVisualizing={isVisualizing}
            onEdgeClick={handleEdge}
          />
        ))}

        {/* Nodes layer - orderedNodeIds determines z-order (last = top) */}
        {orderedNodeIds.map((nodeId) => (
          <Node
            key={nodeId}
            nodeId={nodeId}
            onNodeMove={moveNode}
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
            onClose={handleCloseEdgePopup}
            onUpdateType={updateEdgeType}
            onUpdateWeight={updateEdgeWeight}
            onReverse={reverseEdge}
            onDelete={deleteEdge}
          />
        );
      })()}
    </div>
  );
}
