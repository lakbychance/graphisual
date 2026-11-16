# Theme playground

`/theme-playground`, **local development only**: `App.tsx` swaps it in for `Board` on that path when
`import.meta.env.DEV` is true, so production builds do not include it and the path is not served.
Deep links: `?view=stage&skin=tungsten`, `?skin=blueprint`.

Every Graphisual control is rebuilt on [ui-sdk](https://ui-sdk.dev) (`@ui-sdk/react`,
headless behaviours + ARIA, popups in the top layer, no portals) and rendered in
the app's three themes so the same component can be compared side by side.

## Layers

| Layer | Where | What it owns |
|---|---|---|
| Behaviour | `@ui-sdk/react/*` | focus, keyboard, ARIA, open/close, `data-*` state attributes |
| Primitives | `src/components/ui-sdk/*.tsx` | thin wrappers that add `gs-*` classes and `data-variant` / `data-size` |
| Component CSS | `src/components/ui-sdk/ui-sdk.css` | one stylesheet, styled from *derived tokens* (`--panel-bg`, `--control-shadow`, `--selected-bg`, …) |
| Skins | `src/theme/tokens.css` (paper, tungsten, blueprint = the live Light/Dark/Blueprint themes) ; `src/playground/skins.css` only gives a scope its background | `[data-skin="…"]` scopes that redefine the palette plus the derived tokens; every per-theme look is a derived token (no theme-scoped selectors), so skins cannot leak into each other |
| Recipes | `src/playground/recipes/*` | Graphisual composites (toolbar, step controls, trace panel, popups…) with mock state |
| Stage | `src/playground/Stage.tsx` | the whole board chrome over a grid canvas with a steppable BFS |

## Simulated physics

On app-wide: `main.tsx` calls `setControlPhysicsEnabled(true)`, which marks `<body>` with
`data-physics` (skipped under reduced motion). The Physics switch here turns it off to compare
against plain transitions; the Feel slider sets `--phys-intensity` for the playground only
(0 = dead, 100 = the theme as designed).

| Piece | Where | What it does |
|---|---|---|
| Engine | `components/ui-sdk/physics/engine.ts` | one frame loop; `Body` = a mass on a damped spring with hard stops, stepped at 480 Hz |
| Material | `components/ui-sdk/physics/material.ts` | reads the theme's `--phys-*` tokens from the element that was touched |
| Controls | `components/ui-sdk/physics/controls.ts` + `physics.css` | key caps, latches, slider thumb, switch, sliding indicators and popups take their position from the simulation instead of a transition; contacts voice the sounds |
| Graph | `components/ui-sdk/physics/graph.ts`, `recipes/GraphLab.tsx` | nodes with weight, edges that bow when their ends move, and the edge being drawn as a thread / wire / pen |
| App graph | `src/physics/graphMotion.ts` | the same three behaviours for the real graph: sits between the pointer and the graph store, and publishes edge bows and the drawn line to both the SVG and canvas renderers |

`@ui-sdk/core/gesture` supplies velocity tracking, rubber-banding and throw distance; ui-sdk still
owns every value and state (a slider's value is always exactly where the pointer put it).
A theme's material is token-only, like everything else: `--phys-key-*`, `--phys-slide-*`,
`--phys-popup-*`, `--phys-edge*`, `--phys-node-*` in `src/theme/tokens.css`.

## Adding a skin

1. Add a `[data-skin="name"]` block next to a theme in `src/theme/tokens.css` (token-only); if a look needs a new part (a mark, a lamp), add it to `ui-sdk.css` behind a token with a neutral default rather than writing a theme-scoped rule.
2. Register it in `skins.ts` (name, tagline, swatches).

### The one gotcha

A `var()` inside a custom property resolves on the element where the property is *declared*.
The derived tokens in `tokens.css` are therefore declared on `:root, [data-skin]`, so each skin
recomputes them from its own palette. If you add a derived token, add it to that block.

## Wiring

- `globals.css` declares `@layer ui-sdk;` first so our component layer wins over the CSS ui-sdk injects, and imports `ui-sdk.css` globally (the live app uses the same primitives).
- `vercel.json` rewrites `/theme-playground` to `index.html`.
