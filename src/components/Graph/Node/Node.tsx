import React, { useRef, useCallback, useState, memo } from "react";
import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { cn } from "@/lib/utils";
import { EdgeConnector } from "../EdgeConnector";
import { DRAG_THRESHOLD, STROKE_ANIMATION, NODE_STROKE } from "../../../constants/ui";
import { NODE } from "../../../constants/graph";
import { useGraphStore } from "../../../store/graphStore";
import { useShallow } from "zustand/shallow";

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

  // Determine node fill - using solid colors for smooth Framer Motion animation
  const getNodeFill = () => {
    if (visualizationInput?.startNodeId === node.id) return 'var(--gradient-start-mid)';
    if (visualizationInput?.endNodeId === node.id) return 'var(--gradient-end-mid)';
    if (visFlags?.isInShortestPath) return 'var(--gradient-path-mid)';
    if (visFlags?.isVisited) return 'var(--gradient-visited-mid)';
    return 'var(--gradient-default-mid)';
  };

  // Stroke color for non-selected states (selected state handled by Framer Motion animate)
  const getNodeStroke = () => {
    if (visualizationInput?.startNodeId === node.id) return "var(--color-tint-start)";
    if (visualizationInput?.endNodeId === node.id) return "var(--color-tint-end)";
    if (visFlags?.isInShortestPath) return "var(--color-tint-path)";
    if (visFlags?.isVisited) return "var(--color-tint-visited)";
    return "var(--color-node-stroke)";
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
      <m.circle
        onPointerDown={handlePointerDown}
        onMouseEnter={handleMouseEnter}
        style={{
          filter: 'drop-shadow(1.5px 1.5px 3px var(--node-shadow-color))',
        }}
        animate={{
          fill: getNodeFill(),
          stroke: isSelected ? 'var(--color-accent-form)' : getNodeStroke(),
          // Keyframes for pop effect: default → active → selected
          strokeWidth: isSelected
            ? [NODE_STROKE.DEFAULT, NODE_STROKE.ACTIVE, NODE_STROKE.SELECTED]
            : NODE_STROKE.DEFAULT,
          r: isAlgorithmSelected && isHovered ? node.r * NODE.HOVER_SCALE : node.r,
        }}
        transition={prefersReducedMotion ? { duration: 0 } : {
          fill: { duration: STROKE_ANIMATION.DURATION },
          stroke: { duration: STROKE_ANIMATION.DURATION },
          strokeWidth: isSelected
            ? { duration: STROKE_ANIMATION.POP_DURATION, times: [...STROKE_ANIMATION.POP_TIMES], ease: [...STROKE_ANIMATION.POP_EASE] }
            : { duration: STROKE_ANIMATION.DURATION },
          r: { duration: STROKE_ANIMATION.DURATION },
        }}
        className={cn(
          // Cursor: pointer when algorithm selected, grab otherwise
          isAlgorithmSelected ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
        )}
        cx={node.x}
        cy={node.y}
        id={node.id.toString()}
      />
      {/* Crosshatch with radial mask - light center, dense edges for 3D sphere */}
      <m.circle
        cx={node.x}
        cy={node.y}
        animate={{
          r: isAlgorithmSelected && isHovered ? node.r * NODE.HOVER_SCALE : node.r,
        }}
        transition={prefersReducedMotion ? { duration: 0 } : { r: { duration: STROKE_ANIMATION.DURATION } }}
        fill="url(#crosshatch)"
        mask="url(#sphereMask)"
        className="pointer-events-none"
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
