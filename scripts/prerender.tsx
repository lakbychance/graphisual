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
  faq: { question: string; answer: string }[];
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
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
        "datePublished": "2026-02-15",
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
      },
      {
        "@type": "FAQPage",
        "mainEntity": opts.faq.map((item) => ({
          "@type": "Question",
          "name": item.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": item.answer,
          },
        })),
      },
    ],
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
      faq: [
        { question: "What is Dijkstra's algorithm?", answer: "Dijkstra's algorithm is a greedy graph algorithm that finds the shortest path from a single source node to all other nodes in a weighted graph with non-negative edge weights. It works by repeatedly selecting the unvisited node with the smallest known distance and updating its neighbors." },
        { question: "What is the time complexity of Dijkstra's algorithm?", answer: "With a binary heap priority queue, Dijkstra's algorithm runs in O((V + E) log V) time, where V is the number of vertices and E is the number of edges. Using a Fibonacci heap improves this to O(E + V log V)." },
        { question: "Can Dijkstra's algorithm handle negative edge weights?", answer: "No. Dijkstra's algorithm requires all edge weights to be non-negative. For graphs with negative weights, use the Bellman-Ford algorithm instead, which can also detect negative-weight cycles." },
        { question: "What is the difference between Dijkstra's and BFS?", answer: "BFS finds the shortest path in unweighted graphs by exploring level by level. Dijkstra's generalizes this to weighted graphs by using a priority queue to always process the closest unvisited node, accounting for varying edge costs." },
      ],
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
      faq: [
        { question: "What is Breadth-First Search?", answer: "Breadth-First Search (BFS) is a graph traversal algorithm that explores all neighbors of a node before moving to the next level. It uses a FIFO queue to visit nodes in order of their distance from the source, guaranteeing level-by-level exploration." },
        { question: "What is the time complexity of BFS?", answer: "BFS runs in O(V + E) time, where V is the number of vertices and E is the number of edges. Each vertex and edge is processed exactly once." },
        { question: "What is the difference between BFS and DFS?", answer: "BFS explores all neighbors at the current depth before going deeper (level by level), while DFS dives as deep as possible along each branch before backtracking. BFS uses a queue; DFS uses a stack." },
        { question: "Does BFS find the shortest path?", answer: "Yes, in unweighted graphs. Since BFS visits nodes in order of distance from the source, the first time it reaches any node is via the shortest path. For weighted graphs, use Dijkstra's algorithm instead." },
      ],
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
      faq: [
        { question: "What is Depth-First Search?", answer: "Depth-First Search (DFS) is a graph traversal algorithm that explores as far as possible along each branch before backtracking. It uses a stack (or recursion) to track the current path and visits every reachable node exactly once." },
        { question: "What is the time complexity of DFS?", answer: "DFS runs in O(V + E) time, where V is the number of vertices and E is the number of edges. It visits each vertex and edge exactly once." },
        { question: "Is DFS or BFS better?", answer: "Neither is universally better — it depends on the problem. DFS uses less memory and is better for deep graphs, topological sorting, and cycle detection. BFS is better for finding shortest paths in unweighted graphs and level-order exploration." },
        { question: "Does DFS find the shortest path?", answer: "No. DFS finds a path but not necessarily the shortest one. It explores deeply along each branch, so it may find a longer path before a shorter one. Use BFS for shortest paths in unweighted graphs." },
      ],
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
      faq: [
        { question: "How does BFS find the shortest path?", answer: "BFS explores nodes in order of their distance from the source. Since it visits all nodes at distance d before any node at distance d+1, the first time it reaches the destination is guaranteed to be via the shortest path." },
        { question: "Does BFS pathfinding work on weighted graphs?", answer: "No. BFS finds the shortest path only in unweighted graphs where each edge has equal cost. For weighted graphs, use Dijkstra's algorithm, which accounts for varying edge weights using a priority queue." },
        { question: "How is the path reconstructed in BFS?", answer: "During traversal, BFS records the parent of each discovered node. Once the destination is reached, the path is reconstructed by following parent pointers backward from destination to source." },
        { question: "What is the difference between BFS traversal and BFS pathfinding?", answer: "BFS traversal visits all reachable nodes from a source. BFS pathfinding has a specific destination and stops as soon as it's found, then reconstructs the shortest path using parent pointers." },
      ],
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
      faq: [
        { question: "Does DFS find the shortest path?", answer: "No. DFS finds a path between two nodes but not necessarily the shortest one. It explores deeply along each branch, so it may discover a longer path first. For the shortest path in unweighted graphs, use BFS instead." },
        { question: "When should I use DFS pathfinding over BFS?", answer: "Use DFS pathfinding when you only need to know if a path exists (not the shortest), when memory is limited (DFS uses less memory than BFS), or when the graph is deep and narrow where DFS can find a path faster." },
        { question: "How does DFS pathfinding work?", answer: "DFS pathfinding starts at the source and recursively explores each unvisited neighbor as deeply as possible. If it reaches the destination, it returns the path. If a branch leads to a dead end, it backtracks and tries the next neighbor." },
        { question: "What is the time complexity of DFS pathfinding?", answer: "DFS pathfinding runs in O(V + E) time in the worst case, where V is the number of vertices and E is the number of edges. However, it can terminate early if the destination is found before exploring the entire graph." },
      ],
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
      faq: [
        { question: "What is a minimum spanning tree?", answer: "A minimum spanning tree (MST) is a subset of edges in a connected, weighted, undirected graph that connects all vertices with the minimum possible total edge weight, without forming any cycles." },
        { question: "What is the difference between Prim's and Kruskal's algorithm?", answer: "Both find minimum spanning trees, but they work differently. Prim's grows the MST from a single starting node by adding the cheapest adjacent edge. Kruskal's sorts all edges by weight and adds them one by one, skipping edges that would create a cycle." },
        { question: "Does Prim's algorithm work on directed graphs?", answer: "No. Prim's algorithm is designed for undirected graphs only. For directed graphs, finding a minimum spanning arborescence requires different algorithms like Edmonds' algorithm." },
        { question: "What is the time complexity of Prim's algorithm?", answer: "With a binary heap, Prim's algorithm runs in O((V + E) log V) time. With a Fibonacci heap, this improves to O(E + V log V), which is faster for dense graphs." },
      ],
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
      faq: [
        { question: "What is a cycle in a graph?", answer: "A cycle is a path in a graph that starts and ends at the same node, passing through at least one other node. In a directed graph, the edges must follow the direction; in an undirected graph, any closed path with at least three nodes forms a cycle." },
        { question: "How does DFS detect cycles?", answer: "DFS detects cycles using three-color marking. Nodes start as white (unvisited), turn gray (in progress) when first visited, and black (done) when fully processed. If DFS encounters a gray node, it means there's a back edge forming a cycle." },
        { question: "What is the difference between cycle detection in directed and undirected graphs?", answer: "In directed graphs, a cycle exists only when a back edge points to an ancestor in the DFS tree (a gray node). In undirected graphs, any edge to a visited node that isn't the direct parent indicates a cycle." },
        { question: "What is the time complexity of cycle detection?", answer: "DFS-based cycle detection runs in O(V + E) time, where V is the number of vertices and E is the number of edges. It visits each vertex and edge at most once." },
      ],
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
      faq: [
        { question: "What is the Bellman-Ford algorithm?", answer: "The Bellman-Ford algorithm finds the shortest paths from a single source to all other vertices in a weighted graph. Unlike Dijkstra's, it correctly handles negative edge weights and can detect negative-weight cycles." },
        { question: "Why does Bellman-Ford run V-1 iterations?", answer: "In a graph with V vertices, the shortest path between any two nodes can have at most V-1 edges. Each iteration guarantees at least one more edge of each shortest path is finalized, so V-1 iterations are sufficient to find all shortest paths." },
        { question: "What is a negative-weight cycle?", answer: "A negative-weight cycle is a cycle in a graph where the sum of edge weights is negative. If such a cycle is reachable from the source, shortest paths are undefined because you can keep traversing the cycle to reduce the distance infinitely." },
        { question: "When should I use Bellman-Ford over Dijkstra's?", answer: "Use Bellman-Ford when the graph has negative edge weights, which Dijkstra's cannot handle. If all weights are non-negative, Dijkstra's is faster with O((V + E) log V) time compared to Bellman-Ford's O(V × E)." },
      ],
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
