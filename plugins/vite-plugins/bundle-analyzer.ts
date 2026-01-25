import type { Plugin } from "vite";
import { visualizer } from "rollup-plugin-visualizer";

interface BundleAnalyzerOptions {
  filename?: string;
  template?: "treemap" | "sunburst" | "network";
}

/**
 * Bundle analyzer plugin that generates a visual report of bundle composition.
 * Only runs when ANALYZE=true environment variable is set.
 *
 * Usage: ANALYZE=true pnpm build
 */
export function bundleAnalyzerPlugin(options?: BundleAnalyzerOptions): Plugin | null {
  const isAnalyze = process.env.ANALYZE === "true";

  if (!isAnalyze) {
    return null;
  }

  return visualizer({
    filename: options?.filename ?? "build/stats.html",
    open: true,
    gzipSize: true,
    brotliSize: true,
    template: options?.template ?? "treemap",
  }) as Plugin;
}
