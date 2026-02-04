import { useCallback, useRef } from "react";
import { GraphNode, GraphEdge } from "../components/Graph/types";
import { findToNodeForTouchBasedDevices } from "../utils/geometry/calc";
import { TIMING } from "../constants/ui";
import { EDGE, EDGE_TYPE } from "../constants/graph";
import { useGraphStore } from "../store/graphStore";

interface UseEdgeDraggingProps {
  graphRef: React.RefObject<SVGSVGElement | null>;
  screenToSvgCoords: (clientX: number, clientY: number) => { x: number; y: number };
  setMockEdge: (edge: GraphEdge | null) => void;
}

export function useEdgeDragging({
  graphRef,
  screenToSvgCoords,
  setMockEdge,
}: UseEdgeDraggingProps) {
  const isDraggingEdge = useRef(false);
  const addEdge = useGraphStore((state) => state.addEdge);

  const handleConnectorDragStart = useCallback(
    (sourceNodeId: number, _position: string, startX: number, startY: number) => {
      if (!graphRef.current) return;
      isDraggingEdge.current = true;

      const handlePointerMove = (e: PointerEvent) => {
        const { x: endX, y: endY } = screenToSvgCoords(e.clientX, e.clientY);
        setMockEdge({
          x1: startX, y1: startY, x2: endX, y2: endY,
          nodeX2: 0, nodeY2: 0,
          from: sourceNodeId, to: -1,
          weight: EDGE.DEFAULT_WEIGHT, type: EDGE_TYPE.DIRECTED,
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
        let targetNode: GraphNode | undefined;

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
          const edgeExists = existingEdges.some((edge) => edge.to === targetNode!.id);
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
    [graphRef, screenToSvgCoords, setMockEdge, addEdge]
  );

  return { handleConnectorDragStart, isDraggingEdge };
}
