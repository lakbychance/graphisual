import { useState, useRef, useCallback, useMemo, useImperativeHandle, type Ref } from "react";
import { createPortal } from "react-dom";
import { Node } from "../Graph/Node/Node";
import { NodeEdges } from "./NodeEdges";
import { ZOOM } from "../../constants/ui";
import { GraphEdge } from "./types";
import { EdgePopup } from "./EdgePopup";
import { useGraphStore } from "../../store/graphStore";
import { useNodeLabelEdit } from "../../hooks/useNodeLabelEdit";
import { useStepThroughVisualization } from "../../hooks/useStepThroughVisualization";
import { useGestureZoom } from "../../hooks/useGestureZoom";
import { useSpringViewport } from "../../hooks/useSpringViewport";
import { useSVGCanvasPan } from "../../hooks/useSVGCanvasPan";
import { useBoxSelection } from "../../hooks/useBoxSelection";
import { useEdgeDragging } from "../../hooks/useEdgeDragging";
import { useEdgeSelection } from "../../hooks/useEdgeSelection";
import { useAlgorithmNodeClick } from "../../hooks/useAlgorithmNodeClick";
import { useVisualizationExecution } from "../../hooks/useVisualizationExecution";
import { useNodeActions } from "../../hooks/useNodeActions";
import { useElementDimensions } from "../../hooks/useElementDimensions";
import { useGraphKeyboardNavigation } from "../../hooks/useGraphKeyboardNavigation";
import { useShallow } from "zustand/shallow";
import { CanvasDefs } from "./defs/CanvasDefs";
import { NodeDefs } from "./defs/NodeDefs";
import { EdgeDefs } from "./defs/EdgeDefs";
import { GridBackground } from "./GridBackground";
import { DragPreviewEdge } from "./DragPreviewEdge";
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
  const hasSelectedNodes = useGraphStore((state) => state.selection.nodeIds.size > 0);
  const selectedEdge = useGraphStore((state) => state.selection.edge);
  const zoomTarget = useGraphStore((state) => state.viewport.zoom);
  const panTarget = useGraphStore((state) => state.viewport.pan);
  const visualizationMode = useGraphStore((state) => state.visualization.mode);
  const visualizationState = useGraphStore((state) => state.visualization.state);

  // Animated viewport values (spring-smoothed)
  const { zoom, pan } = useSpringViewport({ zoomTarget, panTarget });

  const { addNode, moveNode, selectNode } = useNodeActions();
  const moveNodes = useGraphStore((state) => state.moveNodes);
  const setViewportPan = useGraphStore((state) => state.setViewportPan);
  const setViewportZoom = useGraphStore((state) => state.setViewportZoom);
  const setVisualizationAlgorithm = useGraphStore((state) => state.setVisualizationAlgorithm);

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
    elementRef: graph,
    zoom: zoomTarget,
    setZoom: setViewportZoom,
    pan: panTarget,
    setPan: setViewportPan,
    minZoom: ZOOM.MIN,
    maxZoom: ZOOM.MAX,
  });

  // Canvas panning hook
  const { handleCanvasPointerDown: handlePanPointerDown, isDraggingCanvas } = useSVGCanvasPan({
    pan,
    zoom,
    isGestureActive,
    setViewportPan,
  });

  // Box selection hook (Shift+drag)
  const { selectionBox, handleBoxSelectionPointerDown, isBoxSelecting } = useBoxSelection({
    screenToSvgCoords,
    isGestureActive,
  });

  // Combined pointer down handler: box selection takes priority when Shift is held
  const handleCanvasPointerDown = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      // Try box selection first (only activates with Shift)
      if (handleBoxSelectionPointerDown(event)) {
        return;
      }
      // Fall back to panning
      handlePanPointerDown(event);
    },
    [handleBoxSelectionPointerDown, handlePanPointerDown]
  );

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

    // Algorithm mode - delegate to shared hook (body click only, not hit area ring)
    if (currentAlgorithm && isNode && !isVisualizing && !target.id.startsWith("hit-")) {
      const nodeId = parseInt(target.id);
      handleNodeClick(nodeId);
      return;
    }

    // Cancel algorithm selection when clicking empty canvas (not panning)
    if (!isNode && currentAlgorithm && !isVisualizing && !isDraggingCanvas.current) {
      setVisualizationAlgorithm(undefined);
      return;
    }

    // Deselect nodes when clicking canvas (but not after box selection)
    if (!isNode && hasSelectedNodes && !isBoxSelecting.current) {
      selectNode(null);
    }

    // Create node on empty canvas (not during visualization or algorithm selection or box selection)
    if (!isNode && !hasSelectedNodes && !isDraggingEdge.current && !isDraggingCanvas.current && !isBoxSelecting.current && !isVisualizing && !currentAlgorithm) {
      const { x, y } = screenToSvgCoords(event.clientX, event.clientY);
      addNode(x, y);
    }
  }, [currentAlgorithm, isVisualizing, handleNodeClick, hasSelectedNodes, screenToSvgCoords, selectNode, addNode, isDraggingEdge, isDraggingCanvas, isBoxSelecting, setVisualizationAlgorithm]);

  // Node label editing
  const { handleLabelEdit, labelPopupElement } = useNodeLabelEdit({
    nodes,
    nodeToScreenCoords: svgToScreenCoords,
    selectNode,
    onCloseFocus: () => graph.current?.focus(),
  });

  // Check if we're in step mode (manual visualization with steps)
  const isInStepMode = visualizationMode === VisualizationMode.MANUAL &&
    visualizationState === VisualizationState.RUNNING;

  // Keyboard navigation hook
  const {
    handleKeyDown: handleCanvasKeyDown,
    handleBlur: handleCanvasBlur,
    handleCloseEdgePopup,
  } = useGraphKeyboardNavigation({
    graphRef: graph,
    svgToScreenCoords,
    isInStepMode,
    closeEdgePopup,
    onAlgorithmNodeSelect: handleNodeClick,
    isAlgorithmSelected: !!currentAlgorithm,
    isVisualizing,
    onLabelEdit: handleLabelEdit,
  });

  // Hide content until viewBox is ready to prevent flicker on mount
  const isReady = viewBox !== undefined;

  return (
    <div className="relative flex-1 w-full h-full flex flex-col">
      <svg
        ref={graph}
        role="application"
        tabIndex={-1}
        className="flex-1 w-full h-full cursor-crosshair focus:outline-none"
        style={{ visibility: isReady ? 'visible' : 'hidden' }}
        onPointerDown={handleCanvasPointerDown}
        onClick={handleCanvasClick}
        onBlur={handleCanvasBlur}
        onKeyDown={handleCanvasKeyDown}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid slice"
        aria-label="Graph canvas"
        data-box-selecting={selectionBox ? true : undefined}
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
            onGroupMove={moveNodes}
            onConnectorDragStart={handleConnectorDragStart}
            isVisualizing={isVisualizing}
            isAlgorithmSelected={!!currentAlgorithm}
            onNodeSelect={selectNode}
            screenToSvgCoords={screenToSvgCoords}
            isGestureActive={isGestureActive}
            onLabelEdit={handleLabelEdit}
          />
        ))}

        <DragPreviewEdge edge={mockEdge} />

        {/* Box selection rectangle - uses same accent color as selected nodes */}
        {selectionBox && (
          <rect
            x={Math.min(selectionBox.startX, selectionBox.currentX)}
            y={Math.min(selectionBox.startY, selectionBox.currentY)}
            width={Math.abs(selectionBox.currentX - selectionBox.startX)}
            height={Math.abs(selectionBox.currentY - selectionBox.startY)}
            fill="var(--color-accent-form)"
            fillOpacity={0.1}
            stroke="var(--color-accent-form)"
            strokeWidth={1}
            strokeDasharray="4"
            className="pointer-events-none"
          />
        )}

      </svg>

      {/* Edge popup - portaled to document.body to escape filter: blur containing block.
          CSS filter creates a new containing block for position: fixed elements,
          causing incorrect positioning on iOS Safari when address bar collapses/expands. */}
      {selectedEdge && createPortal(
        <EdgePopup
          edge={selectedEdge.edge}
          anchorPosition={selectedEdge.clickPosition}
          onClose={handleCloseEdgePopup}
          onUpdateType={updateEdgeType}
          onUpdateWeight={updateEdgeWeight}
          onReverse={reverseEdge}
          onDelete={deleteEdge}
        />,
        document.body
      )}

      {/* Node label popup */}
      {labelPopupElement}
    </div>
  );
}
