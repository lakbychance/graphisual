/**
 * Theming engine — public API.
 *
 * ONE primitive: CSS custom properties on <html>, defined in `tokens.css`.
 * `data-theme` on <html> is the switch; each `[data-theme="..."]` block
 * overrides the `:root` defaults. Everything else is a consumption adapter:
 *
 *   | Context              | How it reads tokens                             |
 *   |----------------------|-------------------------------------------------|
 *   | React UI             | Tailwind arbitrary utils: `bg-(--color-paper)`  |
 *   | SVG graph            | `var(--token)` in element attributes            |
 *   | Canvas 2D / Three.js | `getCSSVar()` / semantic helpers (css-variables)|
 *   | Export (SVG/PNG)     | `getThemeSnapshot()` inlines var() -> literal   |
 *
 * See ./README.md for the full model, the theme-switch flow, and how to add a
 * token or a new theme.
 */

// Constants & types (single source of truth for THEME)
export { THEME, type Theme } from "./constants";

// Hooks — useApplyTheme() once in App.tsx; useResolvedTheme() in consumers
export { useApplyTheme, useResolvedTheme } from "./hooks";

// JS resolution API (Canvas / Three.js). Export reads getThemeSnapshot() from ./css-variables directly.
export {
  getCSSVar,
  getNodeGradientColors,
  getEdgeColor,
  getEdgeArrowColor,
  getEdgeLineWidth,
  getNodeStrokeColor,
  getUIColors,
  type NodeColorState,
  type EdgeColorState,
} from "./css-variables";

// 3D colour overrides (Three.js render adapter)
export {
  getNode3DColors,
  EDGE_COLORS,
  EDGE_EMISSIVE_OFF,
  GRID_COLORS,
  LIGHT_COLORS,
  NODE_GEOMETRY,
} from "./three";
