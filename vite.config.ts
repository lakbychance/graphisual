import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Remove react-scan in production
    {
      name: "remove-react-scan",
      transformIndexHtml(html, ctx) {
        if (ctx.bundle) {
          // Production build
          return html.replace(
            /<script[^>]*src="[^"]*react-scan[^"]*"[^>]*\/?>\s*(<\/script>)?/gi,
            ""
          );
        }
        return html;
      },
    },
  ],
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
            "@radix-ui/react-popover",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-slider",
            "@radix-ui/react-tabs",
          ],
          "vendor-motion": ["motion"],
        },
      },
    },
  },
});
