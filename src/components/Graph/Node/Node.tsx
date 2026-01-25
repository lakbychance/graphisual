import React, { useRef, useCallback, useState, memo } from "react";
import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { cn } from "@/lib/utils";
import { EdgeConnector } from "../EdgeConnector";
import { DRAG_THRESHOLD, NODE } from "../../../utility/constants";
import { useGraphStore } from "../../../store/graphStore";
import { useShallow } from "zustand/shallow";
import { NODE_GRADIENT, gradientUrl } from "../../../constants";

export interface NodeProps {
  nodeId: number;
  onNodeMove: (nodeId: number, x: number, y: number) => void;
  onConnectorDragStart: (
    sourceNodeId: number,
    position: string,
    startX: number,
    startY: number
  ) => void;
  isVisualizing: boolean;
  isAlgorithmSelected: boolean;
  onNodeSelect: (nodeId: number | null) => void;
  screenToSvgCoords: (clientX: number, clientY: number) => { x: number; y: number };
  isGestureActive: () => boolean;
}


export const Node = memo(function Node(props: NodeProps) {
  const {
    nodeId,
    onNodeMove,
    onConnectorDragStart,
    isVisualizing,
    isAlgorithmSelected,
    onNodeSelect,
    screenToSvgCoords,
    isGestureActive,
  } = props;

  // Subscribe to THIS node's data only
  const node = useGraphStore(useShallow((state) =>
    state.data.nodes.find((n) => n.id === nodeId)
  ));

  // Subscribe to THIS node's visualization flags only
  const visFlags = useGraphStore((state) => state.visualization.trace.nodes.get(nodeId));

  const visualizationInput = useGraphStore((state) => state.visualization.input);

  // Derived selector: only re-renders when THIS node's selection state changes
  const isSelected = useGraphStore((state) => state.selection.nodeId === nodeId);

  const bringNodeToFront = useGraphStore((state) => state.bringNodeToFront);

  const [isHovered, setIsHovered] = useState(false);
  const isDragging = useRef(false);
  const prefersReducedMotion = useReducedMotion();

  // Track hover state for connectors and algorithm mode zoom effect
  const handleMouseEnter = useCallback(() => {
    if (!isVisualizing) {
      setIsHovered(true);
    }
  }, [isVisualizing]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const handleConnectorDrag = useCallback(
    (position: string, startX: number, startY: number) => {
      onConnectorDragStart(nodeId, position, startX, startY);
    },
    [nodeId, onConnectorDragStart]
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<SVGCircleElement>) => {
      // Don't allow interactions during pinch gestures
      if (isGestureActive()) return;
      // Don't allow dragging/deletion when visualizing or algorithm is selected
      if (isVisualizing || isAlgorithmSelected) return;

      event.stopPropagation();
      const target = event.target as SVGCircleElement;
      target.setPointerCapture(event.pointerId);

      const startX = event.clientX;
      const startY = event.clientY;
      isDragging.current = false;

      const handlePointerMove = (e: PointerEvent) => {
        // Stop node drag if pinch gesture starts
        if (isGestureActive()) return;

        const deltaX = Math.abs(e.clientX - startX);
        const deltaY = Math.abs(e.clientY - startY);

        // Check if movement exceeds threshold - user is dragging
        if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
          // Bring node to front on first drag movement
          if (!isDragging.current) {
            bringNodeToFront(nodeId);
          }
          isDragging.current = true;
          const { x: nodeX, y: nodeY } = screenToSvgCoords(e.clientX, e.clientY);
          onNodeMove(nodeId, nodeX, nodeY);
        }
      };

      const handlePointerUp = (e: PointerEvent) => {
        target.releasePointerCapture(e.pointerId);
        document.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerup", handlePointerUp);

        // If not dragging and not pinching, toggle node selection (single click)
        if (!isDragging.current && !isGestureActive()) {
          onNodeSelect(isSelected ? null : nodeId);
        }
        isDragging.current = false;
      };

      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerUp);
    },
    [nodeId, onNodeMove, onNodeSelect, isVisualizing, isAlgorithmSelected, screenToSvgCoords, isSelected, isGestureActive, bringNodeToFront]
  );

  // Early return if node not found - after all hooks
  if (!node) return null;

  // Hide connectors when visualizing or algorithm is selected (only show on hover)
  const connectorsVisible = !isVisualizing && !isAlgorithmSelected && isHovered;

  // Hit area radius: node radius + padding for connectors and touch target
  const hitAreaRadius = node.r + NODE.HIT_AREA_PADDING;

  // Determine node fill - using gradient references for tactile button look
  const getNodeFill = () => {
    if (visualizationInput?.startNodeId === node.id) return gradientUrl(NODE_GRADIENT.START);
    if (visualizationInput?.endNodeId === node.id) return gradientUrl(NODE_GRADIENT.END);
    if (visFlags?.isInShortestPath) return gradientUrl(NODE_GRADIENT.PATH);
    if (visFlags?.isVisited) return gradientUrl(NODE_GRADIENT.VISITED);
    return gradientUrl(NODE_GRADIENT.DEFAULT);
  };

  // Stroke color for edge definition and selected state
  const getNodeStroke = () => {
    if (isSelected) return "var(--color-accent-form)"; // Focus color for selected
    if (visualizationInput?.startNodeId === node.id) return "var(--color-tint-start)";
    if (visualizationInput?.endNodeId === node.id) return "var(--color-tint-end)";
    if (visFlags?.isInShortestPath) return "var(--color-tint-path)";
    if (visFlags?.isVisited) return "var(--color-tint-visited)";
    return "var(--color-node-stroke)";
  };

  // Stroke width - thicker when selected
  const getNodeStrokeWidth = () => {
    return isSelected ? 2.5 : 1.5;
  };

  return (
    <m.g
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      initial={prefersReducedMotion ? false : { scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={prefersReducedMotion ? { duration: 0 } : {
        type: 'spring',
        stiffness: 600,
        damping: 28,
      }}
      style={{ transformOrigin: `${node.x}px ${node.y}px` }}
    >
        {/* Invisible hit area to keep hover state when moving to connectors */}
        <circle
          cx={node.x}
          cy={node.y}
          r={hitAreaRadius}
          className="fill-transparent pointer-events-auto"
        />
        {/* Main node token - tangible, pickable button */}
        <circle
          onPointerDown={handlePointerDown}
          onMouseEnter={handleMouseEnter}
          style={{
            fill: getNodeFill(),
            stroke: getNodeStroke(),
            strokeWidth: getNodeStrokeWidth(),
            filter: 'drop-shadow(1.5px 1.5px 3px var(--node-shadow-color))',
          }}
          className={cn(
            // Only transition visual properties, not position (cx/cy)
            "[transition:fill_150ms,r_150ms,stroke_150ms,stroke-width_150ms]",
            // Cursor: pointer when algorithm selected, grab otherwise
            isAlgorithmSelected ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
          )}
          cx={node.x}
          cy={node.y}
          r={isAlgorithmSelected && isHovered ? node.r * NODE.HOVER_SCALE : node.r}
          id={node.id.toString()}
        />
        {/* Crosshatch with radial mask - light center, dense edges for 3D sphere */}
        <circle
          cx={node.x}
          cy={node.y}
          r={isAlgorithmSelected && isHovered ? node.r * NODE.HOVER_SCALE : node.r}
          fill="url(#crosshatch)"
          mask="url(#sphereMask)"
          className="pointer-events-none [transition:r_150ms]"
        />

        {/* Edge Connectors - shown on hover */}
        <EdgeConnector
          nodeX={node.x}
          nodeY={node.y}
          nodeR={node.r}
          position="top"
          visible={connectorsVisible}
          onDragStart={handleConnectorDrag}
        />
        <EdgeConnector
          nodeX={node.x}
          nodeY={node.y}
          nodeR={node.r}
          position="right"
          visible={connectorsVisible}
          onDragStart={handleConnectorDrag}
        />
        <EdgeConnector
          nodeX={node.x}
          nodeY={node.y}
          nodeR={node.r}
          position="bottom"
          visible={connectorsVisible}
          onDragStart={handleConnectorDrag}
        />
        <EdgeConnector
          nodeX={node.x}
          nodeY={node.y}
          nodeR={node.r}
          position="left"
          visible={connectorsVisible}
          onDragStart={handleConnectorDrag}
        />

      {/* Node label */}
      <text
        className="pointer-events-none select-none font-bold text-sm [text-anchor:middle] [dominant-baseline:central] [-webkit-user-select:none] [-moz-user-select:none] [-ms-user-select:none] lg:text-xs"
        style={{ fill: 'var(--color-text)' }}
        x={node.x}
        y={node.y}
      >
        {node.id}
      </text>
    </m.g>
  );
});
