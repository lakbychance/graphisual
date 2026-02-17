import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { reactScanPlugin, jsonldPlugin, pwaPlugin, bundleAnalyzerPlugin, prerenderPlugin } from "./plugins/vite-plugins";
import { AUTHOR_NAME, SITE_NAME, TWITTER_HANDLE } from "./src/utils/constants";

export default defineConfig({
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
      fonts: [{ href: "/fonts/outfit-latin.woff2", type: "font/woff2" }],
      favicons: [
        { rel: "icon", href: "/favicon.png", type: "image/png" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      ],
      themeColor: "#0a0a0f",
      author: AUTHOR_NAME,
      siteName: SITE_NAME,
      twitterHandle: TWITTER_HANDLE,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: "build",
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-ui": [
            "@radix-ui/react-checkbox",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-slider",
            "@radix-ui/react-tabs",
            "@radix-ui/react-toggle-group",
            "@radix-ui/react-tooltip",
          ],
          "vendor-motion": ["motion"],
        },
      },
    },
  },
});
