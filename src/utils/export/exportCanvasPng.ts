/**
 * PNG Export utility for Canvas renderer
 * Directly exports the canvas element to PNG
 */

export interface ExportCanvasPngOptions {
  /** Filename for the downloaded PNG (default: 'graph.png') */
  filename?: string;
  /** Scale factor for high-DPI export (default: 2) */
  scale?: number;
}

/**
 * Export the Canvas element as a PNG image
 *
 * @param canvasElement - The canvas element to export
 * @param options - Export options
 */
export async function exportCanvasPng(
  canvasElement: HTMLCanvasElement,
  options: ExportCanvasPngOptions = {}
): Promise<void> {
  const { filename = 'graph.png', scale = 2 } = options;

  // Get current canvas dimensions
  const width = canvasElement.clientWidth;
  const height = canvasElement.clientHeight;

  // Create a new canvas with scaled dimensions for high-quality output
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = width * scale;
  exportCanvas.height = height * scale;

  const ctx = exportCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Scale up for high-DPI export
  ctx.scale(scale, scale);

  // Draw the original canvas content
  // Note: This copies the current rendered state
  ctx.drawImage(canvasElement, 0, 0, width, height);

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
