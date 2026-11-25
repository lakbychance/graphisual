/**
 * A run's state drawn on the Canvas renderer, as the SVG renderer draws it (`Graph/RunMarks.tsx`):
 * best-so-far parent links and this step's edge (under the nodes), then value badges and queue or
 * stack places (over them).
 */
import type { GraphEdge, GraphNode } from "../../Graph/types";
import type { NodeBadge, RunMarks } from "@/utils/visualization/runView";
import { getCSSVar } from "@/theme";
import {
  MARK_STYLE, SLOT_BADGE, VALUE_BADGE, markGeometry, markScale, num, orderMarks, type MarkGeometry,
} from "../../Graph/runMarkShapes";

/** Length of a directed edge's arrowhead, which the canvas draws its curve up to (see `edgeRenderer.ts`). */
const ARROW = 18;

/** A mark's line along the edge as the canvas draws it: a directed curve ends at its arrowhead's base. */
const strokeLine = (ctx: CanvasRenderingContext2D, { x1, y1, x2, y2, cx, cy }: MarkGeometry["line"]) => {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  if (cx === undefined || cy === undefined) ctx.lineTo(x2, y2);
  else {
    const angle = Math.atan2(y2 - cy, x2 - cx);
    ctx.quadraticCurveTo(cx, cy, x2 - Math.cos(angle) * ARROW, y2 - Math.sin(angle) * ARROW);
  }
  ctx.stroke();
};

/** Parent links and the edge this step used, with their chevrons and weights. */
export function drawRunEdgeMarks(
  ctx: CanvasRenderingContext2D,
  marks: RunMarks,
  nodes: GraphNode[],
  edges: Map<number, GraphEdge[]>,
  zoom: number,
): void {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const k = markScale(zoom);
  for (const { mark, chevron } of orderMarks(marks.edges)) {
    const g = markGeometry(mark, byId, edges);
    if (!g) continue;
    const style = MARK_STYLE[mark.kind];
    const change = mark.kind === "change";
    ctx.save();
    ctx.globalAlpha = style.opacity ?? 1;
    ctx.strokeStyle = getCSSVar(style.stroke);
    ctx.lineWidth = style.width;
    ctx.lineCap = style.dash ? "butt" : "round";
    ctx.setLineDash(style.dash ?? []);
    strokeLine(ctx, g.line);
    ctx.restore();

    if (chevron && (!g.directed || g.against)) {
      const size = 5 * k;
      ctx.save();
      ctx.translate(g.chevron.x, g.chevron.y);
      ctx.rotate(g.chevron.angle);
      ctx.beginPath();
      ctx.moveTo(-size, -size * 0.8);
      ctx.lineTo(size * 0.6, 0);
      ctx.lineTo(-size, size * 0.8);
      ctx.strokeStyle = getCSSVar(change ? "--color-state-change" : "--color-edge-traversal");
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.restore();
    }

    // The weight stays readable over the drawn edge; on this step's edge it is part of the change.
    if (g.weight !== null && mark.kind !== "tree") {
      ctx.save();
      ctx.fillStyle = getCSSVar(change ? "--color-state-change" : "--color-paper");
      ctx.beginPath();
      ctx.roundRect(g.label.x - 12, g.label.y - 10, 24, 20, 4);
      ctx.fill();
      ctx.font = `600 12px 'Outfit', system-ui, sans-serif`;
      ctx.fillStyle = getCSSVar(change ? "--color-state-change-text" : "--color-text");
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(g.weight), g.label.x, g.label.y);
      ctx.restore();
    }
  }
}

/** Value badges (every node, ∞ until reached) and queue or stack places on waiting nodes. */
export function drawRunBadges(ctx: CanvasRenderingContext2D, marks: RunMarks, nodes: GraphNode[], zoom: number): void {
  const k = markScale(zoom);
  const mono = getCSSVar("--font-mono");
  for (const node of nodes) {
    const badge: NodeBadge = marks.nodes.get(node.id) ?? { changed: false };
    if (marks.valued) drawValueBadge(ctx, node, badge, k, mono);
    if (badge.slot !== undefined) {
      const at = SLOT_BADGE.at(node);
      ctx.save();
      ctx.translate(at.x, at.y);
      ctx.scale(k, k);
      ctx.beginPath();
      ctx.arc(0, 0, SLOT_BADGE.r, 0, Math.PI * 2);
      ctx.fillStyle = getCSSVar("--color-badge");
      ctx.fill();
      ctx.strokeStyle = getCSSVar("--color-state-waiting");
      ctx.lineWidth = 1.25;
      ctx.stroke();
      ctx.font = `700 ${SLOT_BADGE.fontSize}px 'Outfit', system-ui, sans-serif`;
      ctx.fillStyle = getCSSVar("--color-badge-text");
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(badge.slot), 0, 0.5);
      ctx.restore();
    }
  }
}

/** A value beside a node; when this step lowered it, the old value struck through, then the new one. */
function drawValueBadge(ctx: CanvasRenderingContext2D, node: GraphNode, badge: NodeBadge, k: number, mono: string) {
  const text = num(badge.value);
  const oldText = badge.changed && badge.old !== undefined ? num(badge.old) : undefined;
  const changed = oldText !== undefined;
  const width = VALUE_BADGE.width(text, oldText);
  const h = VALUE_BADGE.height;
  const at = VALUE_BADGE.at(node);
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.scale(k, k);
  ctx.beginPath();
  ctx.roundRect(-width / 2, -h / 2, width, h, h / 2);
  ctx.fillStyle = getCSSVar(changed ? "--color-state-change" : "--color-badge");
  ctx.fill();
  if (!changed) {
    ctx.strokeStyle = getCSSVar("--color-badge-line");
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.textBaseline = "middle";
  const textColor = getCSSVar(changed ? "--color-state-change-text" : badge.value === undefined ? "--color-text-muted" : "--color-badge-text");
  const bold = `700 ${VALUE_BADGE.fontSize}px ${mono}`;
  if (!changed) {
    ctx.font = bold;
    ctx.textAlign = "center";
    ctx.fillStyle = textColor;
    ctx.fillText(text, 0, 0.5);
  } else {
    // Old value (lighter, struck through), then " → new", centred together.
    const light = `500 ${VALUE_BADGE.fontSize}px ${mono}`;
    const rest = ` → ${text}`;
    ctx.font = light;
    const oldWidth = ctx.measureText(oldText).width;
    ctx.font = bold;
    const restWidth = ctx.measureText(rest).width;
    let x = -(oldWidth + restWidth) / 2;
    ctx.textAlign = "left";
    ctx.fillStyle = textColor;
    ctx.globalAlpha = 0.75;
    ctx.font = light;
    ctx.fillText(oldText, x, 0.5);
    ctx.fillRect(x, -1.6, oldWidth, 1.2);
    ctx.globalAlpha = 1;
    x += oldWidth;
    ctx.font = bold;
    ctx.fillText(rest, x, 0.5);
  }
  ctx.restore();
}
