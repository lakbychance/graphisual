/**
 * 3D PNG Export utility
 * Captures WebGL canvas as PNG with proper background
 */

export interface Export3DPngOptions {
  /** Filename for the downloaded PNG (default: 'graph-3d.png') */
  filename?: string;
  /** Scale factor for high-DPI export (default: 4) */
  scale?: number;
  /** Include the paper background color in export (default: true) */
  includeBackground?: boolean;
}

/**
 * Get the current paper background color from CSS custom properties
 */
function getPaperColor(): string {
  const style = getComputedStyle(document.documentElement);
  return style.getPropertyValue('--color-paper').trim() || '#f5f3ef';
}

/**
 * Export a WebGL canvas as a PNG image
 * Composites the transparent WebGL canvas onto the paper background color
 *
 * @param canvas - The WebGL canvas element to export
 * @param options - Export options
 */
export async function export3DPng(
  canvas: HTMLCanvasElement,
  options: Export3DPngOptions = {}
): Promise<void> {
  const { filename = 'graph-3d.png', scale = 1.5, includeBackground = true } = options;

  const width = canvas.width;
  const height = canvas.height;

  // Create a new canvas for compositing with scaled dimensions for high-quality output
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = width * scale;
  exportCanvas.height = height * scale;
  const ctx = exportCanvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Apply scale transform for high-DPI rendering
  ctx.scale(scale, scale);

  // Fill with paper background color first (if enabled)
  if (includeBackground) {
    ctx.fillStyle = getPaperColor();
    ctx.fillRect(0, 0, width, height);
  }

  // Draw the WebGL canvas on top (preserves transparency correctly)
  ctx.drawImage(canvas, 0, 0, width, height);

  // Convert to PNG blob and download
  await new Promise<void>((resolve, reject) => {
    exportCanvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to create PNG blob'));
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the object URL after a short delay
      setTimeout(() => URL.revokeObjectURL(url), 100);
      resolve();
    }, 'image/png');
  });
}
