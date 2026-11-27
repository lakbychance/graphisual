/**
 * Keeps the lit part of a notebook page in view (the code's lit line, the state's changed row, the
 * storage views' lit row or entry), scrolling only the page that holds it, never the screen behind.
 */

/** The scrolling page around `el`: a notebook page, or a storage view's own scroller. */
const pageOf = (el: Element | null | undefined) => el?.closest(".sv-scroll, .nb-page") ?? null;

/** Room kept between the shown part and the page's edges, so a lit row's background shows whole. */
const MARGIN = 3;

/** How far to scroll so the span start..end shows whole between low and high, with a margin (the start first when it can't). */
function by(start: number, end: number, low: number, high: number) {
  [low, high] = [low + MARGIN, high - MARGIN];
  const d = start < low ? start - low : end > high ? Math.min(end - high, start - low) : 0;
  return Math.abs(d) < 1 ? 0 : d;
}

/**
 * Scrolls the page holding `target` just enough to show it whole, below a pinned header and, for a
 * table cell, beside a pinned first column.
 */
export function keepInView(target: Element | null | undefined) {
  const page = pageOf(target);
  if (!target || !page) return;
  const r = target.getBoundingClientRect();
  const p = page.getBoundingClientRect();
  const top = p.top + (page.querySelector("thead")?.getBoundingClientRect().height ?? 0);
  const down = page.scrollHeight > page.clientHeight ? by(r.top, r.bottom, top, p.top + page.clientHeight) : 0;
  const left = p.left + (page.querySelector("tbody th")?.getBoundingClientRect().width ?? 0);
  const across = target.tagName === "TD" && page.scrollWidth > page.clientWidth ? by(r.left, r.right, left, p.left + page.clientWidth) : 0;
  if (down === 0 && across === 0) return;
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  page.scrollTo({ top: page.scrollTop + down, left: page.scrollLeft + across, behavior: still ? "auto" : "smooth" });
}

/**
 * Keeps `pick()` in view in the page holding `holder` now, and whenever the page changes size (the
 * sentence above it grows or shrinks from step to step). Returns the cleanup.
 */
export function keepShowing(holder: Element | null, pick: () => Element | null | undefined) {
  const page = pageOf(holder);
  if (!page) return;
  const show = () => keepInView(pick());
  show();
  const watch = new ResizeObserver(show);
  watch.observe(page);
  return () => watch.disconnect();
}
