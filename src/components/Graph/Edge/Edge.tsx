import { memo } from "react";
import { calculateCurve, calculateTextLoc } from "../../../utils/geometry/calc";
import { GraphEdge } from "../types";
import { cn } from "@/lib/utils";
import { useGraphStore, selectIsEdgeFocused } from "../../../store/graphStore";

export interface EdgeProps {
  edge: GraphEdge;
  sourceNodeId: number;
  isVisualizing: boolean;
  onEdgeClick: (edge: GraphEdge, fromNodeId: number, clickPosition: { x: number; y: number }) => void;
}

export const Edge = memo(function Edge({
  edge,
  sourceNodeId,
  isVisualizing,
  onEdgeClick,
}: EdgeProps) {
  // Subscribe to THIS edge's visualization flags only
  const visFlags = useGraphStore((state) =>
    state.visualization.trace.edges.get(`${sourceNodeId}-${edge.to}`)
  );

  // Subscribe to keyboard focus state for this edge
  const isFocused = useGraphStore(selectIsEdgeFocused(sourceNodeId, edge.to));

  const directedPath = calculateCurve(edge.x1, edge.y1, edge.x2, edge.y2);
  const undirectedPath = `M${edge.x1},${edge.y1} L${edge.x2},${edge.y2}`;
  const textCoordDirected = calculateTextLoc(edge.x1, edge.y1, edge.x2, edge.y2);

  // Generate edge key - includes type and marker to force Safari to repaint SVG markers
  const getEdgeKey = (markerId?: string) => {
    const base = `${sourceNodeId}-${edge.to}-${edge.type}`;
    return markerId ? `${base}-${markerId}` : base;
  };

  const getEdgeColor = () => {
    if (isFocused) return "var(--color-accent-form)";
    if (visFlags?.isUsedInShortestPath) return "var(--color-edge-path)";
    if (visFlags?.isUsedInTraversal) return "var(--color-edge-traversal)";
    return "var(--color-edge-default)";
  };

  const getArrowMarkerId = () => {
    if (isFocused) return "arrowhead-focused";
    if (visFlags?.isUsedInShortestPath) return "arrowhead-path";
    if (visFlags?.isUsedInTraversal) return "arrowhead-traversal";
    return "arrowhead-default";
  };

  const edgeColor = getEdgeColor();
  const arrowMarkerId = getArrowMarkerId();
  const hoverColor = "var(--color-accent-form)";

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isVisualizing) {
      onEdgeClick(edge, sourceNodeId, { x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseEnter = (e: React.MouseEvent<SVGPathElement>) => {
    if (!isVisualizing) {
      e.currentTarget.style.stroke = hoverColor;
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<SVGPathElement>) => {
    e.currentTarget.style.stroke = edgeColor;
  };

  const getStrokeWidth = () => {
    return edge.type === "directed" ? 2 : 2.5;
  };

  const renderWeightLabel = (centerX: number, centerY: number) => {
    if (edge.weight === undefined || edge.weight === 0) return null;

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
          className="pointer-events-none select-none font-semibold text-sm [-webkit-user-select:none] [-moz-user-select:none] [-ms-user-select:none] lg:text-xs"
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
  };

  if (edge.type === "directed") {
    // Calculate actual center of quadratic bezier curve at t=0.5
    // Q(0.5) = (P0 + 2*P1 + P2) / 4
    const centerX = (edge.x1 + 2 * textCoordDirected.c1x + edge.x2) / 4;
    const centerY = (edge.y1 + 2 * textCoordDirected.c1y + edge.y2) / 4;

    return (
      <g key={getEdgeKey(arrowMarkerId)}>
        <path
          id={`${sourceNodeId}${edge.to}`}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          d={directedPath}
          style={{
            stroke: edgeColor,
            strokeWidth: getStrokeWidth(),
          }}
          className={cn(
            "fill-transparent cursor-pointer",
            isVisualizing && "pointer-events-none"
          )}
          markerEnd={`url(#${arrowMarkerId})`}
        />
        {renderWeightLabel(centerX, centerY)}
      </g>
    );
  }

  // Undirected edge
  const centerX = (edge.x1 + edge.nodeX2) / 2;
  const centerY = (edge.y1 + edge.nodeY2) / 2;

  return (
    <g key={getEdgeKey()}>
      <path
        d={undirectedPath}
        id={`${sourceNodeId}${edge.to}`}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          stroke: edgeColor,
          strokeWidth: getStrokeWidth(),
        }}
        className={cn(
          "fill-transparent cursor-pointer",
          isVisualizing && "pointer-events-none"
        )}
      />
      {renderWeightLabel(centerX, centerY)}
    </g>
  );
});
