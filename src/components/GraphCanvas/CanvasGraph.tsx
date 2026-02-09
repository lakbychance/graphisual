/**
 * Canvas-based graph renderer.
 * High-performance alternative to SVG for large graphs (50+ nodes).
 */

import {
  useRef,
  useEffect,
  useCallback,
  useState,
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
import { EdgePopup } from "../Graph/EdgePopup";
import { VisualizationMode, VisualizationState } from "../../constants/visualization";
import { ZOOM, DRAG_THRESHOLD, TIMING } from "../../constants/ui";
import { getCSSVar } from "../../utils/cssVariables";
import { findToNodeForTouchBasedDevices } from "../../utils/geometry/calc";
import { useSettingsStore } from "../../store/settingsStore";

// Renderers
import { drawGrid } from "./renderers/gridRenderer";
import { drawNode, drawConnectors, invalidateCrosshatchCache } from "./renderers/nodeRenderer";
import { drawEdge, drawPreviewEdge, drawSelectionBox } from "./renderers/edgeRenderer";

// Utilities
import {
  applyViewportTransform,
  resetTransform,
  screenToWorld,
  worldToScreen,
  type ViewportState,
} from "./ViewportTransform";
import { hitTestNodes, hitTestEdges, hitTestConnectors, nodesInRect } from "./HitTesting";
import { canCreateEdge } from "../../utils/graph/edgeUtils";

// Types
import type { NodeColorState, EdgeColorState } from "../../utils/cssVariables";

export interface CanvasGraphHandle {
  getCanvasElement: () => HTMLCanvasElement | null;
}

interface DragState {
  type: 'none' | 'pending-pan' | 'pan' | 'pending-node' | 'node' | 'box-select' | 'edge-create';
  startX: number;
  startY: number;
  startWorldX: number;
  startWorldY: number;
  nodeId?: number;
  isGroupDrag?: boolean;
  groupNodeIds?: number[];
  initialPositions?: Map<number, { x: number; y: number }>;
  connectorNodeId?: number;
}

/**
 * Check if an edge is hovered, accounting for undirected edges.
 * For undirected edges, both directions should show hover state
 * since they're rendered as two separate edges in the store.
 */
function isEdgeHovered(
  nodeId: number,
  edge: { to: number; type: string },
  hoveredEdge: { sourceNodeId: number; toNodeId: number } | null
): boolean {
  if (!hoveredEdge) return false;
  // Direct match
  if (hoveredEdge.sourceNodeId === nodeId && hoveredEdge.toNodeId === edge.to) {
    return true;
  }
  // Reverse match for undirected edges
  if (edge.type === 'undirected') {
    return hoveredEdge.sourceNodeId === edge.to && hoveredEdge.toNodeId === nodeId;
  }
  return false;
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
  useStepThroughVisualization();

  // Check if we're in step mode (manual visualization with steps)
  const isInStepMode = visualizationMode === VisualizationMode.MANUAL &&
    visualizationState === VisualizationState.RUNNING;

  // Convert world coordinates to screen coordinates (for edge popup positioning)
  const worldToScreenCoords = useCallback((worldX: number, worldY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    return worldToScreen(worldX, worldY, canvas, { zoom, pan, width: canvas.clientWidth, height: canvas.clientHeight });
  }, [zoom, pan]);

  // Local state
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<{ sourceNodeId: number; toNodeId: number } | null>(null);
  const [edgeDragSource, setEdgeDragSource] = useState<number | null>(null);
  const [edgeDragTarget, setEdgeDragTarget] = useState<number | null>(null);
  const [dragState, setDragState] = useState<DragState>({ type: 'none', startX: 0, startY: 0, startWorldX: 0, startWorldY: 0 });
  const [previewEdge, setPreviewEdge] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);

  // Track canvas size - triggers re-render when canvas resizes
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setCanvasSize({ width, height });
      }
    });

    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, []);

  // Refs for drag handling
  const dragStateRef = useRef(dragState);
  dragStateRef.current = dragState;
  const isDraggingRef = useRef(false);
  const panAtDragStart = useRef({ x: 0, y: 0 });

  // Expose canvas element
  useImperativeHandle(ref, () => ({
    getCanvasElement: () => canvasRef.current,
  }), []);

  // Viewport state for interaction handlers (width/height not needed - screenToWorld uses canvas.clientWidth/Height)
  const viewportForHitTest = { zoom, pan };

  // Get node color state for visualization
  const getNodeColorState = useCallback((nodeId: number): NodeColorState => {
    if (visualizationInput?.startNodeId === nodeId) return 'start';
    if (visualizationInput?.endNodeId === nodeId) return 'end';
    const flags = visualizationTrace.nodes.get(nodeId);
    if (flags?.isInCycle) return 'cycle';
    if (flags?.isInShortestPath) return 'path';
    if (flags?.isVisited) return 'visited';
    return 'default';
  }, [visualizationInput, visualizationTrace.nodes]);

  // Get edge color state for visualization
  const getEdgeColorState = useCallback((fromId: number, toId: number): EdgeColorState => {
    const flags = visualizationTrace.edges.get(`${fromId}-${toId}`);
    if (flags?.isUsedInCycle) return 'cycle';
    if (flags?.isUsedInShortestPath) return 'path';
    if (flags?.isUsedInTraversal) return 'traversal';
    return 'default';
  }, [visualizationTrace.edges]);

  // Check if edge is focused
  const isEdgeFocused = useCallback((fromId: number, toId: number): boolean => {
    if (!focusedEdge) return false;
    if (focusedEdge.from === fromId && focusedEdge.to === toId) return true;
    // Check reverse for undirected
    if (focusedEdge.from === toId && focusedEdge.to === fromId) {
      const edge = edges.get(fromId)?.find(e => e.to === toId);
      if (edge?.type === 'undirected') return true;
    }
    return false;
  }, [focusedEdge, edges]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get dimensions directly from canvas element
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // Skip rendering until canvas has size
    if (width === 0 || height === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Create viewport with dimensions for rendering
    const actualViewport: ViewportState = {
      zoom,
      pan,
      width,
      height,
    };

    // Clear canvas
    ctx.fillStyle = getCSSVar('--color-paper');
    ctx.fillRect(0, 0, width, height);

    // Apply viewport transform (pass dpr to maintain high-DPI scaling)
    applyViewportTransform(ctx, actualViewport, dpr);

    // Draw grid
    drawGrid(ctx, actualViewport);

    // Draw edges (all edges first, behind nodes)
    const orderedNodeIds = [...stackingOrder];
    for (const nodeId of orderedNodeIds) {
      const nodeEdges = edges.get(nodeId);
      if (nodeEdges) {
        for (const edge of nodeEdges) {
          // Check if edge is hovered or focused
          const isHovered = isEdgeHovered(nodeId, edge, hoveredEdge);
          drawEdge(ctx, edge, {
            colorState: getEdgeColorState(nodeId, edge.to),
            isFocused: isEdgeFocused(nodeId, edge.to) || isHovered,
          });
        }
      }
    }

    // Draw preview edge (during edge creation) - before nodes so it appears behind them
    if (previewEdge) {
      drawPreviewEdge(ctx, previewEdge.startX, previewEdge.startY, previewEdge.endX, previewEdge.endY);
    }

    // Draw nodes (in stacking order)
    for (const nodeId of orderedNodeIds) {
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        const isSelected = selectedNodeIds.has(nodeId);
        const isHovered = hoveredNodeId === nodeId;
        const isEdgeDragSourceNode = edgeDragSource === nodeId;
        const isEdgeDragTargetNode = edgeDragTarget === nodeId;

        drawNode(ctx, node, {
          isSelected,
          isHovered: isHovered && !!currentAlgorithm && !isVisualizing,
          colorState: getNodeColorState(nodeId),
          isEdgeCreateSource: isEdgeDragSourceNode,
          isEdgeCreateTarget: isEdgeDragTargetNode,
        });

        // Draw connectors on hover (when not visualizing/algorithm mode/edge dragging)
        if (isHovered && !isVisualizing && !currentAlgorithm && !edgeDragSource) {
          drawConnectors(ctx, node, true);
        }
      }
    }

    // Draw selection box
    if (selectionBox) {
      drawSelectionBox(ctx, selectionBox.startX, selectionBox.startY, selectionBox.currentX, selectionBox.currentY);
    }

    // Reset transform for any screen-space overlays
    resetTransform(ctx);

  }, [
    canvasSize,
    zoom,
    pan,
    nodes,
    edges,
    stackingOrder,
    selectedNodeIds,
    hoveredNodeId,
    hoveredEdge,
    edgeDragSource,
    edgeDragTarget,
    getNodeColorState,
    getEdgeColorState,
    isEdgeFocused,
    previewEdge,
    selectionBox,
    currentAlgorithm,
    isVisualizing,
    theme, // Re-render when theme changes
  ]);

  // Wheel zoom handler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const zoomSensitivity = 0.01;
      const zoomDelta = -e.deltaY * zoomSensitivity;
      const currentZoom = zoomTarget;
      const newZoom = Math.min(ZOOM.MAX, Math.max(ZOOM.MIN, currentZoom + zoomDelta));

      if (newZoom === currentZoom) return;

      // Zoom toward cursor - use canvas actual size
      const cursorX = e.clientX - canvas.getBoundingClientRect().left;
      const cursorY = e.clientY - canvas.getBoundingClientRect().top;

      const centerX = canvas.clientWidth / 2;
      const centerY = canvas.clientHeight / 2;

      const zoomRatioDelta = 1 / currentZoom - 1 / newZoom;
      const newPanX = panTarget.x + zoomRatioDelta * (centerX - cursorX);
      const newPanY = panTarget.y + zoomRatioDelta * (centerY - cursorY);

      setViewportZoom(newZoom);
      setViewportPan(newPanX, newPanY);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [zoomTarget, panTarget, setViewportZoom, setViewportPan]);

  // Mouse move handler for hover detection
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || dragStateRef.current.type !== 'none') return;

    const world = screenToWorld(e.clientX, e.clientY, canvas, viewportForHitTest);
    const hitNode = hitTestNodes(world.x, world.y, nodes, stackingOrder);

    setHoveredNodeId(hitNode?.id ?? null);

    // Check for edge hover (only if not hovering a node)
    if (!hitNode && !isVisualizing) {
      const hitEdge = hitTestEdges(world.x, world.y, edges);
      if (hitEdge) {
        setHoveredEdge({ sourceNodeId: hitEdge.sourceNodeId, toNodeId: hitEdge.edge.to });
      } else {
        setHoveredEdge(null);
      }
    } else {
      setHoveredEdge(null);
    }
  }, [nodes, edges, stackingOrder, viewportForHitTest, isVisualizing]);

  // Mouse leave handler
  const handleMouseLeave = useCallback(() => {
    setHoveredNodeId(null);
    setHoveredEdge(null);
  }, []);

  // Pointer down handler
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const world = screenToWorld(e.clientX, e.clientY, canvas, viewportForHitTest);
    const hitNode = hitTestNodes(world.x, world.y, nodes, stackingOrder);

    // Box selection (Shift + empty canvas)
    if (e.shiftKey && !hitNode && !currentAlgorithm) {
      setDragState({
        type: 'box-select',
        startX: e.clientX,
        startY: e.clientY,
        startWorldX: world.x,
        startWorldY: world.y,
      });
      isDraggingRef.current = false;
      return;
    }

    // Node interaction
    if (hitNode) {
      // Algorithm mode - click to select
      if (currentAlgorithm && !isVisualizing) {
        handleNodeClick(hitNode.id);
        return;
      }

      // Check if clicking on connector (for edge creation)
      if (!isVisualizing && !currentAlgorithm && hoveredNodeId === hitNode.id) {
        const connectorHit = hitTestConnectors(world.x, world.y, hitNode);
        if (connectorHit) {
          // Start edge creation drag
          setDragState({
            type: 'edge-create',
            startX: e.clientX,
            startY: e.clientY,
            startWorldX: hitNode.x,
            startWorldY: hitNode.y,
            connectorNodeId: hitNode.id,
          });
          setEdgeDragSource(hitNode.id);
          isDraggingRef.current = false;
          canvas.setPointerCapture(e.pointerId);
          return;
        }
      }

      // Start node drag
      if (!isVisualizing && !currentAlgorithm) {
        const isSelected = selectedNodeIds.has(hitNode.id);
        const isGroupDrag = isSelected && selectedNodeIds.size > 1;
        const groupNodeIds = isGroupDrag ? Array.from(selectedNodeIds) : [];

        // Store initial positions for group drag
        const initialPositions = new Map<number, { x: number; y: number }>();
        if (isGroupDrag) {
          for (const nodeId of groupNodeIds) {
            const node = nodes.find(n => n.id === nodeId);
            if (node) {
              initialPositions.set(nodeId, { x: node.x, y: node.y });
            }
          }
        }

        setDragState({
          type: 'pending-node',
          startX: e.clientX,
          startY: e.clientY,
          startWorldX: world.x,
          startWorldY: world.y,
          nodeId: hitNode.id,
          isGroupDrag,
          groupNodeIds,
          initialPositions,
        });
        isDraggingRef.current = false;
        canvas.setPointerCapture(e.pointerId);
      }
      return;
    }

    // Edge click detection
    const hitEdge = hitTestEdges(world.x, world.y, edges);
    if (hitEdge && !isVisualizing) {
      const sourceNode = nodes.find(n => n.id === hitEdge.sourceNodeId);
      if (sourceNode) {
        selectEdge(hitEdge.edge, sourceNode, { x: e.clientX, y: e.clientY });
      }
      return;
    }

    // Empty canvas - potential pan or click to create node
    panAtDragStart.current = { ...panTarget };
    setDragState({
      type: 'pending-pan',
      startX: e.clientX,
      startY: e.clientY,
      startWorldX: world.x,
      startWorldY: world.y,
    });
    isDraggingRef.current = false;
  }, [
    viewportForHitTest,
    nodes,
    edges,
    stackingOrder,
    selectedNodeIds,
    hoveredNodeId,
    currentAlgorithm,
    isVisualizing,
    handleNodeClick,
    selectEdge,
    panTarget,
  ]);

  // Pointer move handler
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const state = dragStateRef.current;
    if (state.type === 'none') return;

    const deltaX = e.clientX - state.startX;
    const deltaY = e.clientY - state.startY;

    // Check drag threshold
    if (!isDraggingRef.current) {
      if (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD) {
        isDraggingRef.current = true;

        // Transition pending states to active states once threshold exceeded
        if (state.type === 'pending-pan') {
          setDragState(prev => ({ ...prev, type: 'pan' }));
          state.type = 'pan'; // Update local reference too
        }
        if (state.type === 'pending-node') {
          setDragState(prev => ({ ...prev, type: 'node' }));
          state.type = 'node'; // Update local reference too
        }

        // Bring node(s) to front on first drag movement
        if (state.type === 'node') {
          if (state.isGroupDrag && state.groupNodeIds) {
            bringNodesToFront(state.groupNodeIds);
          } else if (state.nodeId !== undefined) {
            bringNodeToFront(state.nodeId);
            // If dragging unselected node, select it
            if (!selectedNodeIds.has(state.nodeId)) {
              selectNode(state.nodeId);
            }
          }
        }
      } else {
        return;
      }
    }

    const world = screenToWorld(e.clientX, e.clientY, canvas, viewportForHitTest);

    switch (state.type) {
      case 'pan':
        setViewportPan(
          panAtDragStart.current.x + deltaX / zoom,
          panAtDragStart.current.y + deltaY / zoom
        );
        break;

      case 'node':
        if (state.isGroupDrag && state.groupNodeIds && state.initialPositions) {
          const worldDeltaX = world.x - state.startWorldX;
          const worldDeltaY = world.y - state.startWorldY;
          moveNodes(state.groupNodeIds, worldDeltaX, worldDeltaY);
          // Update start position for next delta
          setDragState(prev => ({
            ...prev,
            startWorldX: world.x,
            startWorldY: world.y,
          }));
        } else if (state.nodeId !== undefined) {
          moveNode(state.nodeId, world.x, world.y);
        }
        break;

      case 'box-select':
        setSelectionBox({
          startX: state.startWorldX,
          startY: state.startWorldY,
          currentX: world.x,
          currentY: world.y,
        });
        // Select nodes in box
        const nodesInBox = nodesInRect(nodes, state.startWorldX, state.startWorldY, world.x, world.y);
        selectNodes(nodesInBox.map(n => n.id));
        break;

      case 'edge-create':
        setPreviewEdge({
          startX: state.startWorldX,
          startY: state.startWorldY,
          endX: world.x,
          endY: world.y,
        });
        // Detect target node during edge drag
        const targetNode = hitTestNodes(world.x, world.y, nodes, stackingOrder);
        if (targetNode && targetNode.id !== state.connectorNodeId) {
          setEdgeDragTarget(targetNode.id);
        } else {
          setEdgeDragTarget(null);
        }
        break;
    }
  }, [
    viewportForHitTest,
    zoom,
    nodes,
    stackingOrder,
    selectedNodeIds,
    moveNode,
    moveNodes,
    selectNode,
    selectNodes,
    setViewportPan,
    bringNodeToFront,
    bringNodesToFront,
  ]);

  // Pointer up handler
  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const state = dragStateRef.current;
    canvas.releasePointerCapture(e.pointerId);

    // Handle edge creation drop
    if (state.type === 'edge-create' && state.connectorNodeId !== undefined) {
      const world = screenToWorld(e.clientX, e.clientY, canvas, viewportForHitTest);
      const targetNode = findToNodeForTouchBasedDevices(world.x, world.y, nodes);
      if (targetNode && canCreateEdge(edges, state.connectorNodeId, targetNode.id)) {
        const sourceNode = nodes.find(n => n.id === state.connectorNodeId);
        if (sourceNode) {
          addEdge(sourceNode, targetNode);
        }
      }
    }

    // Handle click (no drag)
    if (!isDraggingRef.current) {
      const world = screenToWorld(e.clientX, e.clientY, canvas, viewportForHitTest);
      const hitNode = hitTestNodes(world.x, world.y, nodes, stackingOrder);

      if (state.type === 'pending-node' && state.nodeId !== undefined) {
        // Toggle node selection (clicked without dragging)
        const isSelected = selectedNodeIds.has(state.nodeId);
        selectNode(isSelected ? null : state.nodeId);
      } else if (state.type === 'pending-pan' && !hitNode) {
        // Clicked on empty canvas (didn't drag, so still pending-pan)
        if (currentAlgorithm && !isVisualizing) {
          // Cancel algorithm selection
          setVisualizationAlgorithm(undefined);
        } else if (selectedNodeIds.size > 0) {
          // Deselect all nodes
          selectNode(null);
        } else if (!currentAlgorithm && !isVisualizing) {
          // Create new node
          addNode(world.x, world.y);
        }
      }
    }

    // Reset drag state
    setDragState({ type: 'none', startX: 0, startY: 0, startWorldX: 0, startWorldY: 0 });
    setPreviewEdge(null);
    setSelectionBox(null);
    setEdgeDragSource(null);
    setEdgeDragTarget(null);

    setTimeout(() => {
      isDraggingRef.current = false;
    }, TIMING.POPUP_DELAY);
  }, [
    viewportForHitTest,
    nodes,
    edges,
    stackingOrder,
    selectedNodeIds,
    currentAlgorithm,
    isVisualizing,
    addNode,
    addEdge,
    selectNode,
    setVisualizationAlgorithm,
  ]);

  // Close edge popup (basic version for keyboard nav hook)
  const closeEdgePopup = useCallback(() => {
    clearEdgeSelection();
  }, [clearEdgeSelection]);

  // Keyboard navigation hook
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
  });

  // Edge popup handlers
  const handleUpdateEdgeType = useGraphStore((state) => state.updateEdgeType);
  const handleUpdateEdgeWeight = useGraphStore((state) => state.updateEdgeWeight);
  const handleReverseEdge = useGraphStore((state) => state.reverseEdge);
  const handleDeleteEdge = useGraphStore((state) => state.deleteEdge);

  // Compute cursor based on current state
  const getCursor = () => {
    // During edge creation drag: crosshair
    if (dragState.type === 'edge-create') return 'crosshair';
    // During node drag: move
    if (dragState.type === 'node') return 'move';
    // During pan: grabbing
    if (dragState.type === 'pan') return 'grabbing';
    // During box select: crosshair
    if (dragState.type === 'box-select') return 'crosshair';
    // Hovering over edge: pointer (clickable)
    if (hoveredEdge) return 'pointer';
    // Hovering over node: default pointer
    if (hoveredNodeId !== null) return 'default';
    // Empty area: crosshair (indicates click to create node)
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
        onKeyDown={handleCanvasKeyDown}
        onBlur={handleCanvasBlur}
        aria-label="Graph canvas"
      />

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
