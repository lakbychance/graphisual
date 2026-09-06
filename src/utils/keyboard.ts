/**
 * Keyboard utility functions for handling shortcuts consistently
 */

/**
 * Check if the platform modifier key is pressed (Cmd on Mac, Ctrl on Windows/Linux)
 */
export const isModKey = (e: KeyboardEvent): boolean => {
  return e.ctrlKey || e.metaKey;
};
