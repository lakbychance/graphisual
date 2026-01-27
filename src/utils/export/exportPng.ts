/**
 * PNG Export utility
 * Converts SVG to PNG using canvas for raster export
 */

import { prepareSvgForExport } from './exportSvg';

export interface ExportPngOptions {
  /** Include the grid background in export (default: true) */
  includeGrid?: boolean;
  /** Filename for the downloaded PNG (default: 'graph.png') */
  filename?: string;
  /** Scale factor for high-DPI export (default: 4) */
  scale?: number;
}

/**
 * Export the SVG element as a PNG image
 *
 * @param svgElement - The SVG element to export
 * @param options - Export options
 */
export async function exportPng(
  svgElement: SVGSVGElement,
  options: ExportPngOptions = {}
): Promise<void> {
  const { includeGrid = true, filename = 'graph.png', scale = 4 } = options;

  // 1. Prepare SVG (reuse shared logic from exportSvg)
  const preparedSvg = await prepareSvgForExport(svgElement, { includeGrid });

  // 2. Get dimensions from viewBox
  const viewBox = preparedSvg.getAttribute('viewBox');
  const [, , width, height] = viewBox?.split(' ').map(Number) || [0, 0, 800, 600];

  // 3. Serialize SVG to data URL
  const svgString = new XMLSerializer().serializeToString(preparedSvg);
  const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);

  // 4. Load into Image
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load SVG image'));
    img.src = svgDataUrl;
  });

  // 5. Create canvas with scaled dimensions for high-quality output
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  ctx.scale(scale, scale);

  // 6. Draw image to canvas
  ctx.drawImage(img, 0, 0, width, height);

  // 7. Convert to PNG blob and download
  await new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
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
