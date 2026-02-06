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

function setHitAreaRole(nodeId: number, role: 'source' | 'target') {
  document.getElementById(`hit-${nodeId}`)?.setAttribute(`data-${role}`, '');
}

function clearHitAreaRole(nodeId: number, role: 'source' | 'target') {
  document.getElementById(`hit-${nodeId}`)?.removeAttribute(`data-${role}`);
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

      // Hide connectors and highlight source via DOM
      graphRef.current.setAttribute('data-edge-dragging', '');
      setHitAreaRole(sourceNodeId, 'source');

      let prevHoverTargetId: number | null = null;

      const handlePointerMove = (e: PointerEvent) => {
        const { x: endX, y: endY } = screenToSvgCoords(e.clientX, e.clientY);
        const { nodes } = useGraphStore.getState().data;
        const hoverTarget = findToNodeForTouchBasedDevices(endX, endY, nodes);
        const hoveredId = hoverTarget && hoverTarget.id !== sourceNodeId ? hoverTarget.id : null;

        // Update target highlight only when it changes
        if (hoveredId !== prevHoverTargetId) {
          if (prevHoverTargetId !== null) clearHitAreaRole(prevHoverTargetId, 'target');
          if (hoveredId !== null) setHitAreaRole(hoveredId, 'target');
          prevHoverTargetId = hoveredId;
        }

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

        // Clean up DOM highlights
        graphRef.current?.removeAttribute('data-edge-dragging');
        clearHitAreaRole(sourceNodeId, 'source');
        if (prevHoverTargetId !== null) clearHitAreaRole(prevHoverTargetId, 'target');

        // Get current state at call-time
        const { data } = useGraphStore.getState();
        const { nodes, edges } = data;
        const sourceNode = nodes.find(n => n.id === sourceNodeId);
        if (!sourceNode) { setMockEdge(null); return; }

        const target = e.target as SVGElement;
        let targetNode: GraphNode | undefined;

        if (target.tagName === "circle" && target.id) {
          // Parse node ID from either main circle ("3") or hit area ("hit-3")
          const idStr = target.id.startsWith("hit-") ? target.id.slice(4) : target.id;
          const targetNodeId = parseInt(idStr);
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
