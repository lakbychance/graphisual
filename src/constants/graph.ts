/**
 * Graph-related constants.
 * Uses `as const` for string literal preservation (needed for DOM/SVG attributes).
 */

export const EDGE_TYPE = {
  DIRECTED: 'directed',
  UNDIRECTED: 'undirected',
} as const;

export type EdgeType = typeof EDGE_TYPE[keyof typeof EDGE_TYPE];

export const NODE_GRADIENT = {
  DEFAULT: 'nodeGradientDefault',
  VISITED: 'nodeGradientVisited',
  PATH: 'nodeGradientPath',
  START: 'nodeGradientStart',
  END: 'nodeGradientEnd',
} as const;

export type NodeGradientId = typeof NODE_GRADIENT[keyof typeof NODE_GRADIENT];

export const gradientUrl = (id: NodeGradientId): string => `url(#${id})`;
