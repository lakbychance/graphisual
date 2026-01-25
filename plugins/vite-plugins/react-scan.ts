import type { Plugin, HtmlTagDescriptor } from "vite";

/**
 * Injects react-scan script only in development mode
 */
export function reactScanPlugin(): Plugin {
  return {
    name: "vite-react-scan",
    apply: "serve",
    transformIndexHtml: {
      order: "pre",
      handler() {
        const tags: HtmlTagDescriptor[] = [
          {
            tag: "script",
            attrs: {
              src: "https://unpkg.com/react-scan/dist/auto.global.js",
              crossorigin: "anonymous",
            },
            injectTo: "head-prepend",
          },
        ];

        return tags;
      },
    },
  };
}
