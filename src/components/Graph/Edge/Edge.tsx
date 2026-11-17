import { memo } from "react";
import { getControlPoint } from "../../../utils/geometry/calc";
import { dashOf, useEdgeBow } from "@/physics/graphMotion";
import { GraphEdge } from "../types";
import { cn } from "@/lib/utils";
import { useGraphStore, selectIsEdgeFocused } from "../../../store/graphStore";
import { EDGE } from "../../../constants/graph";

const WeightLabel = ({ centerX, centerY, weight }: { centerX: number; centerY: number; weight: number }) => (
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
      {weight}
    </text>
  </g>
);

interface EdgeProps {
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

  // While an end of this edge is moving, its middle lags behind by `bow` (null at rest).
  const bow = useEdgeBow(sourceNodeId, edge.to);
  const bowX = bow?.x ?? 0;
  const bowY = bow?.y ?? 0;

  // An edge that was just drawn (always directed) starts where the drafted line ended and with its dashes, and settles from there.
  const x2 = edge.x2 + (bow?.end?.x ?? 0);
  const y2 = edge.y2 + (bow?.end?.y ?? 0);
  const dash = dashOf(bow)?.join(" ");

  const control = getControlPoint(edge.x1, edge.y1, x2, y2);
  const c1x = control.cx + 2 * bowX;
  const c1y = control.cy + 2 * bowY;
  const directedPath = `M${edge.x1} ${edge.y1} Q${c1x} ${c1y} ${x2} ${y2}`;
  const undirectedPath = bow
    ? `M${edge.x1},${edge.y1} Q${(edge.x1 + edge.x2) / 2 + 2 * bowX},${(edge.y1 + edge.y2) / 2 + 2 * bowY} ${edge.x2},${edge.y2}`
    : `M${edge.x1},${edge.y1} L${edge.x2},${edge.y2}`;

  // Generate edge key - includes type and marker to force Safari to repaint SVG markers
  const getEdgeKey = (markerId?: string) => {
    const base = `${sourceNodeId}-${edge.to}-${edge.type}`;
    return markerId ? `${base}-${markerId}` : base;
  };

  const getEdgeColor = () => {
    if (isFocused) return "var(--color-accent-form)";
    if (visFlags?.isUsedInCycle) return "var(--color-edge-cycle)";
    if (visFlags?.isUsedInShortestPath) return "var(--color-edge-path)";
    if (visFlags?.isUsedInTraversal) return "var(--color-edge-traversal)";
    return "var(--color-edge-default)";
  };

  const getArrowMarkerId = () => {
    if (isFocused) return "arrowhead-focused";
    if (visFlags?.isUsedInCycle) return "arrowhead-cycle";
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
    // Don't override styles when focused (CSS class handles it) or visualizing
    if (!isVisualizing && !isFocused) {
      // Target the visible sibling path (next element after the hit area)
      const visiblePath = e.currentTarget.nextElementSibling as SVGPathElement | null;
      if (visiblePath) {
        visiblePath.style.stroke = hoverColor;
        if (edge.type === 'directed') {
          visiblePath.style.markerEnd = 'url(#arrowhead-focused)';
        }
      }
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<SVGPathElement>) => {
    // Don't override styles when focused (CSS class handles it)
    if (!isFocused) {
      const visiblePath = e.currentTarget.nextElementSibling as SVGPathElement | null;
      if (visiblePath) {
        visiblePath.style.stroke = edgeColor;
        if (edge.type === 'directed') {
          visiblePath.style.markerEnd = `url(#${arrowMarkerId})`;
        }
      }
    }
  };

  const getStrokeWidth = () => {
    return edge.type === "directed" ? 2 : 2.5;
  };

  if (edge.type === "directed") {
    // Calculate actual center of quadratic bezier curve at t=0.5
    // Q(0.5) = (P0 + 2*P1 + P2) / 4
    const centerX = (edge.x1 + 2 * c1x + x2) / 4;
    const centerY = (edge.y1 + 2 * c1y + y2) / 4;

    return (
      <g key={getEdgeKey(arrowMarkerId)}>
        {/* Invisible wider path for easier click/tap targeting */}
        <path
          d={directedPath}
          fill="transparent"
          stroke="transparent"
          strokeWidth={EDGE.HIT_THRESHOLD * 2}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={cn(
            "edge-hit-area cursor-pointer",
            isVisualizing && "pointer-events-none",
          )}
        />
        <path
          id={`${sourceNodeId}${edge.to}`}
          d={directedPath}
          style={{
            // Only set stroke via style when not focused (CSS class handles focused state)
            ...(!isFocused && {
              stroke: edgeColor,
              strokeWidth: getStrokeWidth(),
            }),
          }}
          className={cn(
            "fill-transparent pointer-events-none",
            isFocused && "edge-focused"
          )}
          strokeDasharray={dash}
          markerEnd={`url(#${arrowMarkerId})`}
        />
        {edge.weight !== undefined && edge.weight !== EDGE.DEFAULT_WEIGHT && (
          <WeightLabel centerX={centerX} centerY={centerY} weight={edge.weight} />
        )}
      </g>
    );
  }

  // Undirected edge
  const centerX = (edge.x1 + edge.nodeX2) / 2 + bowX;
  const centerY = (edge.y1 + edge.nodeY2) / 2 + bowY;

  return (
    <g key={getEdgeKey()}>
      {/* Invisible wider path for easier click/tap targeting */}
      <path
        d={undirectedPath}
        fill="transparent"
        stroke="transparent"
        strokeWidth={EDGE.HIT_THRESHOLD * 2}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "edge-hit-area cursor-pointer",
          isVisualizing && "pointer-events-none",
        )}
      />
      <path
        d={undirectedPath}
        id={`${sourceNodeId}${edge.to}`}
        style={{
          // Only set stroke via style when not focused (CSS class handles focused state)
          ...(!isFocused && {
            stroke: edgeColor,
            strokeWidth: getStrokeWidth(),
          }),
        }}
        className={cn(
          "fill-transparent pointer-events-none",
          isFocused && "edge-focused"
        )}
      />
      {edge.weight !== undefined && edge.weight !== EDGE.DEFAULT_WEIGHT && (
        <WeightLabel centerX={centerX} centerY={centerY} weight={edge.weight} />
      )}
    </g>
  );
});
