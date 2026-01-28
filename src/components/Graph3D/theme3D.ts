/**
 * Centralized 3D Theme Configuration
 *
 * All color constants for the 3D graph visualization.
 * Organized by component and theme for easy maintenance.
 */

import type { ResolvedTheme } from "../../hooks/useResolvedTheme";
import type { GradientColors } from "../../utils/cssVariables";

// =============================================================================
// Node Colors - Override-based configuration
// =============================================================================
// Only store values that OVERRIDE CSS variables. Missing = use CSS.
// This pattern is self-documenting: if a value isn't here, CSS is used.

type VisState = 'default' | 'visited' | 'path' | 'start' | 'end';

// Fill/emissive overrides (only light theme needs these for 3D appearance)
const NODE_FILL_OVERRIDES: Partial<Record<ResolvedTheme, Partial<Record<VisState, {
  fill: string;
  emissive: string;
}>>>> = {
  light: {
    default: { fill: '#faf6f0', emissive: '#f0d8a8' },
    visited: { fill: '#70c870', emissive: '#5cbc7e' },
    path:    { fill: '#e8b050', emissive: '#c38f41' },
    start:   { fill: '#60b8e0', emissive: '#40a0d0' },
    end:     { fill: '#e07860', emissive: '#d06048' },
  },
};

// Stroke overrides (most themes need brighter strokes for 3D visibility)
const NODE_STROKE_OVERRIDES: Partial<Record<ResolvedTheme, Partial<Record<VisState, string>>>> = {
  light: {
    default: '#a09080', visited: '#4a8a4a', path: '#b08030', start: '#3090b8', end: '#c05040',
  },
  dark: {
    default: '#a0a0a0', visited: '#5a9a5a', path: '#c0a060', start: '#60a0c0', end: '#c07060',
  },
  blueprint: {
    default: '#4080c0',
  },
};

/**
 * Get resolved node colors for 3D rendering.
 * Uses theme overrides if defined, otherwise falls back to CSS variables.
 */
export function getNode3DColors(
  theme: ResolvedTheme,
  visState: VisState,
  cssColors: GradientColors
): { fill: string; emissive: string; stroke: string } {
  const fillOverride = NODE_FILL_OVERRIDES[theme]?.[visState];
  const strokeOverride = NODE_STROKE_OVERRIDES[theme]?.[visState];

  return {
    fill: fillOverride?.fill ?? cssColors.mid,
    emissive: fillOverride?.emissive ?? cssColors.start,
    stroke: strokeOverride ?? cssColors.mid,
  };
}

// =============================================================================
// Edge Colors
// =============================================================================

export const EDGE_COLORS: Record<ResolvedTheme, string> = {
  light: '#7a6860',    // Warm brown
  dark: '#888888',     // Light gray
  blueprint: '#70b0e0', // Muted blue
};

export const EDGE_EMISSIVE_OFF = '#000000';

// =============================================================================
// Grid Colors
// =============================================================================

export const GRID_COLORS: Record<ResolvedTheme, { minor: string; major: string }> = {
  dark: {
    minor: '#3a3a3a',  // Muted gray
    major: '#454545',
  },
  blueprint: {
    minor: '#4a7a9e',  // Muted blue
    major: '#5588aa',
  },
  light: {
    minor: '#c4c0ba',  // Muted warm gray
    major: '#b0aca6',
  },
};

// =============================================================================
// Lighting Colors
// =============================================================================

export const LIGHT_COLORS = {
  key: '#ffffff',      // Pure white - main light
  fill: '#e0e8ff',     // Soft blue - fill light
  rim: '#fff5e6',      // Warm white - rim light
} as const;

// =============================================================================
// Node Geometry Sizes (relative to NODE.RADIUS)
// =============================================================================

export const NODE_GEOMETRY = {
  // Glow layer multipliers (dark theme)
  glowOuterScale: 1.12,
  glowInnerScale: 1.04,
  // Overlay sphere offset (for diagonal lines, prevents z-fighting)
  overlayOffset: 0.5,
  // Torus ring dimensions
  torusRadiusOffset: 1.5,
  torusTubeRadius: 2,
  // Sphere quality (segments)
  sphereSegments: 32,
  torusRadialSegments: 16,
  torusTubularSegments: 48,
} as const;
