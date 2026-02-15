import fs from "fs";
import path from "path";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { DijkstraLanding } from "../src/pages/DijkstraLanding";

interface PageConfig {
  route: string;
  title: string;
  description: string;
  ogDescription: string;
  canonical: string;
  component: React.ComponentType;
  jsonLd: Record<string, unknown>;
}

const pages: PageConfig[] = [
  {
    route: "/algorithm/dijkstra",
    title: "Dijkstra's Algorithm Visualizer | Graphisual",
    description:
      "Visualize Dijkstra's shortest path algorithm step by step. Draw weighted graphs, set source and destination nodes, and watch the algorithm find the optimal path interactively.",
    ogDescription:
      "Visualize Dijkstra's shortest path algorithm step by step. Draw weighted graphs and watch the algorithm find the optimal path.",
    canonical: "https://graphisual.app/algorithm/dijkstra",
    component: DijkstraLanding,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Article",
      "name": "Dijkstra's Algorithm Visualizer",
      "headline": "Dijkstra's Algorithm Visualizer | Graphisual",
      "description":
        "Visualize Dijkstra's shortest path algorithm step by step. Draw weighted graphs, set source and destination nodes, and watch the algorithm find the optimal path interactively.",
      "url": "https://graphisual.app/algorithm/dijkstra",
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
        "name": "Dijkstra's algorithm",
        "description":
          "A greedy algorithm that finds the shortest path from a source node to all other nodes in a weighted graph with non-negative edge weights.",
        "sameAs": "https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm",
      },
    },
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
