/**
 * Centralized 3D Theme Configuration
 *
 * All color constants for the 3D graph visualization.
 * Organized by component and theme for easy maintenance.
 */

import type { ResolvedTheme } from "../../hooks/useResolvedTheme";

// =============================================================================
// Node Colors
// =============================================================================

export const NODE_STROKE_COLORS: Record<ResolvedTheme, string> = {
  light: '#a09080',    // Warm brown
  dark: '#787878',     // Gray
  blueprint: '#4080c0', // Blue
};

export const NODE_LIGHT_THEME = {
  defaultColor: '#fff0d8',    // Warm cream
  defaultEmissive: '#ffe0a0', // Soft gold glow
} as const;

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
