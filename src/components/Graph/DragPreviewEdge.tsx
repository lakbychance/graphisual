interface DragPreviewEdgeProps {
  edge: { x1: number; y1: number; x2: number; y2: number } | null;
}

/**
 * Dashed line preview shown while dragging to create an edge
 */
export const DragPreviewEdge = ({ edge }: DragPreviewEdgeProps) => {
  if (!edge) return null;

  return (
    <line
      className="stroke-[2px] [stroke-dasharray:8_4] pointer-events-none"
      style={{ stroke: 'var(--color-edge-default)' }}
      x1={edge.x1}
      y1={edge.y1}
      x2={edge.x2}
      y2={edge.y2}
      markerEnd="url(#mockArrowHead)"
    />
  );
};
