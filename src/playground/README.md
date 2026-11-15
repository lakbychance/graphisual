# Theme playground

`/theme-playground` (code-split; `App.tsx` swaps it in for `Board` on that path).
Deep links: `?view=stage&skin=phosphor`, `?skin=blueprint`.

Every Graphisual control is rebuilt on [ui-sdk](https://ui-sdk.dev) (`@ui-sdk/react`,
headless behaviours + ARIA, popups in the top layer, no portals) and rendered in
five skins so the same component can be compared side by side.

## Layers

| Layer | Where | What it owns |
|---|---|---|
| Behaviour | `@ui-sdk/react/*` | focus, keyboard, ARIA, open/close, `data-*` state attributes |
| Primitives | `src/components/ui-sdk/*.tsx` | thin wrappers that add `gs-*` classes and `data-variant` / `data-size` |
| Component CSS | `src/components/ui-sdk/ui-sdk.css` | one stylesheet, styled from *derived tokens* (`--panel-bg`, `--control-shadow`, `--selected-bg`, …) |
| Skins | `src/theme/tokens.css` (paper, anodized, blueprint = the live Light/Dark/Blueprint themes) and `src/playground/skins.css` (slate, phosphor) | `[data-skin="…"]` scopes that redefine the palette plus the derived tokens; every per-theme look is a derived token (no theme-scoped selectors), so skins cannot leak into each other |
| Recipes | `src/playground/recipes/*` | Graphisual composites (toolbar, step controls, trace panel, popups…) with mock state |
| Stage | `src/playground/Stage.tsx` | the whole board chrome over a grid canvas with a steppable BFS |

## Adding a skin

1. Add a `[data-skin="name"]` block in `skins.css`. Start by copying `slate` (token-only) and
   change colours; if a look needs a new part (a mark, a lamp), add it to `ui-sdk.css` behind a token with a neutral default rather than writing a theme-scoped rule.
2. Register it in `skins.ts` (name, tagline, swatches).

### The one gotcha

A `var()` inside a custom property resolves on the element where the property is *declared*.
The derived tokens in `tokens.css` are therefore declared on `:root, [data-skin]`, so each skin
recomputes them from its own palette. If you add a derived token, add it to that block.

## Wiring

- `globals.css` declares `@layer ui-sdk;` first so our component layer wins over the CSS ui-sdk injects, and imports `ui-sdk.css` globally (the live app uses the same primitives).
- `vercel.json` rewrites `/theme-playground` to `index.html`.
