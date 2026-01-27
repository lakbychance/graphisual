/**
 * UI-related constants.
 * Zoom, drag detection, timing values, and asset URLs.
 */

// Zoom configuration
export const ZOOM = {
  MIN: 0.5,
  MAX: 2,
  STEP: 0.25,
} as const;

// Drag detection threshold (pixels)
export const DRAG_THRESHOLD = 5;

// Timing values (ms)
export const TIMING = {
  DEBOUNCE: 300,
  POPUP_DELAY: 100,
  TOOLTIP_DELAY: 300,
  DEFAULT_VISUALIZATION_SPEED: 400,
} as const;

// Self-hosted font URL (TTF for Three.js compatibility)
export const FONT_URL = '/fonts/outfit.ttf';
