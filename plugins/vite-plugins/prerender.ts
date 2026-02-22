import type { Plugin, ResolvedConfig } from "vite";
import { build as viteBuild } from "vite";
import Beasties from "beasties";
import { z } from "zod";
import fs from "fs";
import path from "path";

const pageMetaSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  ogDescription: z.string().min(1),
  canonical: z.string().url(),
  ogImage: z.string().url(),
  jsonLd: z.record(z.string(), z.unknown()),
});

type PageMeta = z.infer<typeof pageMetaSchema>;

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

/**
 * Validate a module's exports and render its default component to HTML.
 * Returns null if the module doesn't have valid meta or a default export.
 */
async function renderPage(
  mod: Record<string, unknown>,
  label: string,
): Promise<{ meta: PageMeta; content: string } | null> {
  if (!mod.meta) return null;

  const result = pageMetaSchema.safeParse(mod.meta);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    console.error(`[prerender] ${label} has invalid meta:\n${issues}`);
    return null;
  }

  if (!mod.default) {
    console.warn(`[prerender] ${label} has meta but no default export, skipping.`);
    return null;
  }

  const { renderToString } = await import("react-dom/server");
  const { createElement } = await import("react");

  return {
    meta: result.data,
    // mod.default is a React component — safe to cast for createElement
    content: renderToString(createElement(mod.default as () => React.JSX.Element)),
  };
}

/** Discover all .tsx page files under src/pages/ */
function discoverPages(): Map<string, string> {
  const pagesDir = path.resolve("src/pages");
  const pageFiles = fs
    .readdirSync(pagesDir, { recursive: true })
    .map((f) => (typeof f === "string" ? f : f.toString()))
    .filter((f) => f.endsWith(".tsx"));

  const routes = new Map<string, string>();
  for (const file of pageFiles) {
    const key = file.replace(/\.tsx$/, "");
    routes.set(key, path.resolve(pagesDir, file));
  }
  return routes;
}

export function prerenderPlugin(options: PrerenderOptions = {}): Plugin {
  const parsedOptions = prerenderOptionsSchema.parse(options);
  let config: ResolvedConfig;

  return {
    name: "vite-prerender",
    configResolved(resolved) {
      config = resolved;
    },
    configureServer(server) {
      const pages = discoverPages();
      const routeToFile = new Map<string, string>();
      pages.forEach((filePath, key) => {
        routeToFile.set(`/${key}`, filePath);
      });

      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0];
        if (!url || !routeToFile.has(url)) return next();

        try {
          const mod = await server.ssrLoadModule(routeToFile.get(url)!);
          const page = await renderPage(mod, url);
          if (!page) return next();

          const html = buildHtml({
            meta: page.meta,
            content: page.content,
            cssHrefs: [],
            options: parsedOptions,
            devHead: `<script type="module" src="/@vite/client"></script>
    <link rel="stylesheet" href="/src/globals.css" />`,
          });

          console.log(`[prerender] Served ${url}`);
          res.setHeader("Content-Type", "text/html");
          res.end(html);
        } catch (err) {
          console.error(`[prerender] Dev render failed for ${url}:`, err);
          next();
        }
      });
    },
    async writeBundle(_outputOptions, bundle) {
      const outDir = config.build.outDir;

      const cssHrefs = Object.keys(bundle)
        .filter((fileName) => fileName.endsWith(".css"))
        .map((fileName) => `/${fileName}`);

      const pages = discoverPages();
      if (pages.size === 0) return;

      const input = Object.fromEntries(pages);

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

      // Inline critical CSS but keep stylesheet links for full utility coverage.
      const beasties = new Beasties({ path: outDir, inlineFonts: true });

      let count = 0;

      for (const key of Object.keys(input)) {
        const bundlePath = path.resolve(ssrOutDir, `${key}.js`);
        if (!fs.existsSync(bundlePath)) continue;

        try {
          const mod = await import(`file://${bundlePath}`);
          const page = await renderPage(mod, `${key}.tsx`);
          if (!page) continue;

          const html = buildHtml({
            meta: page.meta,
            content: page.content,
            cssHrefs,
            options: parsedOptions,
          });

          const optimizedHtml = await beasties.process(html);

          const htmlPath = path.resolve(outDir, `${key}.html`);
          fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
          fs.writeFileSync(htmlPath, optimizedHtml, "utf-8");
          count++;
          console.log(`[prerender] Generated /${key}`);
        } catch (err) {
          console.error(`[prerender] Failed to render ${key}:`, err);
        }
      }

      fs.rmSync(ssrOutDir, { recursive: true, force: true });

      if (count > 0) {
        console.log(`[prerender] Done — ${count} pages generated.`);
      }
    },
  };
}

function buildHtml(opts: {
  meta: PageMeta;
  content: string;
  cssHrefs: string[];
  options: PrerenderOptions;
  devHead?: string;
}): string {
  const { meta, content, cssHrefs, options, devHead } = opts;

  const analyticsHtml = options.analytics
    ? `<script>
      window.dataLayer = window.dataLayer || [];
      function gtag() { dataLayer.push(arguments); }
      gtag("js", new Date());
      gtag("config", "${options.analytics.gaTrackingId}");

      function loadGtag() {
        var s = document.createElement("script");
        s.src = "https://www.googletagmanager.com/gtag/js?id=${options.analytics.gaTrackingId}";
        document.body.appendChild(s);
      }
      if (typeof requestIdleCallback === "function") {
        requestIdleCallback(loadGtag);
      } else {
        setTimeout(loadGtag, 3000);
      }
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
    ${devHead ?? ""}
  </head>
  <body>
    ${content}
  </body>
</html>`;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
