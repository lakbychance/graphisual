/**
 * Viewport transformation utilities for Canvas rendering.
 * Handles conversion between screen coordinates and world (graph) coordinates.
 */

export interface ViewportState {
  zoom: number;
  pan: { x: number; y: number };
  width: number;
  height: number;
}

/**
 * Convert screen (client) coordinates to world (graph) coordinates.
 * Mirrors the SVG viewBox calculation from Graph.tsx.
 * Uses canvas.clientWidth/clientHeight for accurate sizing.
 */
export function screenToWorld(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  viewport: Pick<ViewportState, 'zoom' | 'pan'>
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();

  // Position relative to canvas element
  const canvasX = clientX - rect.left;
  const canvasY = clientY - rect.top;

  // Use actual canvas dimensions
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  // Convert to world coordinates
  // Canvas center is at world origin (0,0) plus pan offset
  const worldX = (canvasX - width / 2) / viewport.zoom - viewport.pan.x;
  const worldY = (canvasY - height / 2) / viewport.zoom - viewport.pan.y;

  return { x: worldX, y: worldY };
}

/**
 * Convert world (graph) coordinates to screen (client) coordinates.
 */
export function worldToScreen(
  worldX: number,
  worldY: number,
  canvas: HTMLCanvasElement,
  viewport: ViewportState
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();

  // Apply pan and zoom, then offset to canvas center
  const canvasX = (worldX + viewport.pan.x) * viewport.zoom + viewport.width / 2;
  const canvasY = (worldY + viewport.pan.y) * viewport.zoom + viewport.height / 2;

  // Convert to client coordinates
  const clientX = canvasX + rect.left;
  const clientY = canvasY + rect.top;

  return { x: clientX, y: clientY };
}

/**
 * Apply viewport transform to canvas context.
 * Call this before drawing graph elements.
 * @param dpr - Device pixel ratio, needed to maintain high-DPI rendering
 */
export function applyViewportTransform(
  ctx: CanvasRenderingContext2D,
  viewport: ViewportState,
  dpr: number = 1
): void {
  // Reset transform and reapply DPR scaling
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Move origin to canvas center
  ctx.translate(viewport.width / 2, viewport.height / 2);

  // Apply zoom
  ctx.scale(viewport.zoom, viewport.zoom);

  // Apply pan (in world coordinates)
  ctx.translate(viewport.pan.x, viewport.pan.y);
}

/**
 * Reset canvas transform to identity.
 */
export function resetTransform(ctx: CanvasRenderingContext2D): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
