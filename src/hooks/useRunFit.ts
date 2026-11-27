import { useEffect, useRef, useState } from "react";
import type { GraphNode } from "../components/Graph/types";
import { markScale, num, runBounds, VALUE_BADGE, type RunBadges } from "../components/Graph/runMarkShapes";
import { ZOOM } from "../constants/ui";
import { VisualizationState } from "../constants/visualization";
import { selectStepRun, useGraphStore } from "../store/graphStore";
import { keepsValues, type Run } from "../utils/visualization/runView";

/** Room kept between a badge and the screen edge, in pixels. */
const GUTTER = 8;

/** How far a run may zoom out to fit a short, wide window (a phone on its side) beside the notebook. */
const SHORT_WINDOW_MIN_ZOOM = 0.2;

/** A phone on its side: the notebook sits beside the graph and the graph may zoom out further. */
const isShortWindow = ({ width, height }: Size) => height <= 500 && width >= 560;

interface View {
  zoom: number;
  pan: { x: number; y: number };
}

interface Size {
  width: number;
  height: number;
}

/** The badges this run hangs on its nodes, the value badge as wide as the run ever writes it. */
function badgesOf(run: Run): RunBadges {
  let valueWidth = 0;
  if (keepsValues(run.algorithmId)) {
    valueWidth = VALUE_BADGE.width(num(undefined));
    for (const e of run.events) {
      if (e.type === "relax") valueWidth = Math.max(valueWidth, VALUE_BADGE.width(num(e.next), num(e.old)));
      else if ((e.type === "start" || e.type === "enqueue" || e.type === "settle") && e.value !== undefined) {
        valueWidth = Math.max(valueWidth, VALUE_BADGE.width(num(e.value)));
      }
    }
  }
  return { valueWidth };
}

/** How far the floating bars and panels reach in from each edge of the screen, in pixels. */
interface Insets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const NO_INSETS: Insets = { top: 0, bottom: 0, left: 0, right: 0 };

/** Whether the box shows whole on a screen of this size, clear of the bars and `gutter` pixels in from the edges. */
function shows(box: ReturnType<typeof runBounds>, { zoom, pan }: View, { width, height }: Size, insets: Insets, gutter: number) {
  // Screen point (s, t) shows graph point ((s - width / 2) / zoom - pan.x, (t - height / 2) / zoom - pan.y).
  const left = (insets.left + gutter - width / 2) / zoom - pan.x;
  const right = (width / 2 - insets.right - gutter) / zoom - pan.x;
  const top = (insets.top + gutter - height / 2) / zoom - pan.y;
  const bottom = (height / 2 - insets.bottom - gutter) / zoom - pan.y;
  return box.minX >= left && box.maxX <= right && box.minY >= top && box.maxY <= bottom;
}

/** The view a graph opens in (see `setGraph`). */
const isOpeningView = ({ zoom, pan }: View) => zoom === 1 && pan.x === 0 && pan.y === 0;

/**
 * The view that shows every node and its badges whole, clear of the bars, when the current one cuts
 * something off: centred on them and zoomed out no more than it takes, down to `minZoom` (below the
 * app's usual floor in a short window; at that zoom, as well as it can). Null when everything already shows, or when the learner has zoomed or panned away from the
 * view the graph opened in and left nodes off screen (they chose to look at part of the graph).
 */
export function runFit(
  nodes: readonly GraphNode[], badges: RunBadges, size: Size, view: View, insets: Insets = NO_INSETS, minZoom: number = ZOOM.MIN,
  appsOwnView = false,
): View | null {
  if (nodes.length === 0 || shows(runBounds(nodes, badges, markScale(view.zoom)), view, size, insets, GUTTER)) return null;
  const bodies = runBounds(nodes, { valueWidth: 0 }, 1);
  // (`appsOwnView`: the view is one the app set, not the learner, so it fits whatever is off screen.)
  if (!appsOwnView && !isOpeningView(view) && !shows(bodies, view, size, NO_INSETS, 0)) return null;
  return fitFrom(nodes, badges, size, insets, minZoom, view.zoom);
}

/**
 * The view centred on every node and its badges, clear of the bars, at the largest zoom from `top`
 * down to `minZoom` that shows them whole (at `minZoom`, as well as it can, when none does).
 */
function fitFrom(nodes: readonly GraphNode[], badges: RunBadges, size: Size, insets: Insets, minZoom: number, top: number): View {
  const centred = (zoom: number) => {
    const box = runBounds(nodes, badges, markScale(zoom));
    const pan = {
      x: (insets.left - insets.right) / (2 * zoom) - (box.minX + box.maxX) / 2,
      y: (insets.top - insets.bottom) / (2 * zoom) - (box.minY + box.maxY) / 2,
    };
    return { box, view: { zoom, pan } };
  };
  for (let step = 0; top - step / 100 >= minZoom; step++) {
    const { box, view: fit } = centred(Math.round((top - step / 100) * 100) / 100);
    if (shows(box, fit, size, insets, GUTTER)) return fit;
  }
  return centred(Math.min(top, minZoom)).view;
}

/**
 * The bars and panels that float over the graph, marked `data-run-fit-avoid`: the toolbar, the step
 * controls, the notebook, and on wider screens the zoom, history and settings corners. A bar covers the rows along the top or bottom edge it sits nearer; one
 * marked `data-run-fit-avoid="right"` (the notebook's side panel) covers the columns along the right.
 * Each is fixed to the screen and measured where it rests, not where its entrance has it now.
 */
function barInsets(size: Size, only: (bar: HTMLElement) => boolean = () => true): Insets {
  const insets = { ...NO_INSETS };
  for (const bar of document.querySelectorAll<HTMLElement>("[data-run-fit-avoid]")) {
    const top = bar.offsetTop;
    const bottom = top + bar.offsetHeight;
    if (bottom <= top || !only(bar)) continue;
    if (bar.dataset.runFitAvoid === "right") insets.right = Math.max(insets.right, size.width - bar.offsetLeft);
    else if (top + bottom < size.height) insets.top = Math.max(insets.top, bottom);
    else insets.bottom = Math.max(insets.bottom, size.height - top);
  }
  return insets;
}

/** The window's size, kept up to date. */
function useWindowSize(): Size {
  const [size, setSize] = useState<Size>(() => ({ width: window.innerWidth, height: window.innerHeight }));
  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return size;
}

/** Moves the view to `fit`; returns what puts the view back as it was, unless the learner has moved it since. */
function moveTo(fit: View): () => void {
  const store = useGraphStore.getState();
  const before = store.viewport;
  store.setViewportZoom(fit.zoom);
  store.setViewportPan(fit.pan.x, fit.pan.y);
  return () => {
    const { viewport, setViewportZoom, setViewportPan } = useGraphStore.getState();
    if (viewport.zoom !== fit.zoom || viewport.pan.x !== fit.pan.x || viewport.pan.y !== fit.pan.y) return;
    setViewportZoom(before.zoom);
    setViewportPan(before.pan.x, before.pan.y);
  };
}

/**
 * The view that fits the whole graph on the free canvas, as large as it shows whole, up to 100%. A
 * small corner bar (the settings key) need not take its whole row: the graph may sit beside it, as
 * long as no node comes under it.
 */
function fitFree(nodes: readonly GraphNode[], size: Size, minZoom: number): View {
  const wide = (bar: HTMLElement) => bar.dataset.runFitAvoid === "right" || bar.offsetWidth >= size.width / 2;
  const beside = fitFrom(nodes, { valueWidth: 0 }, size, barInsets(size, wide), minZoom, 1);
  const box = runBounds(nodes, { valueWidth: 0 }, markScale(beside.zoom));
  // Screen point (s, t) shows graph point ((s - width / 2) / zoom - pan.x, (t - height / 2) / zoom - pan.y).
  const screen = (x: number, y: number) => [(x + beside.pan.x) * beside.zoom + size.width / 2, (y + beside.pan.y) * beside.zoom + size.height / 2];
  const [left, top] = screen(box.minX, box.minY);
  const [right, bottom] = screen(box.maxX, box.maxY);
  const under = [...document.querySelectorAll<HTMLElement>("[data-run-fit-avoid]")].some((bar) => !wide(bar) && bar.offsetHeight > 0
    && left < bar.offsetLeft + bar.offsetWidth + GUTTER && right > bar.offsetLeft - GUTTER
    && top < bar.offsetTop + bar.offsetHeight + GUTTER && bottom > bar.offsetTop - GUTTER);
  return under ? fitFrom(nodes, { valueWidth: 0 }, size, barInsets(size), minZoom, 1) : beside;
}

/** Whether two views are the same. */
const same = (a: View, b: View) => a.zoom === b.zoom && a.pan.x === b.pan.x && a.pan.y === b.pan.y;

/**
 * Keeps the graph clear of the edge list panel while it is open, as a run keeps it clear of the
 * notebook (`runFit`): on opening, the view makes room for every node if it must (none moves when the
 * graph already shows whole beside the panel). While the panel stays open it makes room again when
 * the graph changes (a new graph generated, nodes typed, added or moved; a move once the pointer is
 * let go, never in the middle of a drag) or the window changes size, as long as the learner has not
 * moved the view: it is still the one the panel opened on, the last one it fitted, or the one a new
 * graph opens in. On closing, the view goes back to where it was (where a new graph opens, if one came
 * meanwhile), unless the learner has moved it. When nodes that came while it was open (typed, or a new
 * graph) would not all show there, the graph fits the canvas the panel leaves free instead, as large
 * as it shows whole, up to 100%. With reduced motion the view jumps rather than glides.
 */
export function usePanelFit(open: boolean) {
  const size = useWindowSize();
  const nodes = useGraphStore((s) => s.data.nodes);
  // The view to go back to on closing, the view the panel last fitted (null: none yet), and the nodes there were on opening.
  const views = useRef<{ before: View; fit: View | null; had: Set<number> } | null>(null);

  useEffect(() => {
    if (!open) return;
    const { viewport, data } = useGraphStore.getState();
    views.current = { before: { zoom: viewport.zoom, pan: viewport.pan }, fit: null, had: new Set(data.nodes.map((n) => n.id)) };
    return () => {
      const own = views.current;
      views.current = null;
      const { data, viewport, setViewportZoom, setViewportPan } = useGraphStore.getState();
      if (!own?.fit || !same(viewport, own.fit)) return;
      const { before, had } = own;
      // Nodes that came while the panel was open (typed, or a new graph) and would be off screen there:
      // the graph fits the canvas the panel leaves free, as large as it shows whole, up to 100%.
      const added = data.nodes.filter((n) => !had.has(n.id));
      const size = { width: window.innerWidth, height: window.innerHeight };
      const insets = barInsets(size);
      const back = added.length === 0 || shows(runBounds(added, { valueWidth: 0 }, markScale(before.zoom)), before, size, insets, GUTTER)
        ? before
        : fitFree(data.nodes, size, isShortWindow(size) ? SHORT_WINDOW_MIN_ZOOM : ZOOM.MIN);
      setViewportZoom(back.zoom);
      setViewportPan(back.pan.x, back.pan.y);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const refit = () => {
      const own = views.current;
      if (!own) return;
      const { data, viewport, setViewportZoom, setViewportPan } = useGraphStore.getState();
      const view = { zoom: viewport.zoom, pan: viewport.pan };
      const graphsOwn = isOpeningView(view);
      // The learner moved the view: it stays where they put it.
      if (!graphsOwn && !same(view, own.fit ?? own.before)) return;
      // A new graph put the view back where graphs open: closing goes back there.
      if (graphsOwn && !same(view, own.fit ?? own.before)) own.before = view;
      const floor = isShortWindow(size) ? SHORT_WINDOW_MIN_ZOOM : ZOOM.MIN;
      const insets = barInsets(size);
      // The panel (not marked for runs, which it leaves as they begin): beside the graph on desktop, a card along the top on phones.
      const panel = document.querySelector<HTMLElement>(".tp-dock");
      if (panel?.dataset.place === "panel") insets.right = Math.max(insets.right, size.width - panel.offsetLeft);
      else if (panel) insets.top = Math.max(insets.top, panel.offsetTop + panel.offsetHeight);
      const fit = runFit(data.nodes, { valueWidth: 0 }, size, view, insets, floor, true);
      if (!fit) return;
      own.fit = fit;
      setViewportZoom(fit.zoom);
      setViewportPan(fit.pan.x, fit.pan.y);
    };
    // In the middle of a drag the view holds still, and makes room once the pointer is let go.
    if (!pointerDown) return refit();
    window.addEventListener("pointerup", refit, { once: true });
    return () => window.removeEventListener("pointerup", refit);
  }, [open, nodes, size]);
}

/** Whether a mouse button, finger or pen is down on the page (a drag may be going on). */
let pointerDown = false;
if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", () => (pointerDown = true), true);
  window.addEventListener("pointerup", () => (pointerDown = false), true);
  window.addEventListener("pointercancel", () => (pointerDown = false), true);
}

/**
 * Keeps a run's nodes and badges on screen (see `runFit`): when a run begins, the view makes room for
 * them if it must, and when the run ends it goes back to where it was, unless the learner has moved it
 * meanwhile. A run that ends by itself (Auto) leaves its result on the graph, so the view waits until
 * that result is cleared. The graph fills the window, so the window is the screen it fits. With
 * reduced motion the view jumps rather than glides (`useSpringViewport`).
 */
export function useRunFit(enabled: boolean) {
  const run = useGraphStore(selectStepRun);
  // Stops waiting to put back the view of a run that ended by itself.
  const waiting = useRef<(() => void) | null>(null);
  useEffect(() => () => waiting.current?.(), []);
  const size = useWindowSize();

  useEffect(() => {
    if (!enabled || run.ends.length === 0) return;
    waiting.current?.();
    waiting.current = null;
    const store = useGraphStore.getState();
    const before = store.viewport;
    const floor = isShortWindow(size) ? SHORT_WINDOW_MIN_ZOOM : ZOOM.MIN;
    const fit = runFit(store.data.nodes, badgesOf(run), size, before, barInsets(size), floor);
    if (!fit) return;
    const putBack = moveTo(fit);
    return () => {
      if (useGraphStore.getState().visualization.state !== VisualizationState.DONE) return putBack();
      const stop = useGraphStore.subscribe((state) => {
        if (state.visualization.state === VisualizationState.DONE) return;
        stop();
        waiting.current = null;
        putBack();
      });
      waiting.current = stop;
    };
  }, [enabled, run, size]);
}
