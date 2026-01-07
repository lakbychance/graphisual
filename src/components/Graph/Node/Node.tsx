import React, { useRef, useCallback, useState } from "react";
import { motion } from "motion/react";
import { calculateCurve, calculateTextLoc } from "../../../utility/calc";
import { NodeProps } from "./INode";
import { IEdge } from "../IGraph";
import { cn } from "@/lib/utils";
import { EdgeConnector } from "../EdgeConnector";
import { DRAG_THRESHOLD, NODE } from "../../../utility/constants";

export const Node = (props: NodeProps) => {
  const {
    node,
    edges,
    onNodeMove,
    onEdgeClick,
    onConnectorDragStart,
    isVisualizing,
    isAlgorithmSelected,
    pathFindingNode,
    svgRef,
    isSelected,
    onNodeSelect,
    screenToSvgCoords,
  } = props;

  const [isHovered, setIsHovered] = useState(false);
  const isDragging = useRef(false);

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
      onConnectorDragStart(node, position, startX, startY);
    },
    [node, onConnectorDragStart]
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
    if (pathFindingNode?.startNodeId === node.id) return "url(#nodeGradientStart)";
    if (pathFindingNode?.endNodeId === node.id) return "url(#nodeGradientEnd)";
    if (node.isInShortestPath) return "url(#nodeGradientPath)";
    if (node.isVisited) return "url(#nodeGradientVisited)";
    return "url(#nodeGradientDefault)";
  };

  // Stroke color for edge definition and selected state
  const getNodeStroke = () => {
    if (isSelected) return "var(--color-tint-path)"; // Amber for selected
    if (pathFindingNode?.startNodeId === node.id) return "var(--color-tint-start)";
    if (pathFindingNode?.endNodeId === node.id) return "var(--color-tint-end)";
    if (node.isInShortestPath) return "var(--color-tint-path)";
    if (node.isVisited) return "var(--color-tint-visited)";
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
      {edges &&
        edges?.get(node.id)?.map((edge: IEdge) => {
          const directedPath = calculateCurve(edge.x1, edge.y1, edge.x2, edge.y2);
          const undirectedPath = `M${edge.x1},${edge.y1} L${edge.x2},${edge.y2}`;
          const textCoordDirected = calculateTextLoc(
            edge.x1,
            edge.y1,
            edge.x2,
            edge.y2
          );
          const edgeKey = `${node.id}-${edge.to}`;

          // Determine edge color - warm tones matching the surface
          const getEdgeColor = () => {
            if (edge.isUsedInShortestPath) return "var(--color-edge-path)";
            if (edge.isUsedInTraversal) return "var(--color-edge-traversal)";
            return "var(--color-edge-default)";
          };

          const getEdgeArrowColor = () => {
            if (edge.isUsedInShortestPath) return "var(--color-edge-path)";
            if (edge.isUsedInTraversal) return "var(--color-edge-traversal)";
            return "var(--color-node-stroke)";
          }

          const edgeColor = getEdgeColor();

          const edgeArrowColor = getEdgeArrowColor();

          const hoverColor = "var(--color-edge-hover)";

          return (
            <g key={edgeKey}>
              {edge.type === "directed" && (
                <>
                  <marker
                    style={{ fill: edgeArrowColor }}
                    id={`arrowhead${node.id}${edge.to}`}
                    markerWidth="9"
                    markerHeight="7"
                    refX="8.7"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3.5, 0 7" />
                  </marker>
                  <path
                    id={`${node.id}${edge.to}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isVisualizing) onEdgeClick(edge, node);
                    }}
                    onMouseEnter={(e) => {
                      if (!isVisualizing) e.currentTarget.style.stroke = hoverColor;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.stroke = edgeColor;
                    }}
                    d={directedPath}
                    style={{
                      stroke: edgeColor,
                      strokeWidth: edge.isUsedInShortestPath ? 3.5 : edge.isUsedInTraversal ? 3 : 2,
                    }}
                    className={cn(
                      "fill-transparent cursor-pointer",
                      isVisualizing && "pointer-events-none"
                    )}
                    markerEnd={`url(#arrowhead${node.id}${edge.to})`}
                  />
                  {edge.weight !== undefined && edge.weight > 0 && (() => {
                    // Calculate actual center of quadratic bezier curve at t=0.5
                    // Q(0.5) = (P0 + 2*P1 + P2) / 4
                    const centerX = (edge.x1 + 2 * textCoordDirected.c1x + edge.x2) / 4;
                    const centerY = (edge.y1 + 2 * textCoordDirected.c1y + edge.y2) / 4;
                    return (
                      <g>
                        <rect
                          x={centerX - 12}
                          y={centerY - 10}
                          width={24}
                          height={20}
                          fill="var(--color-paper)"
                          rx={4}
                        />
                        <text
                          className="pointer-events-none select-none font-['JetBrains_Mono'] font-semibold text-[13px] [-webkit-user-select:none] [-moz-user-select:none] [-ms-user-select:none] lg:text-[11px]"
                          style={{ fill: 'var(--color-text)' }}
                          x={centerX}
                          y={centerY}
                          textAnchor="middle"
                          dominantBaseline="central"
                        >
                          {edge.weight}
                        </text>
                      </g>
                    );
                  })()}
                </>
              )}

              {edge.type === "undirected" && (
                <>
                  <path
                    d={undirectedPath}
                    id={`${node.id}${edge.to}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isVisualizing) onEdgeClick(edge, node);
                    }}
                    onMouseEnter={(e) => {
                      if (!isVisualizing) e.currentTarget.style.stroke = hoverColor;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.stroke = edgeColor;
                    }}
                    style={{
                      stroke: edgeColor,
                      strokeWidth: edge.isUsedInShortestPath ? 3.5 : edge.isUsedInTraversal ? 3 : 2.5,
                    }}
                    className={cn(
                      "fill-transparent cursor-pointer",
                      isVisualizing && "pointer-events-none"
                    )}
                  />
                  {edge.weight !== undefined && edge.weight > 0 && (() => {
                    const centerX = (edge.x1 + edge.nodeX2) / 2;
                    const centerY = (edge.y1 + edge.nodeY2) / 2;
                    return (
                      <g>
                        <rect
                          x={centerX - 12}
                          y={centerY - 10}
                          width={24}
                          height={20}
                          fill="var(--color-paper)"
                          rx={4}
                        />
                        <text
                          className="pointer-events-none select-none font-['JetBrains_Mono'] font-semibold text-[13px] [-webkit-user-select:none] [-moz-user-select:none] [-ms-user-select:none] lg:text-[11px]"
                          style={{ fill: 'var(--color-text)' }}
                          x={centerX}
                          y={centerY}
                          textAnchor="middle"
                          dominantBaseline="central"
                        >
                          {edge.weight}
                        </text>
                      </g>
                    );
                  })()}
                </>
              )}
            </g>
          );
        })}

      {/* Node visual elements with spring animation on mount */}
      <motion.g
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
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
        >
        </circle>

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
};
