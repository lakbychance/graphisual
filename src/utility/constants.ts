/**
 * Application-wide constants
 */

// Zoom configuration
export const ZOOM = {
  MIN: 0.5,
  MAX: 2,
  STEP: 0.25,
} as const;

// Drag detection threshold (pixels)
export const DRAG_THRESHOLD = 5;

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

// Timing values (ms)
export const TIMING = {
  DEBOUNCE: 300,
  POPUP_DELAY: 100,
  TOOLTIP_DELAY: 300,
  DEFAULT_VISUALIZATION_SPEED: 400,
} as const;

// Speed levels for visualization (multiplier display with actual ms delay)
export const SPEED_LEVELS = [
  { multiplier: '0.5x', ms: 800 },
  { multiplier: '1x', ms: 400 },
  { multiplier: '2x', ms: 200 },
  { multiplier: '4x', ms: 100 },
] as const;

// Self-hosted font URL (TTF for Three.js compatibility)
export const FONT_URL = '/fonts/outfit.ttf';
