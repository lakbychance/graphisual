import { VitePWA } from "vite-plugin-pwa";

/**
 * PWA configuration for Graphisual
 */
export function pwaPlugin() {
  return VitePWA({
    registerType: "autoUpdate",
    injectRegister: "script-defer",
    includeAssets: ["favicon.png", "apple-touch-icon.png"],
    manifest: {
      name: "Graphisual",
      short_name: "Graphisual",
      description: "Interactive graph editor and algorithm visualizer",
      theme_color: "#0a0a0f",
      background_color: "#0a0a0f",
      display: "standalone",
      icons: [
        {
          src: "/icons/icon-192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/icons/icon-512.png",
          sizes: "512x512",
          type: "image/png",
        },
        {
          src: "/icons/icon-maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    workbox: {
      globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,ttf}"],
      globIgnores: ["**/logo.png", "algorithm/**/*.html"],
      navigateFallbackDenylist: [/^\/algorithm\//, /\/sitemap\.xml$/, /\/robots\.txt$/],
    },
  });
}
