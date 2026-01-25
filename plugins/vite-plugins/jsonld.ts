import type { Plugin } from "vite";
import fs from "fs";

/**
 * Injects dynamic values into JSON-LD structured data
 * - Replaces __APP_VERSION__ with version from package.json
 */
export function jsonldPlugin(): Plugin {
  const pkg = JSON.parse(fs.readFileSync("./package.json", "utf-8"));

  return {
    name: "vite-jsonld",
    transformIndexHtml(html) {
      return html.replace(/__APP_VERSION__/g, pkg.version);
    },
  };
}
