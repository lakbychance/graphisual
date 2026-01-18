import React, { useRef, useCallback, useState, memo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { NodeProps } from "./INode";
import { IEdge } from "../IGraph";
import { cn } from "@/lib/utils";
import { EdgeConnector } from "../EdgeConnector";
import { Edge } from "../Edge/Edge";
import { DRAG_THRESHOLD, NODE } from "../../../utility/constants";
import { useGraphStore } from "../../../store/graphStore";
import { useShallow } from "zustand/shallow";

export const Node = memo(function Node(props: NodeProps) {
  const {
    nodeId,
    onNodeMove,
    onEdgeClick,
    onConnectorDragStart,
    isVisualizing,
    isAlgorithmSelected,
    svgRef,
    onNodeSelect,
    screenToSvgCoords,
  } = props;

  // Subscribe to THIS node's data only
  const node = useGraphStore(useShallow((state) =>
    state.data.nodes.find((n) => n.id === nodeId)
  ));

  // Subscribe to THIS node's visualization flags only
  const visFlags = useGraphStore((state) => state.visualization.trace.nodes.get(nodeId));

  const visualizationInput = useGraphStore((state) => state.visualization.input);

  // Subscribe to THIS node's edges only
  const nodeEdges = useGraphStore(useShallow((state) => state.data.edges.get(nodeId)));

  // Derived selector: only re-renders when THIS node's selection state changes
  const isSelected = useGraphStore((state) => state.selection.nodeId === nodeId);

  if (!node) return null;

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
      // Don't allow dragging/deletion when visualizing or algorithm is selected
      if (isVisualizing || isAlgorithmSelected) return;

      event.stopPropagation();
      const target = event.target as SVGCircleElement;
      target.setPointerCapture(event.pointerId);

      const startX = event.clientX;
      const startY = event.clientY;
      isDragging.current = false;

      const handlePointerMove = (e: PointerEvent) => {
        if (!svgRef.current) return;

        const deltaX = Math.abs(e.clientX - startX);
        const deltaY = Math.abs(e.clientY - startY);

        // Check if movement exceeds threshold - user is dragging
        if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
          isDragging.current = true;
          const { x: nodeX, y: nodeY } = screenToSvgCoords(e.clientX, e.clientY);
          onNodeMove(node.id, nodeX, nodeY);
        }
      };

      const handlePointerUp = (e: PointerEvent) => {
        target.releasePointerCapture(e.pointerId);
        document.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerup", handlePointerUp);

        // If not dragging, toggle node selection (single click)
        if (!isDragging.current) {
          onNodeSelect(isSelected ? null : node.id);
        }
        isDragging.current = false;
      };

      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerUp);
    },
    [node.id, onNodeMove, onNodeSelect, isVisualizing, isAlgorithmSelected, svgRef, screenToSvgCoords, isSelected]
  );

  // Hide connectors when visualizing or algorithm is selected (only show on hover)
  const connectorsVisible = !isVisualizing && !isAlgorithmSelected && isHovered;

  // Hit area radius: node radius + padding for connectors and touch target
  const hitAreaRadius = node.r + NODE.HIT_AREA_PADDING;

  // Determine node fill - using gradient references for tactile button look
  const getNodeFill = () => {
    if (visualizationInput?.startNodeId === node.id) return "url(#nodeGradientStart)";
    if (visualizationInput?.endNodeId === node.id) return "url(#nodeGradientEnd)";
    if (visFlags?.isInShortestPath) return "url(#nodeGradientPath)";
    if (visFlags?.isVisited) return "url(#nodeGradientVisited)";
    return "url(#nodeGradientDefault)";
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
    <g
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Edges rendered first so they appear behind nodes */}
      {nodeEdges?.map((edge: IEdge) => (
        <Edge
          key={`${nodeId}-${edge.to}`}
          edge={edge}
          sourceNodeId={nodeId}
          isVisualizing={isVisualizing}
          onEdgeClick={onEdgeClick}
        />
      ))}

      {/* Node visual elements with spring animation on mount */}
      <motion.g
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
          className="pointer-events-none select-none font-['JetBrains_Mono'] font-bold text-[14px] [text-anchor:middle] [dominant-baseline:central] [-webkit-user-select:none] [-moz-user-select:none] [-ms-user-select:none] lg:text-[12px]"
          style={{ fill: 'var(--color-text)' }}
          x={node.x}
          y={node.y}
        >
          {node.id}
        </text>
      </motion.g>
    </g>
  );
});
