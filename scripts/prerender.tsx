import fs from "fs";
import path from "path";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { DijkstraLanding } from "../src/pages/DijkstraLanding";
import { BfsLanding } from "../src/pages/BfsLanding";
import { DfsLanding } from "../src/pages/DfsLanding";
import { BfsPathfindingLanding } from "../src/pages/BfsPathfindingLanding";
import { DfsPathfindingLanding } from "../src/pages/DfsPathfindingLanding";
import { PrimsLanding } from "../src/pages/PrimsLanding";
import { CycleDetectionLanding } from "../src/pages/CycleDetectionLanding";
import { BellmanFordLanding } from "../src/pages/BellmanFordLanding";

interface PageConfig {
  route: string;
  title: string;
  description: string;
  ogDescription: string;
  canonical: string;
  component: React.ComponentType;
  jsonLd: Record<string, unknown>;
}

function makeJsonLd(opts: {
  name: string;
  title: string;
  description: string;
  url: string;
  aboutName: string;
  aboutDescription: string;
  sameAs: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "name": opts.name,
    "headline": opts.title,
    "description": opts.description,
    "url": opts.url,
    "image": "https://ik.imagekit.io/lapstjup/graphisual/og-image",
    "author": {
      "@type": "Person",
      "name": "Lakshya Thakur",
      "url": "https://x.com/lakbychance",
    },
    "publisher": {
      "@type": "Organization",
      "name": "Graphisual",
      "url": "https://graphisual.app",
    },
    "mainEntity": {
      "@type": "SoftwareApplication",
      "name": "Graphisual",
      "applicationCategory": "EducationalApplication",
      "url": "https://graphisual.app",
    },
    "about": {
      "@type": "Thing",
      "name": opts.aboutName,
      "description": opts.aboutDescription,
      "sameAs": opts.sameAs,
    },
  };
}

const BASE = "https://graphisual.app";

const pages: PageConfig[] = [
  {
    route: "/algorithm/dijkstra",
    title: "Dijkstra's Algorithm Visualizer | Graphisual",
    description: "Visualize Dijkstra's shortest path algorithm step by step. Draw weighted graphs, set source and destination nodes, and watch the algorithm find the optimal path interactively.",
    ogDescription: "Visualize Dijkstra's shortest path algorithm step by step. Draw weighted graphs and watch the algorithm find the optimal path.",
    canonical: `${BASE}/algorithm/dijkstra`,
    component: DijkstraLanding,
    jsonLd: makeJsonLd({
      name: "Dijkstra's Algorithm Visualizer",
      title: "Dijkstra's Algorithm Visualizer | Graphisual",
      description: "Visualize Dijkstra's shortest path algorithm step by step. Draw weighted graphs, set source and destination nodes, and watch the algorithm find the optimal path interactively.",
      url: `${BASE}/algorithm/dijkstra`,
      aboutName: "Dijkstra's algorithm",
      aboutDescription: "A greedy algorithm that finds the shortest path from a source node to all other nodes in a weighted graph with non-negative edge weights.",
      sameAs: "https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm",
    }),
  },
  {
    route: "/algorithm/bfs",
    title: "BFS Visualizer — Breadth-First Search | Graphisual",
    description: "Visualize Breadth-First Search step by step. Build a graph, pick a starting node, and watch BFS explore every reachable node level by level.",
    ogDescription: "Visualize Breadth-First Search step by step. Build a graph and watch BFS explore nodes level by level.",
    canonical: `${BASE}/algorithm/bfs`,
    component: BfsLanding,
    jsonLd: makeJsonLd({
      name: "BFS Visualizer",
      title: "BFS Visualizer — Breadth-First Search | Graphisual",
      description: "Visualize Breadth-First Search step by step. Build a graph, pick a starting node, and watch BFS explore every reachable node level by level.",
      url: `${BASE}/algorithm/bfs`,
      aboutName: "Breadth-first search",
      aboutDescription: "A graph traversal algorithm that explores all neighbors of a node before moving to the next level, visiting nodes in order of distance from the source.",
      sameAs: "https://en.wikipedia.org/wiki/Breadth-first_search",
    }),
  },
  {
    route: "/algorithm/dfs",
    title: "DFS Visualizer — Depth-First Search | Graphisual",
    description: "Visualize Depth-First Search step by step. Build a graph, pick a starting node, and watch DFS dive deep into each branch before backtracking.",
    ogDescription: "Visualize Depth-First Search step by step. Build a graph and watch DFS explore each branch before backtracking.",
    canonical: `${BASE}/algorithm/dfs`,
    component: DfsLanding,
    jsonLd: makeJsonLd({
      name: "DFS Visualizer",
      title: "DFS Visualizer — Depth-First Search | Graphisual",
      description: "Visualize Depth-First Search step by step. Build a graph, pick a starting node, and watch DFS dive deep into each branch before backtracking.",
      url: `${BASE}/algorithm/dfs`,
      aboutName: "Depth-first search",
      aboutDescription: "A graph traversal algorithm that explores as far as possible along each branch before backtracking, using a stack to track the current path.",
      sameAs: "https://en.wikipedia.org/wiki/Depth-first_search",
    }),
  },
  {
    route: "/algorithm/bfs-pathfinding",
    title: "BFS Pathfinding Visualizer | Graphisual",
    description: "Visualize BFS pathfinding to find the shortest path in an unweighted graph. Select source and destination nodes, then watch BFS discover the optimal route.",
    ogDescription: "Visualize BFS pathfinding to find the shortest path in an unweighted graph. Watch BFS discover the optimal route.",
    canonical: `${BASE}/algorithm/bfs-pathfinding`,
    component: BfsPathfindingLanding,
    jsonLd: makeJsonLd({
      name: "BFS Pathfinding Visualizer",
      title: "BFS Pathfinding Visualizer | Graphisual",
      description: "Visualize BFS pathfinding to find the shortest path in an unweighted graph. Select source and destination nodes, then watch BFS discover the optimal route.",
      url: `${BASE}/algorithm/bfs-pathfinding`,
      aboutName: "BFS shortest path",
      aboutDescription: "Using Breadth-First Search to find the shortest path between two nodes in an unweighted graph by exploring nodes in order of distance.",
      sameAs: "https://en.wikipedia.org/wiki/Breadth-first_search#Applications",
    }),
  },
  {
    route: "/algorithm/dfs-pathfinding",
    title: "DFS Pathfinding Visualizer | Graphisual",
    description: "Visualize DFS pathfinding as it searches for a path between two nodes. Select source and destination, then watch DFS navigate through the graph.",
    ogDescription: "Visualize DFS pathfinding as it searches for a path between two nodes by exploring deeply along each branch.",
    canonical: `${BASE}/algorithm/dfs-pathfinding`,
    component: DfsPathfindingLanding,
    jsonLd: makeJsonLd({
      name: "DFS Pathfinding Visualizer",
      title: "DFS Pathfinding Visualizer | Graphisual",
      description: "Visualize DFS pathfinding as it searches for a path between two nodes. Select source and destination, then watch DFS navigate through the graph.",
      url: `${BASE}/algorithm/dfs-pathfinding`,
      aboutName: "DFS pathfinding",
      aboutDescription: "Using Depth-First Search to find a path between two nodes by exploring as far as possible along each branch before backtracking.",
      sameAs: "https://en.wikipedia.org/wiki/Depth-first_search#Applications",
    }),
  },
  {
    route: "/algorithm/prims",
    title: "Prim's Algorithm Visualizer — Minimum Spanning Tree | Graphisual",
    description: "Visualize Prim's algorithm building a minimum spanning tree step by step. Draw a weighted graph and watch the MST grow by greedily adding the cheapest edges.",
    ogDescription: "Visualize Prim's algorithm building a minimum spanning tree. Watch the MST grow by greedily adding the cheapest edges.",
    canonical: `${BASE}/algorithm/prims`,
    component: PrimsLanding,
    jsonLd: makeJsonLd({
      name: "Prim's Algorithm Visualizer",
      title: "Prim's Algorithm Visualizer — Minimum Spanning Tree | Graphisual",
      description: "Visualize Prim's algorithm building a minimum spanning tree step by step. Draw a weighted graph and watch the MST grow by greedily adding the cheapest edges.",
      url: `${BASE}/algorithm/prims`,
      aboutName: "Prim's algorithm",
      aboutDescription: "A greedy algorithm that finds a minimum spanning tree for a weighted undirected graph by repeatedly adding the cheapest edge connecting the tree to a non-tree vertex.",
      sameAs: "https://en.wikipedia.org/wiki/Prim%27s_algorithm",
    }),
  },
  {
    route: "/algorithm/cycle-detection",
    title: "Cycle Detection Visualizer | Graphisual",
    description: "Visualize cycle detection in graphs step by step. Build a graph and watch the algorithm identify circular paths using DFS-based back edge detection.",
    ogDescription: "Visualize cycle detection in graphs step by step. Watch the algorithm identify circular paths using DFS.",
    canonical: `${BASE}/algorithm/cycle-detection`,
    component: CycleDetectionLanding,
    jsonLd: makeJsonLd({
      name: "Cycle Detection Visualizer",
      title: "Cycle Detection Visualizer | Graphisual",
      description: "Visualize cycle detection in graphs step by step. Build a graph and watch the algorithm identify circular paths using DFS-based back edge detection.",
      url: `${BASE}/algorithm/cycle-detection`,
      aboutName: "Cycle detection",
      aboutDescription: "Algorithms for detecting cycles in graphs, commonly using DFS with node coloring to identify back edges that indicate circular paths.",
      sameAs: "https://en.wikipedia.org/wiki/Cycle_(graph_theory)#Cycle_detection",
    }),
  },
  {
    route: "/algorithm/bellman-ford",
    title: "Bellman-Ford Algorithm Visualizer | Graphisual",
    description: "Visualize the Bellman-Ford algorithm finding shortest paths with negative edge weights. Build a weighted graph and watch it relax edges iteratively.",
    ogDescription: "Visualize the Bellman-Ford algorithm finding shortest paths with negative weights. Watch it relax edges iteratively.",
    canonical: `${BASE}/algorithm/bellman-ford`,
    component: BellmanFordLanding,
    jsonLd: makeJsonLd({
      name: "Bellman-Ford Algorithm Visualizer",
      title: "Bellman-Ford Algorithm Visualizer | Graphisual",
      description: "Visualize the Bellman-Ford algorithm finding shortest paths with negative edge weights. Build a weighted graph and watch it relax edges iteratively.",
      url: `${BASE}/algorithm/bellman-ford`,
      aboutName: "Bellman-Ford algorithm",
      aboutDescription: "An algorithm that finds shortest paths from a single source to all other vertices, handling negative edge weights and detecting negative-weight cycles.",
      sameAs: "https://en.wikipedia.org/wiki/Bellman%E2%80%93Ford_algorithm",
    }),
  },
];

const outDir = "build";
const templatePath = path.resolve(outDir, "index.html");

if (!fs.existsSync(templatePath)) {
  console.error("[prerender] build/index.html not found. Run vite build first.");
  process.exit(1);
}

const template = fs.readFileSync(templatePath, "utf-8");

for (const page of pages) {
  // Render the React component to static HTML
  const content = renderToString(createElement(page.component));

  let html = template;

  // Inject rendered content into root div
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root">${content}</div>`
  );

  // Update title
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${page.title}</title>`);

  // Helper to replace multi-line meta tag content
  const replaceMeta = (attr: string, value: string, newValue: string) => {
    const pattern = new RegExp(
      `(<meta[^>]*?${attr}="${value}"[^>]*?content=")[^"]*"`
    );
    html = html.replace(pattern, `$1${newValue}"`);
  };

  replaceMeta("name", "description", page.description);
  replaceMeta("name", "twitter:title", page.title);
  replaceMeta("name", "twitter:description", page.ogDescription);
  replaceMeta("property", "og:title", page.title);
  replaceMeta("property", "og:description", page.ogDescription);
  replaceMeta("property", "og:url", page.canonical);

  // Canonical URL
  html = html.replace(
    /(<link rel="canonical" href=")[^"]*"/,
    `$1${page.canonical}"`
  );

  // Replace JSON-LD with page-specific structured data
  html = html.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">\n${JSON.stringify(page.jsonLd, null, 6)}\n    </script>`
  );

  // Strip JS — landing pages are pure static HTML, no React needed
  html = html.replace(/<script type="module" crossorigin src="[^"]*"><\/script>\n?/g, "");
  html = html.replace(/<link rel="modulepreload" crossorigin href="[^"]*">\n?/g, "");
  html = html.replace(/<script id="vite-plugin-pwa:register-sw" src="[^"]*"><\/script>\n?/g, "");
  html = html.replace(/<link rel="manifest" href="[^"]*">\n?/, "");
  html = html.replace(/<noscript>[^<]*<\/noscript>\n?/, "");

  const routePath = page.route.replace(/^\//, "");
  const htmlPath = path.resolve(outDir, `${routePath}.html`);
  fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
  fs.writeFileSync(htmlPath, html, "utf-8");
  console.log(`[prerender] Generated ${page.route}`);
}
