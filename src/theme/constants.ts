/**
 * Theme-related constants.
 * Uses `as const` for string literal preservation (needed for DOM data-theme attribute).
 */

export const THEME = {
  SYSTEM: 'system',
  LIGHT: 'light',
  DARK: 'dark',
  BLUEPRINT: 'blueprint',
} as const;

export type Theme = typeof THEME[keyof typeof THEME];

/** Resolved theme values (excludes 'system') */
export type ResolvedTheme = typeof THEME.LIGHT | typeof THEME.DARK | typeof THEME.BLUEPRINT;
