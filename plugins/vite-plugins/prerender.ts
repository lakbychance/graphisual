import type { Plugin, ResolvedConfig } from "vite";
import { build as viteBuild } from "vite";
import { z } from "zod";
import fs from "fs";
import path from "path";

const pageMetaSchema = z.object({
  route: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  ogDescription: z.string().min(1),
  canonical: z.string().url(),
  ogImage: z.string().url(),
  jsonLd: z.record(z.string(), z.unknown()),
});

const prerenderOptionsSchema = z.object({
  analytics: z.object({ gaTrackingId: z.string() }).optional(),
  fonts: z
    .array(z.object({ href: z.string(), type: z.string() }))
    .optional(),
  favicons: z
    .array(
      z.object({
        rel: z.string(),
        href: z.string(),
        type: z.string().optional(),
      })
    )
    .optional(),
  themeColor: z.string().optional(),
  author: z.string().optional(),
  siteName: z.string().optional(),
  twitterHandle: z.string().optional(),
});

type PrerenderOptions = z.infer<typeof prerenderOptionsSchema>;

export function prerenderPlugin(options: PrerenderOptions = {}): Plugin {
  const parsedOptions = prerenderOptionsSchema.parse(options);
  let config: ResolvedConfig;

  return {
    name: "vite-prerender",
    configResolved(resolved) {
      config = resolved;
    },
    async writeBundle(_outputOptions, bundle) {
      const outDir = config.build.outDir;

      // Extract CSS asset paths directly from the bundle metadata
      const cssHrefs = Object.keys(bundle)
        .filter((fileName) => fileName.endsWith(".css"))
        .map((fileName) => `/${fileName}`);

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

          // Validate meta with Zod
          const result = pageMetaSchema.safeParse(mod.meta);
          if (!result.success) {
            const issues = result.error.issues
              .map((i) => `  ${i.path.join(".")}: ${i.message}`)
              .join("\n");
            console.error(
              `[prerender] ${key}.tsx has invalid meta:\n${issues}`
            );
            continue;
          }

          const meta = result.data;
          const Component = mod.default;

          if (!Component) {
            console.warn(
              `[prerender] ${key}.tsx has meta but no default export, skipping.`
            );
            continue;
          }

          const content = renderToString(createElement(Component));

          const html = buildHtml({
            meta,
            content,
            cssHrefs,
            options: parsedOptions,
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
  meta: z.infer<typeof pageMetaSchema>;
  content: string;
  cssHrefs: string[];
  options: PrerenderOptions;
}): string {
  const { meta, content, cssHrefs, options } = opts;

  const analyticsHtml = options.analytics
    ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${options.analytics.gaTrackingId}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag() {
        dataLayer.push(arguments);
      }
      gtag("js", new Date());

      gtag("config", "${options.analytics.gaTrackingId}");
    </script>`
    : "";

  const faviconHtml = (options.favicons ?? [])
    .map((f) => {
      const type = f.type ? ` type="${f.type}"` : "";
      return `<link rel="${f.rel}" href="${f.href}"${type} />`;
    })
    .join("\n    ");

  const fontHtml = (options.fonts ?? [])
    .map(
      (f) =>
        `<link rel="preload" href="${f.href}" as="font" type="${f.type}" crossorigin />`
    )
    .join("\n    ");

  const themeColorHtml = options.themeColor
    ? `<meta name="theme-color" content="${options.themeColor}" />`
    : "";

  const authorHtml = options.author
    ? `<meta name="author" content="${escapeAttr(options.author)}" />`
    : "";

  const siteNameHtml = options.siteName
    ? `<meta property="og:site_name" content="${escapeAttr(options.siteName)}" />`
    : "";

  const twitterSiteHtml = options.twitterHandle
    ? `<meta name="twitter:site" content="${escapeAttr(options.twitterHandle)}" />
    <meta name="twitter:creator" content="${escapeAttr(options.twitterHandle)}" />`
    : "";

  const cssHtml = cssHrefs
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

    <title>${meta.title}</title>
    <meta name="description" content="${escapeAttr(meta.description)}" />
    ${authorHtml}

    <link rel="canonical" href="${meta.canonical}" />

    <meta property="og:type" content="website" />
    <meta property="og:url" content="${meta.canonical}" />
    <meta property="og:title" content="${escapeAttr(meta.title)}" />
    <meta property="og:description" content="${escapeAttr(meta.ogDescription)}" />
    <meta property="og:image" content="${meta.ogImage}" />
    ${siteNameHtml}
    <meta property="og:locale" content="en_US" />

    <meta name="twitter:card" content="summary_large_image" />
    ${twitterSiteHtml}
    <meta name="twitter:title" content="${escapeAttr(meta.title)}" />
    <meta name="twitter:description" content="${escapeAttr(meta.ogDescription)}" />
    <meta name="twitter:image" content="${meta.ogImage}" />

    ${fontHtml}

    <script type="application/ld+json">
${JSON.stringify(meta.jsonLd, null, 6)}
    </script>

    ${cssHtml}
  </head>
  <body>
    ${content}
  </body>
</html>`;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
