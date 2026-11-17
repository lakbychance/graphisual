/**
 * Edge renderer for Canvas.
 * Draws edges with bezier curves, arrows, and weight labels.
 */

import type { GraphEdge } from "../../Graph/types";
import { type EdgeColorState, getEdgeColor, getCSSVar } from "@/theme";
import { EDGE } from "../../../constants/graph";
import { getControlPoint } from "../../../utils/geometry/calc";
import { DRAFT_DASH, dashOf, traceDraft, type DraftShape, type EdgeBow } from "@/physics/graphMotion";

interface EdgeRenderOptions {
  colorState: EdgeColorState;
  isFocused: boolean;
  /** How far the middle of the line lags while an end is moving, and what is left of the draft it was drawn as (see physics/graphMotion). */
  bow?: EdgeBow | null;
}

/**
 * Draw an arrowhead at the end of an edge.
 * Returns the arrow width so caller can shorten the line.
 */
function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  color: string,
  width: number = 18,
  height: number = 14
): number {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-width, -height / 2);
  ctx.lineTo(-width, height / 2);
  ctx.closePath();

  ctx.fillStyle = color;
  ctx.fill();

  ctx.restore();

  return width;
}

/**
 * Calculate the angle at the end of a quadratic bezier curve.
 */
function getBezierEndAngle(
  _x1: number,
  _y1: number,
  cx: number,
  cy: number,
  x2: number,
  y2: number
): number {
  // Tangent at t=1 is the direction from control point to end point
  return Math.atan2(y2 - cy, x2 - cx);
}

/**
 * Draw a weight label on an edge.
 */
function drawWeightLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  weight: number
): void {
  const text = weight.toString();
  const padding = 4;
  const fontSize = 12;

  ctx.save();
  ctx.font = `600 ${fontSize}px 'Outfit', system-ui, sans-serif`;

  const textMetrics = ctx.measureText(text);
  const textWidth = textMetrics.width;
  const textHeight = fontSize;

  // Background pill
  const bgWidth = textWidth + padding * 2;
  const bgHeight = textHeight + padding * 2;

  ctx.fillStyle = getCSSVar('--color-paper');
  ctx.beginPath();
  ctx.roundRect(x - bgWidth / 2, y - bgHeight / 2, bgWidth, bgHeight, 4);
  ctx.fill();

  // Text
  ctx.fillStyle = getCSSVar('--color-text');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);

  ctx.restore();
}

/**
 * Draw a directed edge (quadratic bezier with arrow).
 */
function drawDirectedEdge(
  ctx: CanvasRenderingContext2D,
  edge: GraphEdge,
  options: EdgeRenderOptions
): void {
  const { colorState, isFocused, bow } = options;
  // Just drawn (a new edge is always directed): the far end starts where the drafted line ended.
  const x2 = edge.x2 + (bow?.end?.x ?? 0);
  const y2 = edge.y2 + (bow?.end?.y ?? 0);
  const control = getControlPoint(edge.x1, edge.y1, x2, y2);
  const cx = control.cx + 2 * (bow?.x ?? 0);
  const cy = control.cy + 2 * (bow?.y ?? 0);

  const color = isFocused ? getCSSVar('--color-accent-form') : getEdgeColor(colorState);
  const lineWidth = edge.type === 'directed' ? 2 : 2.5;
  const arrowWidth = 18;
  const arrowHeight = 14;

  // Calculate angle at curve end and shorten endpoint to arrow base
  const angle = getBezierEndAngle(edge.x1, edge.y1, cx, cy, x2, y2);
  const shortenedX2 = x2 - Math.cos(angle) * arrowWidth;
  const shortenedY2 = y2 - Math.sin(angle) * arrowWidth;

  ctx.save();

  // Draw curve (shortened to arrow base)
  ctx.beginPath();
  ctx.moveTo(edge.x1, edge.y1);
  ctx.quadraticCurveTo(cx, cy, shortenedX2, shortenedY2);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(dashOf(bow) ?? []);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw arrowhead at original endpoint
  drawArrowhead(ctx, x2, y2, angle, color, arrowWidth, arrowHeight);

  ctx.restore();

  // Weight label (at curve center)
  if (edge.weight !== undefined && edge.weight !== EDGE.DEFAULT_WEIGHT) {
    // Calculate center of bezier: Q(0.5) = (P0 + 2*P1 + P2) / 4
    const centerX = (edge.x1 + 2 * cx + x2) / 4;
    const centerY = (edge.y1 + 2 * cy + y2) / 4;
    drawWeightLabel(ctx, centerX, centerY, edge.weight);
  }
}

/**
 * Draw an undirected edge (straight line).
 */
function drawUndirectedEdge(
  ctx: CanvasRenderingContext2D,
  edge: GraphEdge,
  options: EdgeRenderOptions
): void {
  const { colorState, isFocused, bow } = options;
  const color = isFocused ? getCSSVar('--color-accent-form') : getEdgeColor(colorState);

  ctx.save();

  ctx.beginPath();
  ctx.moveTo(edge.x1, edge.y1);
  if (bow) ctx.quadraticCurveTo((edge.x1 + edge.x2) / 2 + 2 * bow.x, (edge.y1 + edge.y2) / 2 + 2 * bow.y, edge.x2, edge.y2);
  else ctx.lineTo(edge.x2, edge.y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.restore();

  // Weight label (at midpoint)
  if (edge.weight !== undefined && edge.weight !== EDGE.DEFAULT_WEIGHT) {
    const centerX = (edge.x1 + edge.nodeX2) / 2 + (bow?.x ?? 0);
    const centerY = (edge.y1 + edge.nodeY2) / 2 + (bow?.y ?? 0);
    drawWeightLabel(ctx, centerX, centerY, edge.weight);
  }
}

/**
 * Draw an edge (directed or undirected).
 */
export function drawEdge(
  ctx: CanvasRenderingContext2D,
  edge: GraphEdge,
  options: EdgeRenderOptions
): void {
  if (edge.type === 'directed') {
    drawDirectedEdge(ctx, edge, options);
  } else {
    drawUndirectedEdge(ctx, edge, options);
  }
}

/**
 * Draw the edge being drawn in the shape the motion layer gives it (a thread,
 * a wire or a ruled line). Apart from its dashes it is drawn as the edge it
 * becomes: same colour and width, and the arrowhead ends where the line ends.
 */
export function drawDraftEdge(ctx: CanvasRenderingContext2D, shape: DraftShape): void {
  const color = getEdgeColor('default');

  ctx.save();
  ctx.beginPath();
  const end = traceDraft(ctx, shape);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([...DRAFT_DASH]);
  ctx.stroke();
  ctx.setLineDash([]);
  drawArrowhead(ctx, end.x, end.y, end.angle, color, 18, 14);
  ctx.restore();
}

/**
 * Draw box selection rectangle.
 */
export function drawSelectionBox(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): void {
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);

  ctx.save();

  // Fill
  ctx.fillStyle = getCSSVar('--color-accent-form');
  ctx.globalAlpha = 0.1;
  ctx.fillRect(left, top, width, height);

  // Stroke
  ctx.globalAlpha = 1;
  ctx.strokeStyle = getCSSVar('--color-accent-form');
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(left, top, width, height);

  ctx.restore();
}
