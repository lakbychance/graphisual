/**
 * SVG Export utility with CSS variable resolution
 * Exports the graph as a standalone SVG with all styles embedded
 */

export interface ExportSvgOptions {
  /** Include the grid background in export (default: true) */
  includeGrid?: boolean;
  /** Filename for the downloaded SVG (default: 'graph.svg') */
  filename?: string;
}

/**
 * Collect all CSS variable names declared in stylesheets
 * This scans :root rules for custom property declarations (--*)
 */
function collectDeclaredCSSVariables(): Set<string> {
  const variables = new Set<string>();

  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        // Check :root rules where CSS variables are typically declared
        if (rule instanceof CSSStyleRule && rule.selectorText === ':root') {
          for (const prop of rule.style) {
            if (prop.startsWith('--')) {
              variables.add(prop);
            }
          }
        }
      }
    } catch {
      // Cross-origin stylesheets will throw - skip them
    }
  }

  return variables;
}

/**
 * Get computed values for all declared CSS variables
 */
function getComputedCSSVariables(): Record<string, string> {
  const varNames = collectDeclaredCSSVariables();
  const styles = getComputedStyle(document.documentElement);
  const values: Record<string, string> = {};

  for (const varName of varNames) {
    const value = styles.getPropertyValue(varName).trim();
    if (value) {
      values[varName] = value;
    }
  }

  return values;
}

/**
 * Replace CSS variable references in a string with computed values
 * Uses a single regex pass with callback for O(n) performance
 */
function replaceCSSVariables(str: string, cssValues: Record<string, string>): string {
  return str.replace(/var\((--[a-zA-Z0-9-]+)(?:,[^)]*)?\)/g, (match, varName) => {
    return cssValues[varName] ?? match;
  });
}

/**
 * Remove grid background elements from the SVG clone
 */
function removeGridElements(svg: SVGSVGElement): void {
  // Grid is rendered as two large rects with pattern fills
  // They have x="-10000" y="-10000" width="20000" height="20000"
  const rects = svg.querySelectorAll('rect');
  rects.forEach((rect) => {
    const fill = rect.getAttribute('fill');
    if (fill === 'url(#gridMinor)' || fill === 'url(#gridMajor)') {
      rect.remove();
    }
  });
}

/**
 * Check if an element is inside a definition element (defs, mask, pattern, etc.)
 */
function isInsideDefsElement(el: Element): boolean {
  let parent = el.parentElement;
  while (parent) {
    const tagName = parent.tagName.toLowerCase();
    if (tagName === 'defs' || tagName === 'mask' || tagName === 'pattern' || tagName === 'clippath') {
      return true;
    }
    if (tagName === 'svg') {
      return false;
    }
    parent = parent.parentElement;
  }
  return false;
}

/**
 * Remove interactive-only elements that shouldn't appear in export
 * - Hit areas (invisible circles for touch/click targets)
 * - Edge connectors (only visible on hover)
 */
function removeInteractiveElements(svg: SVGSVGElement): void {
  // Process all circles to identify and remove interactive elements
  const circlesToRemove: Element[] = [];

  svg.querySelectorAll('circle').forEach((circle) => {
    // Never remove circles inside defs, mask, pattern, or clippath elements
    if (isInsideDefsElement(circle)) {
      return;
    }

    const className = circle.getAttribute('class') || '';
    const fill = circle.getAttribute('fill') || '';
    const style = circle.getAttribute('style') || '';
    const r = parseFloat(circle.getAttribute('r') || '0');

    // Remove hit area circles - they have fill-transparent class
    if (className.includes('fill-transparent')) {
      circlesToRemove.push(circle);
      return;
    }

    // Remove connector hit areas - they have cursor-crosshair class
    if (className.includes('cursor-crosshair')) {
      circlesToRemove.push(circle);
      return;
    }

    // Remove edge connector circles (small circles r <= 18)
    // But keep crosshatch overlay circles (fill="url(#crosshatch)")
    if (r > 0 && r <= 18) {
      const isCrosshatch = fill === 'url(#crosshatch)';
      if (!isCrosshatch) {
        circlesToRemove.push(circle);
        return;
      }
    }

    // Remove node hit area circles - large transparent circles for interaction
    // These have no explicit fill and are larger than the node (r > 40)
    if (r > 40 && !fill && !style.includes('fill')) {
      circlesToRemove.push(circle);
      return;
    }
  });

  // Remove identified elements
  circlesToRemove.forEach((el) => el.remove());
}

/**
 * Convert Tailwind classes to proper SVG attributes
 * This handles paths, text elements, and other elements that use Tailwind classes
 */
function resolveTailwindClasses(svg: SVGSVGElement): void {
  // Convert fill-transparent to fill="none"
  svg.querySelectorAll('.fill-transparent').forEach((el) => {
    el.setAttribute('fill', 'none');
  });

  // Convert font classes on text elements to inline styles
  svg.querySelectorAll('text').forEach((textEl) => {
    const className = textEl.getAttribute('class') || '';
    const existingStyle = textEl.getAttribute('style') || '';
    const styleUpdates: string[] = [];

    // Extract font-family from Tailwind class like font-['JetBrains_Mono']
    const fontFamilyMatch = className.match(/font-\['([^']+)'\]/);
    if (fontFamilyMatch) {
      // Convert underscore to space for font names
      const fontFamily = fontFamilyMatch[1].replace(/_/g, ' ');
      styleUpdates.push(`font-family: '${fontFamily}', monospace`);
    }

    // Extract font-weight from Tailwind classes
    // Note: Using slightly lighter weights as embedded fonts can render bolder
    if (className.includes('font-bold')) {
      styleUpdates.push('font-weight: 600');
    } else if (className.includes('font-semibold')) {
      styleUpdates.push('font-weight: 500');
    } else if (className.includes('font-medium')) {
      styleUpdates.push('font-weight: 400');
    }

    // Extract font-size from Tailwind classes like text-[14px] or lg:text-[12px]
    // Check if we're on a large screen (lg breakpoint = 1024px)
    const isLargeScreen = window.matchMedia('(min-width: 1024px)').matches;

    // Try to get lg: size first if on large screen
    const lgFontSizeMatch = className.match(/lg:text-\[(\d+)px\]/);
    // Get base font size (not prefixed with responsive modifier)
    // Split by space and find the text-[Xpx] that doesn't have a colon prefix
    const classes = className.split(' ');
    const baseFontSizeClass = classes.find(c => c.match(/^text-\[\d+px\]$/));
    const baseFontSizeMatch = baseFontSizeClass?.match(/text-\[(\d+)px\]/);

    if (isLargeScreen && lgFontSizeMatch) {
      styleUpdates.push(`font-size: ${lgFontSizeMatch[1]}px`);
    } else if (baseFontSizeMatch) {
      styleUpdates.push(`font-size: ${baseFontSizeMatch[1]}px`);
    }

    // Extract text-anchor from Tailwind arbitrary property [text-anchor:middle]
    const textAnchorMatch = className.match(/\[text-anchor:([^\]]+)\]/);
    if (textAnchorMatch) {
      textEl.setAttribute('text-anchor', textAnchorMatch[1]);
    }

    // Extract dominant-baseline from Tailwind arbitrary property [dominant-baseline:central]
    const dominantBaselineMatch = className.match(/\[dominant-baseline:([^\]]+)\]/);
    if (dominantBaselineMatch) {
      textEl.setAttribute('dominant-baseline', dominantBaselineMatch[1]);
    }

    // Apply style updates
    if (styleUpdates.length > 0) {
      const newStyle = existingStyle
        ? `${existingStyle}; ${styleUpdates.join('; ')}`
        : styleUpdates.join('; ');
      textEl.setAttribute('style', newStyle);
    }
  });

  // Remove cursor-* classes (not needed in export)
  svg.querySelectorAll('[class*="cursor-"]').forEach((el) => {
    const className = el.getAttribute('class') || '';
    const newClassName = className
      .split(' ')
      .filter(c => !c.startsWith('cursor-'))
      .join(' ');
    if (newClassName) {
      el.setAttribute('class', newClassName);
    } else {
      el.removeAttribute('class');
    }
  });
}

/**
 * Resolve CSS variables throughout the SVG element tree
 * Processes all elements in a single pass for better performance
 */
function resolveCSSVariables(svg: SVGSVGElement, cssValues: Record<string, string>): void {
  const attrsToProcess = ['style', 'fill', 'stroke', 'opacity', 'stop-color'];

  svg.querySelectorAll('*').forEach((el) => {
    for (const attr of attrsToProcess) {
      const value = el.getAttribute(attr);
      if (value?.includes('var(')) {
        el.setAttribute(attr, replaceCSSVariables(value, cssValues));
      }
    }
  });
}

/**
 * Add background color to the SVG for proper rendering in standalone viewers
 */
function addBackground(svg: SVGSVGElement, cssValues: Record<string, string>): void {
  const paperColor = cssValues['--color-paper'] || '#e5e0d8';

  // Get viewBox dimensions to size the background
  const viewBox = svg.getAttribute('viewBox');
  if (!viewBox) return;

  const [minX, minY, width, height] = viewBox.split(' ').map(parseFloat);

  // Create a background rect
  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('x', String(minX));
  bgRect.setAttribute('y', String(minY));
  bgRect.setAttribute('width', String(width));
  bgRect.setAttribute('height', String(height));
  bgRect.setAttribute('fill', paperColor);
  bgRect.setAttribute('data-export-background', 'true');

  // Insert after <defs> element (which must come first for definitions)
  // but before any visible content
  const defs = svg.querySelector('defs');
  if (defs && defs.nextSibling) {
    svg.insertBefore(bgRect, defs.nextSibling);
  } else if (defs) {
    svg.appendChild(bgRect);
  } else {
    // No defs, insert as first child
    const firstChild = svg.firstChild;
    if (firstChild) {
      svg.insertBefore(bgRect, firstChild);
    } else {
      svg.appendChild(bgRect);
    }
  }
}

/**
 * Clean up React-specific attributes that shouldn't be in the exported SVG
 * Processes all elements in a single pass
 */
function cleanupReactAttributes(svg: SVGSVGElement): void {
  svg.querySelectorAll('*').forEach((el) => {
    // Remove data-* attributes added by React
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith('data-')) {
        el.removeAttribute(attr.name);
      }
    }
    // Remove empty class attributes
    if (el.getAttribute('class') === '') {
      el.removeAttribute('class');
    }
  });
}

/**
 * Add XML namespace declarations for standalone SVG
 */
function addNamespaces(svg: SVGSVGElement): void {
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
}

// Cache for embedded font CSS rules (fetched once, reused on subsequent exports)
let cachedFontFaceRules: string | null = null;
let fontFetchPromise: Promise<string> | null = null;

/**
 * Fetch a font file and convert to base64 data URL
 */
async function fetchFontAsBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch font: ${response.status}`);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('Failed to fetch font:', error);
    return '';
  }
}

/**
 * Parse Google Fonts CSS to extract WOFF2 URLs
 */
function parseGoogleFontsCss(css: string): Map<string, string> {
  const fontUrls = new Map<string, string>();

  // Match @font-face blocks
  const fontFaceRegex = /@font-face\s*\{([^}]+)\}/g;
  let match;

  while ((match = fontFaceRegex.exec(css)) !== null) {
    const block = match[1];

    // Extract font-family
    const familyMatch = block.match(/font-family:\s*['"]([^'"]+)['"]/);
    // Extract font-weight
    const weightMatch = block.match(/font-weight:\s*(\d+)/);
    // Extract woff2 URL
    const urlMatch = block.match(/url\(([^)]+\.woff2)\)/);

    if (familyMatch && weightMatch && urlMatch) {
      const key = `${familyMatch[1]}-${weightMatch[1]}`;
      fontUrls.set(key, urlMatch[1]);
    }
  }

  return fontUrls;
}

/**
 * Fetch and cache font face rules (called once, cached for subsequent exports)
 */
async function fetchFontFaceRules(): Promise<string> {
  // Return cached rules if available
  if (cachedFontFaceRules !== null) {
    return cachedFontFaceRules;
  }

  // If a fetch is already in progress, wait for it
  if (fontFetchPromise !== null) {
    return fontFetchPromise;
  }

  // Start fetching fonts
  const googleFontsUrl = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap';

  fontFetchPromise = (async () => {
    let fontFaceRules = '';

    try {
      // Fetch the CSS from Google Fonts
      const response = await fetch(googleFontsUrl);

      if (response.ok) {
        const css = await response.text();
        const fontUrls = parseGoogleFontsCss(css);

        // Fetch each font and convert to base64
        for (const [key, url] of fontUrls) {
          const [family, weight] = key.split('-');
          const base64 = await fetchFontAsBase64(url);

          if (base64) {
            fontFaceRules += `
              @font-face {
                font-family: '${family}';
                font-weight: ${weight};
                font-style: normal;
                src: url(${base64}) format('woff2');
              }
            `;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to fetch fonts from Google Fonts:', error);
    }

    // Fallback: if we couldn't fetch fonts, use import as backup
    if (!fontFaceRules) {
      fontFaceRules = `@import url('${googleFontsUrl}');`;
    }

    // Cache the result
    cachedFontFaceRules = fontFaceRules;
    fontFetchPromise = null;

    return fontFaceRules;
  })();

  return fontFetchPromise;
}

/**
 * Embed fonts directly in the SVG as base64 for offline support
 * Uses cached fonts after first fetch
 */
async function embedFonts(svg: SVGSVGElement): Promise<void> {
  // Get font face rules (from cache or fetch)
  const fontFaceRules = await fetchFontFaceRules();

  // Create style element
  const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  styleEl.textContent = fontFaceRules;

  // Insert style element at the beginning of defs
  const defs = svg.querySelector('defs');
  if (defs) {
    defs.insertBefore(styleEl, defs.firstChild);
  } else {
    const newDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    newDefs.appendChild(styleEl);
    svg.insertBefore(newDefs, svg.firstChild);
  }
}

/**
 * Trigger file download of the SVG string
 */
function downloadSvg(svgString: string, filename: string): void {
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the object URL after a short delay
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export interface PrepareSvgOptions {
  /** Include the grid background in export (default: true) */
  includeGrid?: boolean;
}

/**
 * Prepare an SVG element for export by resolving CSS variables, embedding fonts, etc.
 * This is the shared preparation logic used by both SVG and PNG export.
 *
 * @param svgElement - The SVG element to prepare
 * @param options - Preparation options
 * @returns A cloned and prepared SVG element ready for export
 */
export async function prepareSvgForExport(
  svgElement: SVGSVGElement,
  options: PrepareSvgOptions = {}
): Promise<SVGSVGElement> {
  const { includeGrid = true } = options;

  // 1. Get computed CSS values from current theme (dynamically discovered from :root)
  const cssValues = getComputedCSSVariables();

  // 2. Deep clone the SVG element
  const clone = svgElement.cloneNode(true) as SVGSVGElement;

  // 3. Remove grid elements if requested
  if (!includeGrid) {
    removeGridElements(clone);
  }

  // 4. Remove interactive-only elements (hit areas, connectors)
  removeInteractiveElements(clone);

  // 5. Convert Tailwind classes to proper SVG attributes (e.g., fill-transparent → fill="none")
  resolveTailwindClasses(clone);

  // 6. Resolve all CSS variables in the clone
  resolveCSSVariables(clone, cssValues);

  // 7. Add background color for proper standalone rendering
  addBackground(clone, cssValues);

  // 8. Clean up React-specific attributes
  cleanupReactAttributes(clone);

  // 9. Embed fonts for proper text rendering
  await embedFonts(clone);

  // 10. Add proper XML namespaces for standalone SVG
  addNamespaces(clone);

  return clone;
}

/**
 * Export the SVG element with all CSS styles resolved and embedded
 *
 * @param svgElement - The SVG element to export
 * @param options - Export options
 */
export async function exportSvg(
  svgElement: SVGSVGElement,
  options: ExportSvgOptions = {}
): Promise<void> {
  const { includeGrid = true, filename = 'graph.svg' } = options;

  // Prepare the SVG for export
  const clone = await prepareSvgForExport(svgElement, { includeGrid });

  // Serialize and download
  const svgString = new XMLSerializer().serializeToString(clone);

  // Add XML declaration for better compatibility
  const fullSvgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;

  downloadSvg(fullSvgString, filename);
}
