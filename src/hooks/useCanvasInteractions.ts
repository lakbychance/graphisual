import { useState, useCallback, useRef, type RefObject, useMemo } from "react";
import type { GraphNode, GraphEdge } from "../components/Graph/types";
import { screenToWorld } from "../components/GraphCanvas/ViewportTransform";
import { hitTestNodes, hitTestNodesBody, hitTestEdges, hitTestConnectors, nodesInRect } from "../components/GraphCanvas/HitTesting";
import type { HoveredEdge, PreviewEdge, SelectionBox } from "../components/GraphCanvas/types";
import { canCreateEdge } from "../utils/graph/edgeUtils";
import { findToNodeForTouchBasedDevices } from "../utils/geometry/calc";
import { DRAG_THRESHOLD, TIMING } from "../constants/ui";

export interface DragState {
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

interface UseCanvasInteractionsProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  nodes: GraphNode[];
  edges: Map<number, GraphEdge[]>;
  stackingOrder: Set<number>;
  selectedNodeIds: Set<number>;
  zoom: number;
  pan: { x: number; y: number };
  panTarget: { x: number; y: number };
  currentAlgorithm: unknown;
  isVisualizing: boolean;
  // Actions
  addNode: (x: number, y: number) => void;
  moveNode: (id: number, x: number, y: number) => void;
  moveNodes: (ids: number[], deltaX: number, deltaY: number) => void;
  selectNode: (id: number | null) => void;
  selectNodes: (ids: number[]) => void;
  selectEdge: (edge: GraphEdge, sourceNode: GraphNode, clickPosition: { x: number; y: number }) => void;
  addEdge: (source: GraphNode, target: GraphNode) => void;
  setViewportPan: (x: number, y: number) => void;
  setVisualizationAlgorithm: (algorithm: undefined) => void;
  bringNodeToFront: (id: number) => void;
  bringNodesToFront: (ids: number[]) => void;
  handleNodeClick: (id: number) => void;
}

export function useCanvasInteractions({
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
}: UseCanvasInteractionsProps) {
  // Drag state
  const [dragState, setDragState] = useState<DragState>({ type: 'none', startX: 0, startY: 0, startWorldX: 0, startWorldY: 0 });
  const [previewEdge, setPreviewEdge] = useState<PreviewEdge | null>(null);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [edgeDragSource, setEdgeDragSource] = useState<number | null>(null);
  const [edgeDragTarget, setEdgeDragTarget] = useState<number | null>(null);

  // Hover state
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);
  const [hoveredBodyNodeId, setHoveredBodyNodeId] = useState<number | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<HoveredEdge | null>(null);

  const dragStateRef = useRef(dragState);
  dragStateRef.current = dragState;
  const isDraggingRef = useRef(false);
  const panAtDragStart = useRef({ x: 0, y: 0 });
  const hoveredNodeIdRef = useRef<number | null>(null);

  const viewportForHitTest = useMemo(() => ({ zoom, pan }), [zoom, pan]);

  // --- Hover handlers ---

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || dragStateRef.current.type !== 'none') return;

    const world = screenToWorld(e.clientX, e.clientY, canvas, viewportForHitTest);
    const hitNode = hitTestNodes(world.x, world.y, nodes, stackingOrder);
    const hitNodeBody = hitTestNodesBody(world.x, world.y, nodes, stackingOrder);

    const newHoveredId = hitNode?.id ?? null;
    setHoveredNodeId(newHoveredId);
    setHoveredBodyNodeId(hitNodeBody?.id ?? null);
    hoveredNodeIdRef.current = newHoveredId;

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
  }, [canvasRef, nodes, edges, stackingOrder, viewportForHitTest, isVisualizing]);

  const handleMouseLeave = useCallback(() => {
    setHoveredNodeId(null);
    setHoveredBodyNodeId(null);
    hoveredNodeIdRef.current = null;
    setHoveredEdge(null);
  }, []);

  // --- Pointer handlers ---

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const world = screenToWorld(e.clientX, e.clientY, canvas, viewportForHitTest);
    // Use body-only hit test: selection and drag only trigger on the visible node circle
    const hitNode = hitTestNodesBody(world.x, world.y, nodes, stackingOrder);

    // Box selection (Shift + empty canvas body)
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

    // Node body interaction (selection, drag, algorithm click)
    if (hitNode) {
      // Algorithm mode - click to select
      if (currentAlgorithm && !isVisualizing) {
        handleNodeClick(hitNode.id);
        return;
      }

      // Start node drag
      if (!isVisualizing && !currentAlgorithm) {
        const isSelected = selectedNodeIds.has(hitNode.id);
        const isGroupDrag = isSelected && selectedNodeIds.size > 1;
        const groupNodeIds = isGroupDrag ? Array.from(selectedNodeIds) : [];

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

    // Connector check: connectors live in the hit-area ring (outside body, inside extended radius).
    // Use a fresh full-radius hit test rather than hoveredNodeIdRef, which may be stale if
    // pointer-down fires without a preceding mousemove (e.g. fast pointer entry from outside).
    if (!isVisualizing && !currentAlgorithm) {
      const hitNodeFull = hitTestNodes(world.x, world.y, nodes, stackingOrder);
      if (hitNodeFull) {
        const connectorHit = hitTestConnectors(world.x, world.y, hitNodeFull);
        if (connectorHit) {
          setDragState({
            type: 'edge-create',
            startX: e.clientX,
            startY: e.clientY,
            startWorldX: hitNodeFull.x,
            startWorldY: hitNodeFull.y,
            connectorNodeId: hitNodeFull.id,
          });
          setEdgeDragSource(hitNodeFull.id);
          isDraggingRef.current = false;
          canvas.setPointerCapture(e.pointerId);
          return;
        }
      }
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
    canvasRef,
    viewportForHitTest,
    nodes,
    edges,
    stackingOrder,
    selectedNodeIds,
    currentAlgorithm,
    isVisualizing,
    handleNodeClick,
    selectEdge,
    panTarget,
  ]);

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

        if (state.type === 'pending-pan') {
          setDragState(prev => ({ ...prev, type: 'pan' }));
          state.type = 'pan';
        }
        if (state.type === 'pending-node') {
          setDragState(prev => ({ ...prev, type: 'node' }));
          state.type = 'node';
        }

        // Bring node(s) to front on first drag movement
        if (state.type === 'node') {
          if (state.isGroupDrag && state.groupNodeIds) {
            bringNodesToFront(state.groupNodeIds);
          } else if (state.nodeId !== undefined) {
            bringNodeToFront(state.nodeId);
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
          setDragState(prev => ({
            ...prev,
            startWorldX: world.x,
            startWorldY: world.y,
          }));
        } else if (state.nodeId !== undefined) {
          moveNode(state.nodeId, world.x, world.y);
        }
        break;

      case 'box-select': {
        setSelectionBox({
          startX: state.startWorldX,
          startY: state.startWorldY,
          currentX: world.x,
          currentY: world.y,
        });
        const nodesInBox = nodesInRect(nodes, state.startWorldX, state.startWorldY, world.x, world.y);
        selectNodes(nodesInBox.map(n => n.id));
        break;
      }

      case 'edge-create': {
        setPreviewEdge({
          startX: state.startWorldX,
          startY: state.startWorldY,
          endX: world.x,
          endY: world.y,
        });
        const targetNode = hitTestNodes(world.x, world.y, nodes, stackingOrder);
        if (targetNode && targetNode.id !== state.connectorNodeId) {
          setEdgeDragTarget(targetNode.id);
        } else {
          setEdgeDragTarget(null);
        }
        break;
      }
    }
  }, [
    canvasRef,
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
      const hitNode = hitTestNodesBody(world.x, world.y, nodes, stackingOrder);

      if (state.type === 'pending-node' && state.nodeId !== undefined) {
        const isSelected = selectedNodeIds.has(state.nodeId);
        selectNode(isSelected ? null : state.nodeId);
      } else if (state.type === 'pending-pan' && !hitNode) {
        if (currentAlgorithm && !isVisualizing) {
          setVisualizationAlgorithm(undefined);
        } else if (selectedNodeIds.size > 0) {
          selectNode(null);
        } else if (!currentAlgorithm && !isVisualizing) {
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
    canvasRef,
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

  // Cursor style based on current state
  const getCursorStyle = () => {
    if (dragState.type === 'edge-create') return 'crosshair';
    if (dragState.type === 'node') return 'move';
    if (dragState.type === 'pan') return 'grabbing';
    if (dragState.type === 'box-select') return 'crosshair';
    return null; // Let the caller decide default cursor
  };

  return {
    // Drag state (for rendering)
    previewEdge,
    selectionBox,
    edgeDragSource,
    edgeDragTarget,
    // Hover state (for rendering)
    hoveredNodeId,
    hoveredBodyNodeId,
    hoveredEdge,
    // Event handlers
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleMouseMove,
    handleMouseLeave,
    getCursorStyle,
  };
}
