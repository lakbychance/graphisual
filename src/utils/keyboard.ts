/**
 * Keyboard utility functions for handling shortcuts consistently
 */

// Detect if running on Mac
export const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPod|iPhone|iPad/.test(navigator.platform);

// Display symbol for modifier key (⌘ on Mac, Ctrl on Windows/Linux)
export const MOD_KEY = isMac ? "⌘" : "Ctrl";

/**
 * Check if the platform modifier key is pressed (Cmd on Mac, Ctrl on Windows/Linux)
 */
export const isModKey = (e: KeyboardEvent): boolean => {
  return e.ctrlKey || e.metaKey;
};
