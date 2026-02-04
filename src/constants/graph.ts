/**
 * Graph-related constants.
 * Uses `as const` for string literal preservation (needed for DOM/SVG attributes).
 */

export const EDGE_TYPE = {
  DIRECTED: 'directed',
  UNDIRECTED: 'undirected',
} as const;

export type EdgeType = typeof EDGE_TYPE[keyof typeof EDGE_TYPE];

// Edge defaults
export const EDGE = {
  DEFAULT_WEIGHT: 1,
  MIN_WEIGHT: -999,
  MAX_WEIGHT: 999,
} as const;

// Node geometry
export const NODE = {
  RADIUS: 30,
  HIT_AREA_PADDING: 16,
  HOVER_SCALE: 1.15,
} as const;

// Connector geometry (edge connection points)
export const CONNECTOR = {
  OFFSET: 8,
  RADIUS: 5,
  TOUCH_HIT_AREA: 18,
} as const;

export const NODE_GRADIENT = {
  DEFAULT: 'nodeGradientDefault',
  VISITED: 'nodeGradientVisited',
  PATH: 'nodeGradientPath',
  START: 'nodeGradientStart',
  END: 'nodeGradientEnd',
} as const;

export type NodeGradientId = typeof NODE_GRADIENT[keyof typeof NODE_GRADIENT];

export const gradientUrl = (id: NodeGradientId): string => `url(#${id})`;
