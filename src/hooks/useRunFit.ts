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
  return {
    valueWidth,
    times: run.events.some((e) => e.type === "settle" && e.time !== undefined),
    slots: run.events.some((e) => e.type === "enqueue"),
  };
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
): View | null {
  if (nodes.length === 0 || shows(runBounds(nodes, badges, markScale(view.zoom)), view, size, insets, GUTTER)) return null;
  const bodies = runBounds(nodes, { valueWidth: 0, times: false, slots: false }, 1);
  if (!isOpeningView(view) && !shows(bodies, view, size, NO_INSETS, 0)) return null;
  const centred = (zoom: number) => {
    const box = runBounds(nodes, badges, markScale(zoom));
    const pan = {
      x: (insets.left - insets.right) / (2 * zoom) - (box.minX + box.maxX) / 2,
      y: (insets.top - insets.bottom) / (2 * zoom) - (box.minY + box.maxY) / 2,
    };
    return { box, view: { zoom, pan } };
  };
  for (let step = 0; view.zoom - step / 100 >= minZoom; step++) {
    const { box, view: fit } = centred(Math.round((view.zoom - step / 100) * 100) / 100);
    if (shows(box, fit, size, insets, GUTTER)) return fit;
  }
  return centred(Math.min(view.zoom, minZoom)).view;
}

/**
 * The bars and panels that float over the graph, marked `data-run-fit-avoid`: the toolbar, the step
 * controls, the notebook, and on wider screens the zoom, history and settings corners. A bar covers the rows along the top or bottom edge it sits nearer; one
 * marked `data-run-fit-avoid="right"` (the notebook's side panel) covers the columns along the right.
 * Each is fixed to the screen and measured where it rests, not where its entrance has it now.
 */
function barInsets(size: Size): Insets {
  const insets = { ...NO_INSETS };
  for (const bar of document.querySelectorAll<HTMLElement>("[data-run-fit-avoid]")) {
    const top = bar.offsetTop;
    const bottom = top + bar.offsetHeight;
    if (bottom <= top) continue;
    if (bar.dataset.runFitAvoid === "right") insets.right = Math.max(insets.right, size.width - bar.offsetLeft);
    else if (top + bottom < size.height) insets.top = Math.max(insets.top, bottom);
    else insets.bottom = Math.max(insets.bottom, size.height - top);
  }
  return insets;
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
  const [size, setSize] = useState<Size>(() => ({ width: window.innerWidth, height: window.innerHeight }));
  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!enabled || run.ends.length === 0) return;
    waiting.current?.();
    waiting.current = null;
    const store = useGraphStore.getState();
    const before = store.viewport;
    const floor = isShortWindow(size) ? SHORT_WINDOW_MIN_ZOOM : ZOOM.MIN;
    const fit = runFit(store.data.nodes, badgesOf(run), size, before, barInsets(size), floor);
    if (!fit) return;
    store.setViewportZoom(fit.zoom);
    store.setViewportPan(fit.pan.x, fit.pan.y);
    const putBack = () => {
      const { viewport, setViewportZoom, setViewportPan } = useGraphStore.getState();
      if (viewport.zoom !== fit.zoom || viewport.pan.x !== fit.pan.x || viewport.pan.y !== fit.pan.y) return;
      setViewportZoom(before.zoom);
      setViewportPan(before.pan.x, before.pan.y);
    };
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
