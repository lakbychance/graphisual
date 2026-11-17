import { DRAFT_DASH, draftPath, useDraftShape } from "@/physics/graphMotion";

/**
 * Dashed preview of the edge being drawn. Its shape comes from the graph
 * motion layer: a thread, a wire or a ruled line depending on the theme, and a
 * plain straight line when physics is off.
 *
 * It is drawn the way the edge it becomes is drawn (same width, same arrowhead
 * at the end of the line, under the nodes), so that only its dashes and its
 * shape are left to change when it connects.
 */
export const DragPreviewEdge = () => {
  const shape = useDraftShape();
  if (!shape) return null;

  return (
    <path
      className="fill-none stroke-[2px] pointer-events-none"
      style={{ stroke: 'var(--color-edge-default)' }}
      d={draftPath(shape)}
      strokeDasharray={DRAFT_DASH.join(" ")}
      markerEnd="url(#arrowhead-default)"
    />
  );
};
