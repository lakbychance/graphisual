# Graphisual

[![React Doctor](https://www.react.doctor/share/badge?p=graphisual&s=97&w=137&f=43)](https://www.react.doctor/share?p=graphisual&s=97&w=137&f=43)

An interactive graph editor and algorithm visualizer. Draw graphs, run algorithms, and step through their execution with real-time data structure visualization.

## Features

**Graph Editor**
- Create, move, and delete nodes and edges directly on canvas
- Directed and undirected edges with configurable weights (-999 to 999)
- Graph templates: path, cycle, complete, star, binary tree, grid, DAG, weighted random
- Pan, zoom, undo/redo, keyboard shortcuts

**Algorithm Visualization**
- Auto-play with adjustable speed (0.5x–4x) or manual step-through
- Real-time trace panel showing algorithm messages and data structures (queue, stack, priority queue, distance table)
- Visual highlighting of visited nodes, current path, and cycles

**Rendering**
- Three render modes: SVG (default), Canvas (optimized for large graphs), and 3D (Three.js)

**PWA**
- Installable as a standalone app with offline support

## Algorithms

| Category | Algorithm |
|---|---|
| Traversal | BFS, DFS, Cycle Detection |
| Shortest Path | Dijkstra's, Bellman-Ford, BFS Pathfinding, DFS Pathfinding |
| Minimum Spanning Tree | Prim's |

## Architecture

**Algorithm Adapter Pattern** — Each algorithm implements an `AlgorithmAdapter` interface and registers itself in a plugin registry. Adding a new algorithm doesn't require modifying core code.

**Multi-Renderer Abstraction** — A `GraphRenderer` abstraction layer supports SVG, Canvas, and 3D rendering behind a unified interface. The 3D renderer (Three.js + React Three Fiber) is code-split and lazy-loaded.

**Custom Vite Plugins** — The build pipeline uses 5 custom Vite plugins:
- `prerender` — Pre-renders algorithm landing pages to static HTML at build time for SEO, with Zod-validated page metadata and dev server support via `ssrLoadModule`
- `pwa` — Progressive Web App configuration with workbox service worker
- `jsonld` — Injects structured data into HTML
- `bundle-analyzer` — Generates bundle visualization (enabled with `ANALYZE=true`)
- `react-scan` — Performance monitoring integration

**State Management** — Zustand stores for graph data, undo/redo history (snapshot-based), and persisted user settings (theme, render mode).

## Tech Stack

React 19 · React Compiler · TypeScript · Vite · Zustand · Tailwind CSS v4 · Radix UI · Three.js · Zod

## Getting Started

```bash
pnpm install
pnpm dev
```

## License

MIT
