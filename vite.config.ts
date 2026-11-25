import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { reactScanPlugin, jsonldPlugin, pwaPlugin, bundleAnalyzerPlugin, prerenderPlugin } from "./plugins/vite-plugins";
import { AUTHOR_NAME, SITE_NAME, TWITTER_HANDLE } from "./src/utils/constants";

/**
 * The rework lab (`/rework-lab`, `src/lab/`) is a design surface for reviewing the run UI. It exists
 * on the dev server and on Vercel preview deploys only. `__REWORK_LAB__` is a build-time constant:
 * a production build (Vercel production, or a plain local `pnpm build`) compiles it to `false`, so
 * the route and every line of lab code are dropped. Vercel sets `VERCEL_ENV=preview` on preview builds.
 */
const reworkLab = (command: "build" | "serve") => command === "serve" || process.env.VERCEL_ENV === "preview";

/**
 * On builds that include the lab, a copy of the app's page at `rework-lab.html`, so `/rework-lab`
 * loads the app on a static host (Vercel's `cleanUrls`) and the app opens the lab from the path.
 */
function reworkLabPage(): Plugin {
  return {
    name: "rework-lab-page",
    apply: "build",
    // After Vite has written the app's page into the bundle.
    enforce: "post",
    generateBundle(_options, bundle) {
      const page = bundle["index.html"];
      if (page?.type === "asset") this.emitFile({ type: "asset", fileName: "rework-lab.html", source: page.source });
    },
  };
}

export default defineConfig(({ command }) => ({
  define: { __REWORK_LAB__: JSON.stringify(reworkLab(command)) },
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
    tailwindcss(),
    reactScanPlugin(),
    jsonldPlugin(),
    pwaPlugin(),
    bundleAnalyzerPlugin(),
    prerenderPlugin({
      analytics: { gaTrackingId: "G-WG1RN51DBH" },
      fonts: [
        { href: "/fonts/bricolage-grotesque-latin.woff2", type: "font/woff2" },
        { href: "/fonts/outfit-latin.woff2", type: "font/woff2" },
      ],
      // The algorithm pages are hydrated, and load only their own stylesheet.
      client: { entry: "src/landing/client.tsx", styles: ["src/landing/landing.css"] },
      favicons: [
        { rel: "icon", href: "/favicon.png", type: "image/png" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      ],
      themeColor: "#e5e0d8",
      author: AUTHOR_NAME,
      siteName: SITE_NAME,
      twitterHandle: TWITTER_HANDLE,
    }),
    reworkLab(command) && reworkLabPage(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // The 3D view is lazy-loaded, so without this Vite only discovers its
  // dependencies the first time someone opens it and re-bundles mid-session.
  // That can leave the page with two copies of React ("Invalid hook call" in
  // <Canvas>). Bundling them at startup avoids the mid-session re-bundle.
  optimizeDeps: {
    include: ["three", "@react-three/fiber", "@react-three/drei"],
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: "build",
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React gets its own chunk so the algorithm pages, which need nothing else
          // from the vendors below, do not download the UI and motion libraries.
          // Vite's dynamic-import helper goes with it, or Rollup parks it in a larger vendor chunk.
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id) || id.includes("vite/preload-helper")) return "vendor-react";
          if (id.includes("node_modules/@ui-sdk/")) return "vendor-ui";
          if (id.includes("node_modules/motion/") || id.includes("node_modules/framer-motion/")) return "vendor-motion";
        },
      },
    },
  },
}));
