/**
 * Client entry for the prerendered pages under `src/pages`. The HTML arrives
 * fully rendered; this loads the page's module and hydrates it so the page
 * becomes live. The prerender plugin puts the page's key on `#page`.
 */
import { createElement, type ComponentType } from "react";
import { hydrateRoot } from "react-dom/client";
import "./landing.css";

const pages = import.meta.glob<{ default: ComponentType }>("../pages/**/*.tsx");

const root = document.getElementById("page");
const load = root?.dataset.page ? pages[`../pages/${root.dataset.page}.tsx`] : undefined;

if (root && load) {
  load().then((mod) => hydrateRoot(root, createElement(mod.default)));
}
