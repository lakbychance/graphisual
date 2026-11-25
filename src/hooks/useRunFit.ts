import { useEffect, useState } from "react";
import type { GraphNode } from "../components/Graph/types";
import { markScale, num, runBounds, VALUE_BADGE, type RunBadges } from "../components/Graph/runMarkShapes";
import { ZOOM } from "../constants/ui";
import { selectStepRun, useGraphStore } from "../store/graphStore";
import { keepsValues, type Run } from "../utils/visualization/runView";

/** Room kept between a badge and the screen edge, in pixels. */
const GUTTER = 8;

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

/** Screen rows the floating bars cover, in pixels from the top and bottom edges. */
interface Insets {
  top: number;
  bottom: number;
}

const NO_INSETS: Insets = { top: 0, bottom: 0 };

/** Whether the box shows whole on a screen of this size, clear of the bars and `gutter` pixels in from the edges. */
function shows(box: ReturnType<typeof runBounds>, { zoom, pan }: View, { width, height }: Size, insets: Insets, gutter: number) {
  const halfWidth = (width / 2 - gutter) / zoom;
  // Screen row s shows graph y = (s - height / 2) / zoom - pan.y.
  const top = (insets.top + gutter - height / 2) / zoom - pan.y;
  const bottom = (height / 2 - insets.bottom - gutter) / zoom - pan.y;
  return box.minX >= -pan.x - halfWidth && box.maxX <= -pan.x + halfWidth && box.minY >= top && box.maxY <= bottom;
}

/** The view a graph opens in (see `setGraph`). */
const isOpeningView = ({ zoom, pan }: View) => zoom === 1 && pan.x === 0 && pan.y === 0;

/**
 * The view that shows every node and its badges whole, clear of the bars, when the current one cuts
 * something off: centred on them and zoomed out no more than it takes (at the smallest zoom, as well as
 * it can). Null when everything already shows, or when the learner has zoomed or panned away from the
 * view the graph opened in and left nodes off screen (they chose to look at part of the graph).
 */
export function runFit(nodes: readonly GraphNode[], badges: RunBadges, size: Size, view: View, insets: Insets = NO_INSETS): View | null {
  if (nodes.length === 0 || shows(runBounds(nodes, badges, markScale(view.zoom)), view, size, insets, GUTTER)) return null;
  const bodies = runBounds(nodes, { valueWidth: 0, times: false, slots: false }, 1);
  if (!isOpeningView(view) && !shows(bodies, view, size, NO_INSETS, 0)) return null;
  const centred = (zoom: number) => {
    const box = runBounds(nodes, badges, markScale(zoom));
    const pan = { x: -(box.minX + box.maxX) / 2, y: (insets.top - insets.bottom) / (2 * zoom) - (box.minY + box.maxY) / 2 };
    return { box, view: { zoom, pan } };
  };
  for (let step = 0; view.zoom - step / 100 >= ZOOM.MIN; step++) {
    const { box, view: fit } = centred(Math.round((view.zoom - step / 100) * 100) / 100);
    if (shows(box, fit, size, insets, GUTTER)) return fit;
  }
  return centred(Math.min(view.zoom, ZOOM.MIN)).view;
}

/**
 * On a phone the toolbar along the bottom and the step controls along the top float over the graph
 * (marked `data-run-fit-avoid`); on wider screens the graph keeps the whole window.
 */
function barInsets(size: Size): Insets {
  if (size.width >= 768) return NO_INSETS;
  const insets = { ...NO_INSETS };
  for (const bar of document.querySelectorAll("[data-run-fit-avoid]")) {
    const { top, bottom } = bar.getBoundingClientRect();
    if (bottom <= top) continue;
    if (top + bottom < size.height) insets.top = Math.max(insets.top, bottom);
    else insets.bottom = Math.max(insets.bottom, size.height - top);
  }
  return insets;
}

/**
 * Keeps a run's nodes and badges on screen (see `runFit`): when a run begins, the view makes room for
 * them if it must, and when the run ends it goes back to where it was, unless the learner has moved it
 * meanwhile. The graph fills the window, so the window is the screen it fits. With reduced motion the
 * view jumps rather than glides (`useSpringViewport`).
 */
export function useRunFit(enabled: boolean) {
  const run = useGraphStore(selectStepRun);
  const [size, setSize] = useState<Size>(() => ({ width: window.innerWidth, height: window.innerHeight }));
  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!enabled || run.ends.length === 0) return;
    const store = useGraphStore.getState();
    const before = store.viewport;
    const fit = runFit(store.data.nodes, badgesOf(run), size, before, barInsets(size));
    if (!fit) return;
    store.setViewportZoom(fit.zoom);
    store.setViewportPan(fit.pan.x, fit.pan.y);
    return () => {
      const { viewport, setViewportZoom, setViewportPan } = useGraphStore.getState();
      if (viewport.zoom !== fit.zoom || viewport.pan.x !== fit.pan.x || viewport.pan.y !== fit.pan.y) return;
      setViewportZoom(before.zoom);
      setViewportPan(before.pan.x, before.pan.y);
    };
  }, [enabled, run, size]);
}
