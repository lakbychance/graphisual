import { useEffect, type RefObject } from "react";
import type { GraphEdge, GraphNode } from "../components/Graph/types";
import type { HoveredEdge, PreviewEdge, SelectionBox } from "../components/GraphCanvas/types";
import type { EdgeColorState, NodeColorState } from "../utils/cssVariables";
import { getCSSVar } from "../utils/cssVariables";
import { applyViewportTransform, resetTransform } from "../components/GraphCanvas/ViewportTransform";
import { drawGrid } from "../components/GraphCanvas/renderers/gridRenderer";
import { drawNode, drawConnectors } from "../components/GraphCanvas/renderers/nodeRenderer";
import { drawEdge, drawPreviewEdge, drawSelectionBox } from "../components/GraphCanvas/renderers/edgeRenderer";

interface UseCanvasRenderLoopProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  canvasSize: { width: number; height: number };
  zoom: number;
  pan: { x: number; y: number };
  nodes: GraphNode[];
  edges: Map<number, GraphEdge[]>;
  stackingOrder: Set<number>;
  selectedNodeIds: Set<number>;
  hoveredNodeId: number | null;
  hoveredBodyNodeId: number | null;
  hoveredEdge: HoveredEdge | null;
  edgeDragSource: number | null;
  edgeDragTarget: number | null;
  previewEdge: PreviewEdge | null;
  selectionBox: SelectionBox | null;
  getNodeColorState: (nodeId: number) => NodeColorState;
  getEdgeColorState: (fromId: number, toId: number) => EdgeColorState;
  isEdgeFocused: (fromId: number, toId: number) => boolean;
  currentAlgorithm: unknown;
  isVisualizing: boolean;
  theme: unknown;
}

function isEdgeHovered(
  nodeId: number,
  edge: { to: number; type: string },
  hoveredEdge: HoveredEdge | null
): boolean {
  if (!hoveredEdge) return false;
  if (hoveredEdge.sourceNodeId === nodeId && hoveredEdge.toNodeId === edge.to) {
    return true;
  }
  if (edge.type === "undirected") {
    return hoveredEdge.sourceNodeId === edge.to && hoveredEdge.toNodeId === nodeId;
  }
  return false;
}

export function useCanvasRenderLoop({
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
}: UseCanvasRenderLoopProps): void {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (width === 0 || height === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const actualViewport = { zoom, pan, width, height };

    ctx.fillStyle = getCSSVar("--color-paper");
    ctx.fillRect(0, 0, width, height);

    applyViewportTransform(ctx, actualViewport, dpr);
    drawGrid(ctx, actualViewport);

    const orderedNodeIds = [...stackingOrder];

    for (const nodeId of orderedNodeIds) {
      const nodeEdges = edges.get(nodeId);
      if (!nodeEdges) continue;

      for (const edge of nodeEdges) {
        const hovered = isEdgeHovered(nodeId, edge, hoveredEdge);
        drawEdge(ctx, edge, {
          colorState: getEdgeColorState(nodeId, edge.to),
          isFocused: isEdgeFocused(nodeId, edge.to) || hovered,
        });
      }
    }

    if (previewEdge) {
      drawPreviewEdge(
        ctx,
        previewEdge.startX,
        previewEdge.startY,
        previewEdge.endX,
        previewEdge.endY
      );
    }

    for (const nodeId of orderedNodeIds) {
      const node = nodes.find((candidate) => candidate.id === nodeId);
      if (!node) continue;

      const isSelected = selectedNodeIds.has(nodeId);
      const isHovered = hoveredNodeId === nodeId;
      const isEdgeDragSourceNode = edgeDragSource === nodeId;
      const isEdgeDragTargetNode = edgeDragTarget === nodeId;

      drawNode(ctx, node, {
        isSelected,
        isHovered: hoveredBodyNodeId === nodeId && !!currentAlgorithm && !isVisualizing,
        colorState: getNodeColorState(nodeId),
        isEdgeCreateSource: isEdgeDragSourceNode,
        isEdgeCreateTarget: isEdgeDragTargetNode,
      });

      if (isHovered && !isVisualizing && !currentAlgorithm && !edgeDragSource) {
        drawConnectors(ctx, node, true);
      }
    }

    if (selectionBox) {
      drawSelectionBox(
        ctx,
        selectionBox.startX,
        selectionBox.startY,
        selectionBox.currentX,
        selectionBox.currentY
      );
    }

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
    hoveredBodyNodeId,
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
    theme,
    canvasRef,
  ]);
}
