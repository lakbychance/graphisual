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

// Stroke pop animation for node selection and edge focus
export const STROKE_ANIMATION = {
  // Durations (seconds)
  DURATION: 0.15,
  POP_DURATION: 0.6,
  // Keyframe timing (when each keyframe is hit: start, peak, end)
  POP_TIMES: [0, 0.25, 1] as const,
  // Easing curve for pop effect
  POP_EASE: [0.2, 0, 0, 1] as const,
} as const;

// Node stroke widths for selection animation
export const NODE_STROKE = {
  DEFAULT: 1.5,
  SELECTED: 2.5,
  ACTIVE: 5,  // Peak of keyframe animation
} as const;

