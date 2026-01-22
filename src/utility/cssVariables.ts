/**
 * CSS Variable Utility with Caching
 *
 * Provides cached access to CSS variables for better performance,
 * and typed accessors for common node/edge color states.
 */

// Cached CSS variable reader
const cache: Map<string, string> = new Map();

/**
 * Get a CSS variable value with caching.
 * Call invalidateCSSVarCache() when theme changes.
 */
export function getCSSVar(name: string): string {
  if (!cache.has(name)) {
    cache.set(name, getComputedStyle(document.documentElement).getPropertyValue(name).trim());
  }
  return cache.get(name)!;
}

/**
 * Clear the CSS variable cache. Should be called when theme changes.
 */
export function invalidateCSSVarCache(): void {
  cache.clear();
}

// ============================================================================
// Typed Color State Accessors
// ============================================================================

export type NodeColorState = 'default' | 'visited' | 'path' | 'start' | 'end';
export type EdgeColorState = 'default' | 'traversal' | 'path';

export interface GradientColors {
  start: string;
  mid: string;
  end: string;
}

/**
 * Get gradient colors for a node based on its visualization state.
 */
export function getNodeGradientColors(state: NodeColorState): GradientColors {
  switch (state) {
    case 'start':
      return {
        start: getCSSVar('--gradient-start-start'),
        mid: getCSSVar('--gradient-start-mid'),
        end: getCSSVar('--gradient-start-end'),
      };
    case 'end':
      return {
        start: getCSSVar('--gradient-end-start'),
        mid: getCSSVar('--gradient-end-mid'),
        end: getCSSVar('--gradient-end-end'),
      };
    case 'path':
      return {
        start: getCSSVar('--gradient-path-start'),
        mid: getCSSVar('--gradient-path-mid'),
        end: getCSSVar('--gradient-path-end'),
      };
    case 'visited':
      return {
        start: getCSSVar('--gradient-visited-start'),
        mid: getCSSVar('--gradient-visited-mid'),
        end: getCSSVar('--gradient-visited-end'),
      };
    case 'default':
    default:
      return {
        start: getCSSVar('--gradient-default-start'),
        mid: getCSSVar('--gradient-default-mid'),
        end: getCSSVar('--gradient-default-end'),
      };
  }
}

/**
 * Get the edge color based on visualization state.
 * Note: Uses node-stroke for default since edge-default uses rgba which doesn't work well in 3D.
 */
export function getEdgeColor(state: EdgeColorState): string {
  switch (state) {
    case 'path':
      return getCSSVar('--color-edge-path');
    case 'traversal':
      return getCSSVar('--color-edge-traversal');
    case 'default':
    default:
      return getCSSVar('--color-node-stroke');
  }
}

/**
 * Get the edge line width based on visualization state.
 */
export function getEdgeLineWidth(state: EdgeColorState): number {
  switch (state) {
    case 'path':
      return 3.5;
    case 'traversal':
      return 3;
    case 'default':
    default:
      return 2.5;
  }
}

/**
 * Get common UI colors from CSS variables.
 */
export function getUIColors() {
  return {
    text: getCSSVar('--color-text'),
    nodeStroke: getCSSVar('--color-node-stroke'),
    paper: getCSSVar('--color-paper'),
  };
}

/**
 * Get node stroke color based on visualization state.
 * Matches 2D node stroke behavior.
 */
export function getNodeStrokeColor(state: NodeColorState): string {
  switch (state) {
    case 'start':
      return getCSSVar('--color-tint-start');
    case 'end':
      return getCSSVar('--color-tint-end');
    case 'path':
      return getCSSVar('--color-tint-path');
    case 'visited':
      return getCSSVar('--color-tint-visited');
    case 'default':
    default:
      return getCSSVar('--color-node-stroke');
  }
}
