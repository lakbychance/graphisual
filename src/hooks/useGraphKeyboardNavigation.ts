import { useCallback, RefObject } from "react";
import { useGraphStore } from "../store/graphStore";
import { useShallow } from "zustand/shallow";
import { calculateTextLoc } from "../utils/geometry/calc";
import { findNodeInDirection, type Direction } from "../utils/focus/findNodeInDirection";
import { isElementInPopup } from "../utils/dom";
import { useIsDesktop } from "./useMediaQuery";

interface UseGraphKeyboardNavigationOptions {
  /** Ref to the focusable graph element (SVG or Canvas) */
  graphRef: RefObject<HTMLElement | SVGSVGElement | null>;
  /** Convert world/graph coordinates to screen coordinates */
  svgToScreenCoords: (svgX: number, svgY: number) => { x: number; y: number };
  isInStepMode: boolean;
  closeEdgePopup: () => void;
  onAlgorithmNodeSelect?: (nodeId: number) => void;
  isAlgorithmSelected?: boolean;
  isVisualizing?: boolean;
  onLabelEdit?: (nodeId: number) => void;
}

export function useGraphKeyboardNavigation({
  graphRef,
  svgToScreenCoords,
  isInStepMode,
  closeEdgePopup,
  onAlgorithmNodeSelect,
  isAlgorithmSelected = false,
  isVisualizing = false,
  onLabelEdit,
}: UseGraphKeyboardNavigationOptions) {
  // Keyboard navigation is desktop only
  const isDesktop = useIsDesktop();
  // Store state
  const orderedNodeIds = useGraphStore(
    useShallow((state) => [...state.data.stackingOrder])
  );
  const nodes = useGraphStore(useShallow((state) => state.data.nodes));
  const edges = useGraphStore((state) => state.data.edges);
  // For keyboard navigation, we use the first selected node (or null if none)
  const selectedNodeIds = useGraphStore((state) => state.selection.nodeIds);
  const selectedNodeId = selectedNodeIds.size > 0 ? [...selectedNodeIds][0] : null;
  const focusedEdge = useGraphStore((state) => state.selection.focusedEdge);

  // Store actions
  const selectNode = useGraphStore((state) => state.selectNode);
  const setFocusedEdge = useGraphStore((state) => state.setFocusedEdge);
  const clearFocusedEdge = useGraphStore((state) => state.clearFocusedEdge);
  const selectEdgeAction = useGraphStore((state) => state.selectEdge);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Skip on mobile - keyboard navigation is desktop only
    if (!isDesktop) return;
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

    // === Enter key: open edge popup (when edge focused) ===
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

    // === Enter key: select node for algorithm (when algorithm selected) ===
    if (e.key === 'Enter' && isAlgorithmSelected && selectedNodeId !== null && !isVisualizing && onAlgorithmNodeSelect) {
      e.preventDefault();
      onAlgorithmNodeSelect(selectedNodeId);
      return;
    }

    // === Enter key: edit node label (when node selected, no edge focused, no algorithm) ===
    if (e.key === 'Enter' && selectedNodeId !== null && !focusedEdge && !isAlgorithmSelected && !isVisualizing && onLabelEdit) {
      e.preventDefault();
      onLabelEdit(selectedNodeId);
      return;
    }

    // === Escape key: clear edge focus ===
    if (e.key === 'Escape' && focusedEdge) {
      e.preventDefault();
      // Prevent document-level Escape shortcuts from also deselecting the node.
      e.stopPropagation();
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
  }, [isDesktop, isInStepMode, selectedNodeId, selectedNodeIds, orderedNodeIds, nodes, edges, focusedEdge, selectNode, setFocusedEdge, clearFocusedEdge, selectEdgeAction, svgToScreenCoords, isAlgorithmSelected, isVisualizing, onAlgorithmNodeSelect, onLabelEdit]);

  // Handle blur - deselect node and clear edge focus when focus leaves the graph
  // But don't clear if focus is moving to the edge popup
  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Skip on mobile - keyboard navigation is desktop only
    if (!isDesktop) return;
    if (isElementInPopup(e.relatedTarget as Element)) return;

    if (selectedNodeIds.size > 0) {
      selectNode(null);
    }
    if (focusedEdge !== null) {
      clearFocusedEdge();
    }
  }, [isDesktop, selectedNodeIds, focusedEdge, selectNode, clearFocusedEdge]);

  // Wrapper for closeEdgePopup that refocuses the canvas (only for keyboard navigation)
  const handleCloseEdgePopup = useCallback(() => {
    closeEdgePopup();
    // Only refocus SVG if coming from keyboard navigation (focusedEdge is set)
    // Mouse interactions clear focusedEdge, so we don't refocus and auto-select a node
    if (focusedEdge) {
      graphRef.current?.focus();
    }
  }, [closeEdgePopup, focusedEdge, graphRef]);

  return {
    handleKeyDown,
    handleBlur,
    handleCloseEdgePopup,
  };
}
