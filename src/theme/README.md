# Theming

Everything about how Graphisual is themed lives in this folder. Start here.

## The one primitive

**CSS custom properties on `<html>`.** They are defined in [`tokens.css`](./tokens.css) and are the
single source of truth for every colour, gradient, shadow, and dimension — used by the React UI, the SVG
graph, the Canvas renderer, the Three.js scene, and the export pipeline alike.

`:root` holds the **light** defaults. Each `[data-theme="dark"]` / `[data-theme="blueprint"]` block
overrides them. The active theme is selected by a single attribute on `<html>`:

```html
<html data-theme="dark">
```

Everything else is just a way of *reading* those variables for a particular render target.

## Consumption adapters

| Context | How it reads tokens | Example |
|---|---|---|
| **React UI** | Tailwind arbitrary utilities | `className="bg-(--color-paper) text-(--color-text)"` |
| **SVG graph** (`Node.tsx`, `Edge.tsx`, defs) | `var(--token)` in attributes | `fill="var(--gradient-visited-start)"` |
| **Canvas 2D & Three.js** | JS accessors in [`css-variables.ts`](./css-variables.ts) | `getCSSVar('--color-grid-line')`, `getNodeGradientColors('visited')` |
| **Export (SVG / PNG)** | `getThemeSnapshot()` inlines `var()` → literal | see [`utils/export/exportSvg.ts`](../utils/export/exportSvg.ts) |

Why the split: Tailwind classes and `var()` references don't survive into a standalone exported file, so
export resolves every token to a concrete hex/rgba value via `getThemeSnapshot()`. Canvas/WebGL need
literal colour strings at paint time, so they read through `getCSSVar` (cached; invalidated on theme
change). **Rule of thumb: anything that gets exported must use `var(--token)` or a JS accessor — never a
Tailwind colour class.**

## The theme-switch flow

```
user picks theme
  → settingsStore.theme            (persisted by zustand)
  → useResolvedTheme()             expands 'system' to live OS preference (reactive)
  → useApplyTheme()  (App.tsx)     sets <html data-theme> + invalidateCSSVarCache()
  → CSS cascade activates the matching token block; Canvas/3D re-read fresh values
```

- [`hooks.ts`](./hooks.ts) — `useApplyTheme()` (call once, in `App.tsx`) and `useResolvedTheme()`
  (for consumers that need the resolved value, e.g. the 3D scene). `useResolvedTheme` uses
  `useSyncExternalStore`, so switching the OS appearance while on **System** updates 2D *and* 3D live.
- [`constants.ts`](./constants.ts) — `THEME`, `Theme`, and `ResolvedTheme` (the single definition).

## Where 3D differs

Three.js materials need hex strings, and some 3D values (emissive glow, light-rig colours, brighter
strokes) have no CSS-token equivalent. [`three.ts`](./three.ts) is an **override registry**: CSS
variables are the default, and it only stores the values that must differ for 3D. If a value isn't in
`three.ts`, the CSS token is used. This keeps the 3D colour story auditable in one file.

## How to…

- **Add a token:** add it to `:root` in `tokens.css` (plus each `[data-theme]` block if it should differ
  per theme). It's then usable everywhere immediately: `bg-(--your-token)` in UI, `var(--your-token)` in
  SVG, `getCSSVar('--your-token')` in Canvas/3D, and it's auto-included in export snapshots.
- **Add a theme:** copy an existing `[data-theme="..."]` block in `tokens.css`, rename the selector, and
  adjust values. Register the option in `constants.ts` / the settings store / `ThemeSelector.tsx`.
- **Add a 3D-only colour:** add an override entry in `three.ts`.

## Files

| File | Role |
|---|---|
| `tokens.css` | All CSS variables, per theme (the values) |
| `theme-utilities.css` | Theme-driven utility classes/keyframes (focus ring, edge focus, control shadows) |
| `constants.ts` | `THEME` enum + `Theme` / `ResolvedTheme` types |
| `css-variables.ts` | `getCSSVar` (cached), semantic colour helpers, `getThemeSnapshot()` |
| `hooks.ts` | `useApplyTheme`, `useResolvedTheme` |
| `three.ts` | Three.js colour overrides + node geometry constants |
| `index.ts` | Public barrel — import theme things from `@/theme` |
