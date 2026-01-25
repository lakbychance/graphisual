import { useState, useRef, useEffect, useCallback, useMemo, useImperativeHandle, type Ref } from "react";
import { Node } from "../Graph/Node/Node";
import { ZOOM } from "../../utility/constants";
import { GraphEdge } from "./types";
import { EdgePopup } from "./EdgePopup";
import { useGraphStore } from "../../store/graphStore";
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

export interface GraphHandle {
  getSvgElement: () => SVGSVGElement | null;
}

export function Graph({ ref }: { ref?: Ref<GraphHandle> }) {
  // Subscribe to node IDs only for rendering - prevents re-renders when node positions change
  const nodeIds = useGraphStore(
    useShallow((state) => state.data.nodes.map((n) => n.id))
  );
  const selectedNodeId = useGraphStore((state) => state.selection.nodeId);
  const selectedEdge = useGraphStore((state) => state.selection.edge);
  const zoomTarget = useGraphStore((state) => state.viewport.zoom);
  const panTarget = useGraphStore((state) => state.viewport.pan);

  // Animated viewport values (spring-smoothed)
  const { zoom, pan } = useSpringViewport({ zoomTarget, panTarget });

  const { addNode, moveNode, selectNode } = useNodeActions();
  const setViewportPan = useGraphStore((state) => state.setViewportPan);
  const setViewportZoom = useGraphStore((state) => state.setViewportZoom);

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
    justClosedPopup,
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
    if (!isNode && selectedNodeId === null && !selectedEdge && !isDraggingEdge.current && !justClosedPopup.current && !isDraggingCanvas.current && !isVisualizing && !currentAlgorithm) {
      const { x, y } = screenToSvgCoords(event.clientX, event.clientY);
      addNode(x, y);
    }
  }, [currentAlgorithm, isVisualizing, handleNodeClick, selectedNodeId, selectedEdge, screenToSvgCoords, selectNode, addNode, isDraggingEdge, justClosedPopup, isDraggingCanvas]);

  // Hide content until viewBox is ready to prevent flicker on mount
  const isReady = viewBox !== undefined;

  return (
    <div className="relative flex-1 w-full h-full flex flex-col">
      <svg
        ref={graph}
        className="flex-1 w-full h-full cursor-crosshair"
        style={{ visibility: isReady ? 'visible' : 'hidden' }}
        onPointerDown={handleCanvasPointerDown}
        onClick={handleCanvasClick}
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
            onNodeMove={moveNode}
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
}
