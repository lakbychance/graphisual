import type { Plugin } from "vite";
import fs from "fs";
import path from "path";

interface SitemapOptions {
  hostname: string;
  routes?: Array<{
    path: string;
    changefreq?: string;
    priority?: number;
  }>;
}

/**
 * Generates sitemap.xml with dynamic lastmod date at build time
 */
export function sitemapPlugin(options: SitemapOptions): Plugin {
  const { hostname, routes = [{ path: "/", changefreq: "weekly", priority: 1.0 }] } = options;

  return {
    name: "vite-sitemap",
    apply: "build",
    closeBundle() {
      const today = new Date().toISOString().split("T")[0];

      const urls = routes
        .map(
          (route) => `  <url>
    <loc>${hostname}${route.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq || "weekly"}</changefreq>
    <priority>${route.priority || 0.5}</priority>
  </url>`
        )
        .join("\n");

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

      const outDir = "build";
      fs.writeFileSync(path.resolve(outDir, "sitemap.xml"), sitemap);
      console.log("✓ Generated sitemap.xml with lastmod:", today);
    },
  };
}
