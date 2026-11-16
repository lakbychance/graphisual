import { draftPath, useDraftShape } from "@/physics/graphMotion";

/**
 * Dashed preview of the edge being drawn. Its shape comes from the graph
 * motion layer: a thread, a wire or a ruled line depending on the theme, and a
 * plain straight line when physics is off.
 */
export const DragPreviewEdge = () => {
  const shape = useDraftShape();
  if (!shape) return null;

  return (
    <path
      className="fill-none stroke-[2px] [stroke-dasharray:8_4] pointer-events-none"
      style={{ stroke: 'var(--color-edge-default)' }}
      d={draftPath(shape)}
      markerEnd="url(#mockArrowHead)"
    />
  );
};
