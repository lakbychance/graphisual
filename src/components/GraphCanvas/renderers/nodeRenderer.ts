/**
 * Node renderer for Canvas.
 * Draws nodes with gradients, strokes, crosshatch overlay, and labels.
 */

import type { GraphNode, NodeRunState } from "../../Graph/types";
import {
  type NodeColorState,
  getNodeGradientColors,
  getNodeStrokeColor,
  getCSSVar,
} from "@/theme";
import { NODE_STROKE, NODE_STATE_MARK, NODE_RING, NODE_RUN_RING } from "../../../constants/ui";
import { NODE } from "../../../constants/graph";

interface NodeRenderOptions {
  isSelected: boolean;
  isHovered: boolean;
  colorState: NodeColorState;
  /** Where a run has the node: a ring while waiting or worked on, a pale fill once done (as in the SVG renderer). */
  runMark?: NodeRunState | null;
  scale?: number; // For entrance animation
  opacity?: number; // For entrance animation
  isEdgeCreateSource?: boolean; // Highlight during edge creation drag
  isEdgeCreateTarget?: boolean; // Highlight when hovering as edge target
  /**
   * The canvas's pixel scale for this frame (device pixel ratio x zoom). It is
   * the same for every node, so the render loop reads it once and passes it in.
   */
  pixelScale?: number;
}

// Cache for offscreen crosshatch pattern canvases
const crosshatchCache = new Map<string, HTMLCanvasElement>();

/**
 * Clear the crosshatch pattern cache.
 * Should be called when theme changes.
 */
export function invalidateCrosshatchCache(): void {
  crosshatchCache.clear();
}

/**
 * Draw the crosshatch pattern overlay for a node.
 * Matches SVG: single diagonal lines with sphere mask (lighter center, visible at edges).
 */
function drawCrosshatch(
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  radius: number,
  pixelScale: number
): void {
  // Create cache key based on radius and text color (for theme changes)
  // A theme sets the hatch strength; 0 means plain nodes (SVG default is 0.25).
  const strength = parseFloat(getCSSVar('--node-hatch-opacity'));
  if (!(strength > 0)) return;
  const size = Math.ceil(radius * 2);
  const color = getCSSVar('--color-text');
  // Rasterise at the canvas's real pixel scale (device pixel ratio x zoom) so the
  // lines stay as crisp as the SVG's; stepped to keep the cache small.
  const density = Math.min(4, Math.max(1, Math.ceil(pixelScale * 2) / 2));
  const cacheKey = `${size}-${color}-${strength}-${density}`;

  let patternCanvas = crosshatchCache.get(cacheKey);

  if (!patternCanvas) {
    // Create offscreen canvas for masked crosshatch
    patternCanvas = document.createElement('canvas');
    patternCanvas.width = Math.ceil(size * density);
    patternCanvas.height = Math.ceil(size * density);
    const pCtx = patternCanvas.getContext('2d')!;
    pCtx.scale(density, density);

    const center = size / 2;
    const r = radius;

    // Draw crosshatch pattern - SVG uses rotate(45) on vertical lines = bottom-left to top-right (/)
    // Same geometry as the SVG pattern: lines 3px apart (measured across the lines), 0.8px wide,
    // at the theme's opacity. The loop steps along x, so the step is 3 * sqrt(2).
    const spacing = 3 * Math.SQRT2;
    pCtx.strokeStyle = color;
    pCtx.lineWidth = 0.8;
    pCtx.globalAlpha = Math.min(1, strength);

    const bounds = r * 1.5;
    pCtx.beginPath();
    for (let i = -bounds; i <= bounds; i += spacing) {
      // Draw from bottom-left to top-right (/) to match SVG's rotated pattern
      pCtx.moveTo(center + i - bounds, center + bounds);
      pCtx.lineTo(center + i + bounds, center - bounds);
    }
    pCtx.stroke();

    // Apply sphere mask using destination-in
    // This keeps only the parts where the mask is opaque
    pCtx.globalCompositeOperation = 'destination-in';
    pCtx.globalAlpha = 1;

    // Radial gradient mask: transparent centre, opaque edges. The SVG mask is in
    // bounding-box units (box = 2r): cx/cy 35% is 0.3r up-left of centre, r 60% is 1.2r.
    const maskGradient = pCtx.createRadialGradient(
      center - r * 0.3,
      center - r * 0.3,
      0,
      center - r * 0.3,
      center - r * 0.3,
      r * 1.2
    );
    // SVG mask: 0% black (hidden), 40% #444 (partial), 100% white (visible)
    maskGradient.addColorStop(0, 'rgba(0,0,0,0)'); // Hidden at center
    maskGradient.addColorStop(0.4, 'rgba(0,0,0,0.27)'); // #444 ≈ 27% opacity
    maskGradient.addColorStop(1, 'rgba(0,0,0,1)'); // Visible at edges

    pCtx.beginPath();
    pCtx.arc(center, center, r, 0, Math.PI * 2);
    pCtx.fillStyle = maskGradient;
    pCtx.fill();

    // Clip to circle
    pCtx.globalCompositeOperation = 'destination-in';
    pCtx.beginPath();
    pCtx.arc(center, center, r, 0, Math.PI * 2);
    pCtx.fillStyle = 'black';
    pCtx.fill();

    crosshatchCache.set(cacheKey, patternCanvas);
  }

  // Draw the cached pattern at node position
  ctx.drawImage(
    patternCanvas,
    node.x - radius,
    node.y - radius,
    size,
    size
  );
}

/**
 * Draw a single node.
 */
export function drawNode(
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  options: NodeRenderOptions
): void {
  const {
    isSelected,
    isHovered,
    colorState,
    runMark = null,
    scale = 1,
    opacity = 1,
    isEdgeCreateSource = false,
    isEdgeCreateTarget = false,
    pixelScale = Math.abs(ctx.getTransform().a),
  } = options;

  // Apply animation transforms and hover scale
  const hoverScale = isHovered ? NODE.HOVER_SCALE : 1;
  const radius = node.r * scale * hoverScale;
  if (radius <= 0 || opacity <= 0) return;

  ctx.save();
  ctx.globalAlpha = opacity;

  // Edge creation highlight - draw hit area circle FIRST (behind node) like SVG
  if (isEdgeCreateSource || isEdgeCreateTarget) {
    const hitAreaRadius = radius + NODE.HIT_AREA_PADDING;

    ctx.beginPath();
    ctx.arc(node.x, node.y, hitAreaRadius, 0, Math.PI * 2);

    // Fill with accent glow
    ctx.fillStyle = getCSSVar('--color-accent-form-glow');
    ctx.fill();

    // Stroke - dashed for source, solid for target
    ctx.strokeStyle = getCSSVar('--color-accent-form');
    ctx.lineWidth = 1.5;
    if (isEdgeCreateSource) {
      ctx.setLineDash([4, 3]);
    }
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash
  }

  // Drop shadow - matches SVG: drop-shadow(1.5px 1.5px 3px ...)
  ctx.shadowColor = getCSSVar('--node-shadow-color');
  ctx.shadowBlur = 4; // Canvas blur ~= CSS blur * 1.3
  ctx.shadowOffsetX = 1.5;
  ctx.shadowOffsetY = 1.5;

  // Main circle: the same flat fill the SVG renderer uses (the gradient's mid colour)
  ctx.beginPath();
  ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
  const isDone = runMark === 'done';
  ctx.fillStyle = isDone ? getCSSVar('--color-state-done') : getNodeGradientColors(colorState).mid;
  ctx.fill();

  // Clear shadow for stroke
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Stroke - highlight for selection
  const strokeColor = isSelected
    ? getCSSVar('--color-accent-form')
    : getNodeStrokeColor(colorState);
  const stateMark = NODE_STATE_MARK[colorState];
  const strokeWidth = isSelected ? NODE_STROKE.SELECTED : NODE_STROKE.DEFAULT + stateMark.boost;

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = strokeWidth;
  ctx.stroke();

  // Inner ring for states that carry one (matches the SVG renderer)
  if (stateMark.ring !== 'none' && radius > NODE_RING.INSET) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius - NODE_RING.INSET, 0, Math.PI * 2);
    ctx.strokeStyle = getNodeStrokeColor(colorState);
    ctx.lineWidth = NODE_RING.WIDTH;
    if (stateMark.ring === 'dashed') ctx.setLineDash([...NODE_RING.DASH]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Crosshatch overlay (a done node is flat)
  if (!isDone) drawCrosshatch(ctx, node, radius, pixelScale);

  // Run ring: dashed while the node waits in the queue or stack, solid ink while it is worked on
  if (runMark === 'waiting' || runMark === 'current') {
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.r * scale + NODE_RUN_RING.GAP, 0, Math.PI * 2);
    ctx.strokeStyle = getCSSVar(runMark === 'current' ? '--color-state-current' : '--color-state-waiting');
    ctx.lineWidth = runMark === 'current' ? NODE_RUN_RING.CURRENT_WIDTH : NODE_RUN_RING.WAITING_WIDTH;
    if (runMark === 'waiting') ctx.setLineDash([...NODE_RUN_RING.WAITING_DASH]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();

  // Label (drawn without transforms affecting it)
  drawNodeLabel(ctx, node, radius, isDone ? '--color-state-done-text' : '--color-text');
}

/**
 * Draw node label (ID number).
 */
function drawNodeLabel(
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  _radius: number,
  colorVar: string
): void {
  // Match SVG: text-xs (12px) on desktop
  const fontSize = 12;

  ctx.save();
  ctx.font = `bold ${fontSize}px 'Outfit', system-ui, sans-serif`;
  ctx.fillStyle = getCSSVar(colorVar);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // +1: canvas 'middle' sits a pixel higher than the SVG label's 'central' baseline.
  ctx.fillText(node.label || node.id.toString(), node.x, node.y + 1);
  ctx.restore();
}

/**
 * Draw edge connectors (small circles at node edges).
 * Matches SVG: gradient fill, node-stroke color, drop shadow.
 */
export function drawConnectors(
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  visible: boolean
): void {
  if (!visible) return;

  // Match SVG CONNECTOR constants
  const offset = 8; // CONNECTOR.OFFSET
  const radius = 5; // CONNECTOR.RADIUS
  const positions = [
    { x: node.x, y: node.y - node.r - offset }, // top
    { x: node.x + node.r + offset, y: node.y }, // right
    { x: node.x, y: node.y + node.r + offset }, // bottom
    { x: node.x - node.r - offset, y: node.y }, // left
  ];

  ctx.save();

  // Match SVG: stroke with node-stroke color, width 1
  ctx.strokeStyle = getCSSVar('--color-node-stroke');
  ctx.lineWidth = 1;

  // Match SVG: drop shadow
  ctx.shadowColor = getCSSVar('--node-shadow-color');
  ctx.shadowBlur = 2;
  ctx.shadowOffsetX = 1.5;
  ctx.shadowOffsetY = 1.5;

  for (const pos of positions) {
    // Create gradient for each connector (matching nodeGradientDefault)
    const gradient = ctx.createLinearGradient(
      pos.x - radius,
      pos.y - radius,
      pos.x + radius,
      pos.y + radius
    );
    const colors = getNodeGradientColors('default');
    gradient.addColorStop(0, colors.start);
    gradient.addColorStop(0.5, colors.mid);
    gradient.addColorStop(1, colors.end);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Clear shadow for stroke
    ctx.shadowColor = 'transparent';
    ctx.stroke();

    // Restore shadow for next connector
    ctx.shadowColor = getCSSVar('--node-shadow-color');
  }

  ctx.restore();
}
