# Theming

Everything about how Graphisual is themed lives in this folder. Start here.

## The one primitive

**CSS custom properties on `<html>`.** They are defined in [`tokens.css`](./tokens.css) and are the
single source of truth for every colour, gradient, shadow, and dimension — used by the React UI, the SVG
graph, the Canvas renderer, the Three.js scene, and the export pipeline alike.

`:root` holds the **light** defaults (Paper: flat cotton stock, ink, emboss/deboss). `[data-theme="dark"]` is **Anodized**
(matte graphite instrument, soft light, no ornament) and `[data-theme="blueprint"]` is **Blueprint** (flat linework, hatching, registration marks); each
block overrides the defaults. Besides the palette, every theme describes its *material* through
derived tokens that the ui-sdk component layer
([`components/ui-sdk/ui-sdk.css`](../components/ui-sdk/ui-sdk.css)) reads: the key (`--control-*`:
face, seat, wall, travel, lean), the cap inside a well (`--selected-*`), wells, plates (`--panel-*`),
status lamps (`--led-*`), slider, switch, readouts and textures.

Themes are sealed by construction: there are **no theme-scoped selectors** in the component layer.
A look that needs an extra part (Blueprint's registration marks, Anodized's lamps) is a structural
part in `ui-sdk.css` behind a token whose default is "off". Every derived token has a default on
`:root, [data-skin]`, so a nested skin scope re-declares all of them and nothing from the page theme
reaches into it. When adding a look, add a token with a neutral default; do not write
`[data-theme="…"] .gs-*` rules.

A key is two parts. The element is the **seat**: it never moves and draws what the cap stands on
or in (wall, slot, cast shadow: `--control-seat`, `--control-seat-bg`). Its `::before` is the **cap**
(`--control-bg`, `--control-face`), which drops by `--key-travel` when held so it covers the wall.
Pointer position on a pressed key is measured by
[`components/ui-sdk/press-physics.ts`](../components/ui-sdk/press-physics.ts), which sets
`--press-x` / `--press-y` / `--key-skew` so the cap leans toward the finger and is shaded there; a
theme sets `--key-lean` (px of height difference across the cap, `0` keeps it level).

Other tokens every theme should answer, because the component layer reads them on every control:
`--latch-*` (hover and press on toggles, segments and tabs that are not on), `--disabled-*` (an opaque
disabled look; left `initial` a control just fades), `--focus-*` (one thin ring everywhere),
`--legend-*` (the face used for what is written on a control), `--accent-text` / `--danger-text`
(accent colours dark or light enough to be read as text), and the hover / held tokens for the switch,
checkbox, slider thumb and menu rows. Never give a derived token the value `inherit`: on a custom
property that inherits the parent theme's value and leaks it into a nested skin. Use `initial` plus a
`var(--token, fallback)` in the component layer instead.

`:root` is also the Paper block, so anything Paper sets is inherited by the other themes unless they
set it too. When a theme adds a key token, give the other `[data-theme]` blocks an explicit value.

Each block also matches the theme playground's
`[data-skin]` scope so `/theme-playground` can show all themes on one page. The active theme is selected by a single attribute on `<html>`:

```html
<html data-theme="dark">
```

Everything else is just a way of *reading* those variables for a particular render target.

## Consumption adapters

| Context | How it reads tokens | Example |
|---|---|---|
| **React UI** | ui-sdk component layer (`gs-*` classes read derived tokens) and Tailwind arbitrary utilities | `<Button variant="primary">`, `className="bg-(--color-paper)"` |
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
| `theme-utilities.css` | Theme-driven utility classes/keyframes (focus ring, edge focus, canvas surface) |
| `constants.ts` | `THEME` enum + `Theme` / `ResolvedTheme` types |
| `css-variables.ts` | `getCSSVar` (cached), semantic colour helpers, `getThemeSnapshot()` |
| `hooks.ts` | `useApplyTheme`, `useResolvedTheme` |
| `three.ts` | Three.js colour overrides + node geometry constants |
| `index.ts` | Public barrel — import theme things from `@/theme` |
