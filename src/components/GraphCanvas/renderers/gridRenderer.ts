/**
 * Grid background renderer for Canvas.
 * Matches the SVG GridBackground pattern with minor and major lines.
 */

import { getCSSVar } from "../../../utils/cssVariables";
import type { ViewportState } from "../ViewportTransform";

const GRID_MINOR = 24;  // Minor grid spacing (matches SVG)
const GRID_MAJOR = 120; // Major grid spacing (every 5 minor cells)

/**
 * Draw the grid background pattern with minor and major lines.
 */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  viewport: ViewportState
): void {
  // Calculate visible area in world coordinates
  const halfWidth = viewport.width / 2 / viewport.zoom;
  const halfHeight = viewport.height / 2 / viewport.zoom;

  const startX = Math.floor((-viewport.pan.x - halfWidth) / GRID_MINOR) * GRID_MINOR;
  const endX = Math.ceil((-viewport.pan.x + halfWidth) / GRID_MINOR) * GRID_MINOR;
  const startY = Math.floor((-viewport.pan.y - halfHeight) / GRID_MINOR) * GRID_MINOR;
  const endY = Math.ceil((-viewport.pan.y + halfHeight) / GRID_MINOR) * GRID_MINOR;

  // Thinner lines to match SVG rendering (canvas renders lines slightly heavier)
  const lineWidth = 0.5;

  // Draw minor grid lines
  const minorColor = getCSSVar('--color-grid-line');
  ctx.strokeStyle = minorColor;
  ctx.lineWidth = lineWidth;

  ctx.beginPath();
  for (let x = startX; x <= endX; x += GRID_MINOR) {
    // Skip major lines (will draw them separately)
    if (x % GRID_MAJOR !== 0) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
  }
  for (let y = startY; y <= endY; y += GRID_MINOR) {
    if (y % GRID_MAJOR !== 0) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
  }
  ctx.stroke();

  // Draw major grid lines (darker, every 5 cells)
  const majorColor = getCSSVar('--color-grid-line-major');
  ctx.strokeStyle = majorColor;
  ctx.lineWidth = lineWidth;

  ctx.beginPath();
  const majorStartX = Math.floor(startX / GRID_MAJOR) * GRID_MAJOR;
  const majorStartY = Math.floor(startY / GRID_MAJOR) * GRID_MAJOR;

  for (let x = majorStartX; x <= endX; x += GRID_MAJOR) {
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
  }
  for (let y = majorStartY; y <= endY; y += GRID_MAJOR) {
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
  }
  ctx.stroke();
}
