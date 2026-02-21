/**
 * Node renderer for Canvas.
 * Draws nodes with gradients, strokes, crosshatch overlay, and labels.
 */

import type { GraphNode } from "../../Graph/types";
import type { NodeColorState } from "../../../utils/cssVariables";
import {
  getNodeGradientColors,
  getNodeStrokeColor,
  getCSSVar,
} from "../../../utils/cssVariables";
import { NODE_STROKE } from "../../../constants/ui";
import { NODE } from "../../../constants/graph";

export interface NodeRenderOptions {
  isSelected: boolean;
  isHovered: boolean;
  colorState: NodeColorState;
  scale?: number; // For entrance animation
  opacity?: number; // For entrance animation
  isEdgeCreateSource?: boolean; // Highlight during edge creation drag
  isEdgeCreateTarget?: boolean; // Highlight when hovering as edge target
}

/**
 * Create a linear gradient for a node (diagonal, matching SVG).
 */
function createNodeGradient(
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  colorState: NodeColorState
): CanvasGradient {
  const colors = getNodeGradientColors(colorState);
  // Diagonal gradient from top-left to bottom-right (matching SVG x1=0% y1=0% x2=100% y2=100%)
  const gradient = ctx.createLinearGradient(
    node.x - node.r,
    node.y - node.r,
    node.x + node.r,
    node.y + node.r
  );

  gradient.addColorStop(0, colors.start);
  gradient.addColorStop(0.5, colors.mid);
  gradient.addColorStop(1, colors.end);

  return gradient;
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
  radius: number
): void {
  // Create cache key based on radius and text color (for theme changes)
  const size = Math.ceil(radius * 2);
  const color = getCSSVar('--color-text');
  const cacheKey = `${size}-${color}`;

  let patternCanvas = crosshatchCache.get(cacheKey);

  if (!patternCanvas) {
    // Create offscreen canvas for masked crosshatch
    patternCanvas = document.createElement('canvas');
    patternCanvas.width = size;
    patternCanvas.height = size;
    const pCtx = patternCanvas.getContext('2d')!;

    const center = size / 2;
    const r = radius;

    // Draw crosshatch pattern - SVG uses rotate(45) on vertical lines = bottom-left to top-right (/)
    const spacing = 5; // Slightly more sparse than SVG's 3 for cleaner look
    pCtx.strokeStyle = color;
    pCtx.lineWidth = 0.6; // Slightly thinner for subtler effect
    pCtx.globalAlpha = 0.2; // Reduced opacity

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

    // Radial gradient mask: transparent center, opaque edges
    // Offset to top-left (35%) for lighting effect, r=60%
    const maskGradient = pCtx.createRadialGradient(
      center - r * 0.15, // cx="35%" offset
      center - r * 0.15, // cy="35%" offset
      0,
      center,
      center,
      r * 0.6 // r="60%"
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
    node.y - radius
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
    scale = 1,
    opacity = 1,
    isEdgeCreateSource = false,
    isEdgeCreateTarget = false,
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

  // Main circle with gradient fill
  const gradient = createNodeGradient(ctx, node, colorState);
  ctx.beginPath();
  ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
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
  const strokeWidth = isSelected ? NODE_STROKE.SELECTED : NODE_STROKE.DEFAULT;

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = strokeWidth;
  ctx.stroke();

  // Crosshatch overlay
  drawCrosshatch(ctx, node, radius);

  ctx.restore();

  // Label (drawn without transforms affecting it)
  drawNodeLabel(ctx, node, radius);
}

/**
 * Draw node label (ID number).
 */
function drawNodeLabel(
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  _radius: number
): void {
  // Match SVG: text-xs (12px) on desktop
  const fontSize = 12;

  ctx.save();
  ctx.font = `bold ${fontSize}px 'Outfit', system-ui, sans-serif`;
  ctx.fillStyle = getCSSVar('--color-text');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(node.label || node.id.toString(), node.x, node.y);
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
