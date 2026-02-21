/**
 * Canvas-based graph renderer.
 * High-performance alternative to SVG for large graphs (50+ nodes).
 */

import {
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import { useShallow } from "zustand/shallow";
import { useGraphStore } from "../../store/graphStore";
import { useSpringViewport } from "../../hooks/useSpringViewport";
import { useVisualizationExecution } from "../../hooks/useVisualizationExecution";
import { useAlgorithmNodeClick } from "../../hooks/useAlgorithmNodeClick";
import { useStepThroughVisualization } from "../../hooks/useStepThroughVisualization";
import { useNodeActions } from "../../hooks/useNodeActions";
import { useGraphKeyboardNavigation } from "../../hooks/useGraphKeyboardNavigation";
import { useGestureZoom } from "../../hooks/useGestureZoom";
import { useElementDimensions } from "../../hooks/useElementDimensions";
import { useCanvasColorState } from "../../hooks/useCanvasColorState";
import { useCanvasInteractions } from "../../hooks/useCanvasInteractions";
import { useCanvasRenderLoop } from "../../hooks/useCanvasRenderLoop";
import { useNodeLabelEdit } from "../../hooks/useNodeLabelEdit";
import { EdgePopup } from "../Graph/EdgePopup";
import { VisualizationMode, VisualizationState } from "../../constants/visualization";
import { useSettingsStore } from "../../store/settingsStore";
import { useIsDesktop } from "../../hooks/useMediaQuery";

// Renderers
import { invalidateCrosshatchCache } from "./renderers/nodeRenderer";

// Utilities
import {
  worldToScreen,
  screenToWorld,
} from "./ViewportTransform";
import { hitTestNodesBody } from "./HitTesting";

export interface CanvasGraphHandle {
  getCanvasElement: () => HTMLCanvasElement | null;
}

export function CanvasGraph({ ref }: { ref?: Ref<CanvasGraphHandle> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Graph state
  const nodes = useGraphStore(useShallow((state) => state.data.nodes));
  const edges = useGraphStore((state) => state.data.edges);
  const stackingOrder = useGraphStore((state) => state.data.stackingOrder);
  const selectedNodeIds = useGraphStore((state) => state.selection.nodeIds);
  const selectedEdge = useGraphStore((state) => state.selection.edge);
  const focusedEdge = useGraphStore((state) => state.selection.focusedEdge);
  const visualizationInput = useGraphStore((state) => state.visualization.input);
  const visualizationTrace = useGraphStore((state) => state.visualization.trace);
  const visualizationMode = useGraphStore((state) => state.visualization.mode);
  const visualizationState = useGraphStore((state) => state.visualization.state);

  // Viewport state
  const zoomTarget = useGraphStore((state) => state.viewport.zoom);
  const panTarget = useGraphStore((state) => state.viewport.pan);
  const { zoom, pan } = useSpringViewport({ zoomTarget, panTarget });

  // Theme subscription for re-rendering on theme change
  const theme = useSettingsStore((state) => state.theme);

  useEffect(() => {
    invalidateCrosshatchCache();
  }, [theme]);

  // Actions
  const { addNode, moveNode, selectNode } = useNodeActions();
  const moveNodes = useGraphStore((state) => state.moveNodes);
  const selectNodes = useGraphStore((state) => state.selectNodes);
  const setViewportPan = useGraphStore((state) => state.setViewportPan);
  const setViewportZoom = useGraphStore((state) => state.setViewportZoom);
  const setVisualizationAlgorithm = useGraphStore((state) => state.setVisualizationAlgorithm);
  const selectEdge = useGraphStore((state) => state.selectEdge);
  const clearEdgeSelection = useGraphStore((state) => state.clearEdgeSelection);
  const addEdge = useGraphStore((state) => state.addEdge);
  const bringNodeToFront = useGraphStore((state) => state.bringNodeToFront);
  const bringNodesToFront = useGraphStore((state) => state.bringNodesToFront);

  // Visualization hooks
  const { handleNodeClick } = useAlgorithmNodeClick();
  const { currentAlgorithm, isVisualizing } = useVisualizationExecution();
  const isDesktop = useIsDesktop();
  useStepThroughVisualization();

  const isInStepMode = visualizationMode === VisualizationMode.MANUAL &&
    visualizationState === VisualizationState.RUNNING;

  // Convert world coordinates to screen coordinates (for popup positioning)
  const worldToScreenCoords = useCallback((worldX: number, worldY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    return worldToScreen(worldX, worldY, canvas, { zoom, pan, width: canvas.clientWidth, height: canvas.clientHeight });
  }, [zoom, pan]);

  // Node label editing
  const { handleLabelEdit, labelPopupElement } = useNodeLabelEdit({
    nodes,
    nodeToScreenCoords: worldToScreenCoords,
    selectNode,
    onCloseFocus: () => canvasRef.current?.focus(),
  });

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !isDesktop || isVisualizing || currentAlgorithm) return;
    const world = screenToWorld(e.clientX, e.clientY, canvas, { zoom, pan });
    const hitNode = hitTestNodesBody(world.x, world.y, nodes, stackingOrder);
    if (hitNode) {
      handleLabelEdit(hitNode.id);
    }
  }, [isDesktop, isVisualizing, currentAlgorithm, zoom, pan, nodes, stackingOrder, handleLabelEdit]);

  // Track canvas size - triggers re-render when canvas resizes
  const canvasSize = useElementDimensions(canvasRef);

  // Expose canvas element
  useImperativeHandle(ref, () => ({
    getCanvasElement: () => canvasRef.current,
  }), []);

  // --- Custom hooks ---

  // Zoom (wheel + pinch-to-zoom)
  useGestureZoom({
    elementRef: canvasRef,
    zoom: zoomTarget,
    setZoom: setViewportZoom,
    pan: panTarget,
    setPan: setViewportPan,
  });

  // Color state for visualization
  const { getNodeColorState, getEdgeColorState, isEdgeFocused } = useCanvasColorState({
    visualizationInput,
    visualizationTrace,
    focusedEdge,
    edges,
  });

  // Interactions (drag state machine, pointer handlers, hover detection)
  const {
    previewEdge,
    selectionBox,
    edgeDragSource,
    edgeDragTarget,
    hoveredNodeId,
    hoveredBodyNodeId,
    hoveredEdge,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleMouseMove,
    handleMouseLeave,
    getCursorStyle,
  } = useCanvasInteractions({
    canvasRef,
    nodes,
    edges,
    stackingOrder,
    selectedNodeIds,
    zoom,
    pan,
    panTarget,
    currentAlgorithm,
    isVisualizing,
    addNode,
    moveNode,
    moveNodes,
    selectNode,
    selectNodes,
    selectEdge,
    addEdge,
    setViewportPan,
    setVisualizationAlgorithm,
    bringNodeToFront,
    bringNodesToFront,
    handleNodeClick,
  });

  useCanvasRenderLoop({
    canvasRef,
    canvasSize,
    zoom,
    pan,
    nodes,
    edges,
    stackingOrder,
    selectedNodeIds,
    hoveredNodeId,
    hoveredBodyNodeId,
    hoveredEdge,
    edgeDragSource,
    edgeDragTarget,
    previewEdge,
    selectionBox,
    getNodeColorState,
    getEdgeColorState,
    isEdgeFocused,
    currentAlgorithm,
    isVisualizing,
    theme,
  });

  // Keyboard navigation
  const closeEdgePopup = useCallback(() => {
    clearEdgeSelection();
  }, [clearEdgeSelection]);

  const {
    handleKeyDown: handleCanvasKeyDown,
    handleBlur: handleCanvasBlur,
    handleCloseEdgePopup,
  } = useGraphKeyboardNavigation({
    graphRef: canvasRef,
    svgToScreenCoords: worldToScreenCoords,
    isInStepMode,
    closeEdgePopup,
    onAlgorithmNodeSelect: handleNodeClick,
    isAlgorithmSelected: !!currentAlgorithm,
    isVisualizing,
    onLabelEdit: handleLabelEdit,
  });

  // Edge popup handlers
  const handleUpdateEdgeType = useGraphStore((state) => state.updateEdgeType);
  const handleUpdateEdgeWeight = useGraphStore((state) => state.updateEdgeWeight);
  const handleReverseEdge = useGraphStore((state) => state.reverseEdge);
  const handleDeleteEdge = useGraphStore((state) => state.deleteEdge);

  // Compute cursor
  const getCursor = () => {
    const interactionCursor = getCursorStyle();
    if (interactionCursor) return interactionCursor;
    if (hoveredEdge) return 'pointer';
    if (hoveredNodeId !== null) return 'default';
    return 'crosshair';
  };

  return (
    <div ref={containerRef} className="relative flex-1 w-full h-full">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 focus:outline-none"
        style={{ width: '100%', height: '100%', cursor: getCursor(), touchAction: 'none' }}
        tabIndex={-1}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleCanvasKeyDown}
        onBlur={handleCanvasBlur}
        aria-label="Graph canvas"
      />

      {/* Node label popup */}
      {labelPopupElement}

      {/* Edge popup - same as SVG version */}
      {selectedEdge && createPortal(
        <EdgePopup
          edge={selectedEdge.edge}
          anchorPosition={selectedEdge.clickPosition}
          onClose={handleCloseEdgePopup}
          onUpdateType={(type) => handleUpdateEdgeType(selectedEdge.sourceNode.id, selectedEdge.edge.to, type)}
          onUpdateWeight={(weight) => handleUpdateEdgeWeight(selectedEdge.sourceNode.id, selectedEdge.edge.to, weight)}
          onReverse={() => handleReverseEdge(selectedEdge.sourceNode.id, selectedEdge.edge.to)}
          onDelete={() => handleDeleteEdge(selectedEdge.sourceNode.id, selectedEdge.edge.to)}
        />,
        document.body
      )}
    </div>
  );
}
