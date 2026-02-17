import type { Plugin, ResolvedConfig } from "vite";
import { build as viteBuild } from "vite";
import fs from "fs";
import path from "path";

interface PrerenderOptions {
  /**
   * Google Analytics tracking ID.
   * Generates the gtag.js loader + config snippet.
   */
  analytics?: { gaTrackingId: string };

  /**
   * Font files to preload.
   * Each entry becomes a `<link rel="preload" as="font" ...>` tag.
   */
  fonts?: { href: string; type: string }[];

  /**
   * Favicon links.
   * Each entry becomes a `<link rel="..." href="...">` tag.
   */
  favicons?: { rel: string; href: string; type?: string }[];

  /** Value for `<meta name="theme-color">`. */
  themeColor?: string;
}

export function prerenderPlugin(options: PrerenderOptions = {}): Plugin {
  let config: ResolvedConfig;

  return {
    name: "vite-prerender",
    configResolved(resolved) {
      config = resolved;
    },
    async closeBundle() {
      const outDir = config.build.outDir;

      // Discover hashed CSS assets from the build output
      const assetsDir = path.resolve(outDir, "assets");
      const cssHrefs = fs.existsSync(assetsDir)
        ? fs
            .readdirSync(assetsDir)
            .filter((f) => f.endsWith(".css"))
            .map((f) => `/assets/${f}`)
        : [];

      // Find page files
      const pagesDir = path.resolve("src/pages");
      const pageFiles = fs
        .readdirSync(pagesDir, { recursive: true })
        .map((f) => (typeof f === "string" ? f : f.toString()))
        .filter((f) => f.endsWith(".tsx"));

      if (pageFiles.length === 0) return;

      // Build entry map: { "algorithm/dijkstra": "/abs/src/pages/algorithm/dijkstra.tsx" }
      const input: Record<string, string> = {};
      for (const file of pageFiles) {
        const key = file.replace(/\.tsx$/, "");
        input[key] = path.resolve(pagesDir, file);
      }

      // Single SSR build pass — inherits project aliases and plugins
      const ssrOutDir = path.resolve(outDir, "_prerender_ssr");
      await viteBuild({
        configFile: false,
        resolve: { alias: config.resolve.alias },
        build: {
          ssr: true,
          outDir: ssrOutDir,
          rollupOptions: { input },
          emptyOutDir: true,
        },
        logLevel: "silent",
      });

      const { renderToString } = await import("react-dom/server");
      const { createElement } = await import("react");

      let count = 0;

      for (const key of Object.keys(input)) {
        const bundlePath = path.resolve(ssrOutDir, `${key}.js`);
        if (!fs.existsSync(bundlePath)) continue;

        try {
          const mod = await import(`file://${bundlePath}`);

          // Skip files without meta export
          if (!mod.meta) continue;

          const { meta } = mod;
          const Component = mod.default;

          if (!Component) {
            console.warn(
              `[prerender] ${key}.tsx has meta but no default export, skipping.`
            );
            continue;
          }

          const content = renderToString(createElement(Component));

          const html = buildHtml({
            title: meta.title,
            description: meta.description,
            ogDescription: meta.ogDescription,
            canonical: meta.canonical,
            ogImage: meta.ogImage,
            jsonLd: meta.jsonLd,
            content,
            cssHrefs,
            analytics: options.analytics,
            favicons: options.favicons,
            fonts: options.fonts,
            themeColor: options.themeColor,
          });

          const htmlPath = path.resolve(outDir, `${meta.route}.html`);
          fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
          fs.writeFileSync(htmlPath, html, "utf-8");
          count++;
          console.log(`[prerender] Generated /${meta.route}`);
        } catch (err) {
          console.error(`[prerender] Failed to render ${key}:`, err);
        }
      }

      // Clean up SSR bundle directory
      fs.rmSync(ssrOutDir, { recursive: true, force: true });

      if (count > 0) {
        console.log(`[prerender] Done — ${count} pages generated.`);
      }
    },
  };
}

function buildHtml(opts: {
  title: string;
  description: string;
  ogDescription: string;
  canonical: string;
  ogImage: string;
  jsonLd: Record<string, unknown>;
  content: string;
  cssHrefs: string[];
  analytics?: { gaTrackingId: string };
  favicons?: { rel: string; href: string; type?: string }[];
  fonts?: { href: string; type: string }[];
  themeColor?: string;
}): string {
  const analyticsHtml = opts.analytics
    ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${opts.analytics.gaTrackingId}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag() {
        dataLayer.push(arguments);
      }
      gtag("js", new Date());

      gtag("config", "${opts.analytics.gaTrackingId}");
    </script>`
    : "";

  const faviconHtml = (opts.favicons ?? [])
    .map((f) => {
      const type = f.type ? ` type="${f.type}"` : "";
      return `<link rel="${f.rel}" href="${f.href}"${type} />`;
    })
    .join("\n    ");

  const fontHtml = (opts.fonts ?? [])
    .map(
      (f) =>
        `<link rel="preload" href="${f.href}" as="font" type="${f.type}" crossorigin />`
    )
    .join("\n    ");

  const themeColorHtml = opts.themeColor
    ? `<meta name="theme-color" content="${opts.themeColor}" />`
    : "";

  const cssHtml = opts.cssHrefs
    .map((href) => `<link rel="stylesheet" crossorigin href="${href}" />`)
    .join("\n    ");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    ${analyticsHtml}
    <meta charset="UTF-8" />
    ${faviconHtml}
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${themeColorHtml}

    <title>${opts.title}</title>
    <meta name="description" content="${escapeAttr(opts.description)}" />
    <meta name="author" content="Lakshya Thakur" />

    <link rel="canonical" href="${opts.canonical}" />

    <meta property="og:type" content="website" />
    <meta property="og:url" content="${opts.canonical}" />
    <meta property="og:title" content="${escapeAttr(opts.title)}" />
    <meta property="og:description" content="${escapeAttr(opts.ogDescription)}" />
    <meta property="og:image" content="${opts.ogImage}" />
    <meta property="og:site_name" content="Graphisual" />
    <meta property="og:locale" content="en_US" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@lakbychance" />
    <meta name="twitter:creator" content="@lakbychance" />
    <meta name="twitter:title" content="${escapeAttr(opts.title)}" />
    <meta name="twitter:description" content="${escapeAttr(opts.ogDescription)}" />
    <meta name="twitter:image" content="${opts.ogImage}" />

    ${fontHtml}

    <script type="application/ld+json">
${JSON.stringify(opts.jsonLd, null, 6)}
    </script>

    ${cssHtml}
  </head>
  <body>
    ${opts.content}
  </body>
</html>`;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
