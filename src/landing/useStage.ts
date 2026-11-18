import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { lit, type AlgorithmLandingProps } from "./helpers";
import { runAlgorithm, usePlayback, type LabGraph } from "./engine";
import type { MaterialName } from "./LiveGraph";
import { useSound } from "./sound";

/**
 * The stage engine: scroll, sound and the visitor's graph.
 *
 * A track scrolls past a pinned stage. The scroll is eased and turned into:
 *  - continuous values, written straight to CSS variables on the stage (the two material
 *    seams, how far the current edge has been drawn, overall progress), and
 *  - a small discrete view (frame, chapter, wiping, unlocked) kept in React state,
 * so React only re-renders when something actually changes.
 *
 * The graph is the visitor's: nodes can be dragged and weights changed at any point, and
 * the run is recomputed. At the end of the track the graph "unlocks" and runs on its own clock.
 */

export type Chapter = MaterialName;
export interface View { frame: number; chapter: Chapter; wiping: boolean; unlocked: boolean }
export interface Placement { graph: LabGraph; radius: number }

// The pinned scroll, in fractions of its length. The last stretch is the unlocked graph.
const K = 0.9;
export const SEG = {
  run1: [0.05 * K, 0.34 * K], wipe1: [0.34 * K, 0.43 * K], run2: [0.43 * K, 0.73 * K], wipe2: [0.73 * K, 0.82 * K], unlock: 0.955,
} as const;

const within = (p: number, a: number, b: number) => Math.max(0, Math.min(1, (p - a) / (b - a)));
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface Args {
  content: AlgorithmLandingProps;
  /** The graph in its own coordinates. */
  base: LabGraph;
  /** Lay the graph out in a box of the given pixel size. */
  place: (box: { w: number; h: number }, base: LabGraph) => Placement;
  /** Let the graph be rearranged from the start, not only once it has unlocked. */
  interactive?: boolean;
}

export function useStage({ content, base, place, interactive = false }: Args) {
  const { live } = content;
  const sound = useSound();
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLElement>(null);
  /** The element the graph is laid out in: the stage itself, or a screen inside it. */
  const box = useRef<HTMLDivElement | HTMLElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [view, setView] = useState<View>({ frame: 0, chapter: "paper", wiping: false, unlocked: false });
  const [mine, setMine] = useState<LabGraph | null>(null);

  useEffect(() => {
    const el = box.current ?? stage.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
      setMine(null); // A new box size lays the graph out afresh.
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const placed = useMemo(() => (size ? place(size, base) : null), [size, base, place]);
  const graph = mine ?? placed?.graph ?? base;
  const run = useMemo(() => runAlgorithm(live.algorithmId, graph), [live.algorithmId, graph]);
  const lastFrame = run.frames.length - 1;

  // The scroll loop.
  useEffect(() => {
    const still = reducedMotion();
    let target = 0;
    let smooth = -1;
    let raf = 0;
    const read = () => {
      const el = track.current;
      const pinned = stage.current;
      if (!el || !pinned) return;
      const rect = el.getBoundingClientRect();
      const top = Number.parseFloat(getComputedStyle(pinned).top) || 0;
      target = Math.max(0, Math.min(1, (top - rect.top) / (rect.height - pinned.clientHeight)));
    };
    const apply = (p: number) => {
      const el = stage.current;
      if (!el) return;
      const w1 = within(p, SEG.wipe1[0], SEG.wipe1[1]);
      const w2 = within(p, SEG.wipe2[0], SEG.wipe2[1]);
      const position = p >= SEG.wipe2[0] ? lastFrame
        : p >= SEG.run2[0] ? within(p, SEG.run2[0], SEG.run2[1]) * lastFrame
        : p >= SEG.wipe1[0] ? lastFrame
        : within(p, SEG.run1[0], SEG.run1[1]) * lastFrame;
      const frame = Math.min(lastFrame, Math.floor(position + 1e-6));
      const s1 = Math.sin(Math.PI * w1);
      const s2 = Math.sin(Math.PI * w2);
      el.style.setProperty("--w1", String(w1));
      el.style.setProperty("--w2", String(w2));
      el.style.setProperty("--draw", String(frame === lastFrame ? 0 : position - frame));
      el.style.setProperty("--p", String(p));
      el.style.setProperty("--s1", String(s1));
      el.style.setProperty("--s2", String(s2));
      const next: View = {
        frame,
        chapter: w2 > 0.5 ? "blueprint" : w1 > 0.5 ? "graphite" : "paper",
        wiping: (w1 > 0 && w1 < 1) || (w2 > 0 && w2 < 1),
        unlocked: p >= SEG.unlock,
      };
      setView((prev) => (prev.frame === next.frame && prev.chapter === next.chapter && prev.wiping === next.wiping && prev.unlocked === next.unlocked ? prev : next));
    };
    const tick = () => {
      smooth = still || smooth < 0 ? target : smooth + (target - smooth) * 0.18;
      if (Math.abs(target - smooth) < 0.0003) smooth = target;
      apply(smooth);
      raf = smooth === target ? 0 : requestAnimationFrame(tick);
    };
    const onScroll = () => { read(); if (!raf) raf = requestAnimationFrame(tick); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, [lastFrame]);

  /** Scroll the page so the stage sits at a given fraction of its track. */
  const goTo = useCallback((p: number) => {
    const el = track.current;
    const pinned = stage.current;
    if (!el || !pinned) return;
    const top = Number.parseFloat(getComputedStyle(pinned).top) || 0;
    const start = el.getBoundingClientRect().top + window.scrollY - top;
    window.scrollTo({ top: start + (el.offsetHeight - pinned.clientHeight) * p, behavior: reducedMotion() ? "auto" : "smooth" });
  }, []);
  /** Jump to the start of a chapter, or to the unlocked graph at the end. */
  const goToChapter = useCallback((chapter: Chapter | "yours") => {
    goTo(chapter === "paper" ? 0 : chapter === "graphite" ? SEG.wipe1[1] + 0.004 : chapter === "blueprint" ? SEG.wipe2[1] + 0.02 : 1);
  }, [goTo]);
  // Sound: one voice per discrete event, in the kit of the material it happens on.
  const heard = useRef({ frame: 0, chapter: "paper" as Chapter });
  useEffect(() => {
    const before = heard.current;
    heard.current = { frame: view.frame, chapter: view.chapter };
    if (before.chapter !== view.chapter) sound.play(view.chapter, "latch", 1.2);
    else if (before.frame !== view.frame) {
      sound.play(view.chapter, run.frames[Math.min(view.frame, run.frames.length - 1)].phase === "answer" ? "down" : "tick");
      if (sound.on) navigator.vibrate?.(6);
    }
  }, [view.frame, view.chapter, sound, run]);

  // Unlocked, the graph runs on its own clock. The clock object changes every tick, so it is held in a ref.
  const ownClock = usePlayback(run.frames.length, { ms: 700, hold: 2600, autoplay: false });
  const clock = useRef(ownClock);
  clock.current = ownClock;
  useEffect(() => { if (view.unlocked && !reducedMotion()) clock.current.restart(); }, [view.unlocked]);

  const move = (id: number, x: number, y: number) => setMine({ ...graph, nodes: graph.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)) });
  const bump = (edgeIndex: number) => {
    setMine({ ...graph, edges: graph.edges.map((e, i) => (i === edgeIndex ? { ...e, weight: (e.weight % 9) + 1 } : e)) });
    sound.play(view.chapter, "tick");
    if (view.unlocked) clock.current.restart();
  };

  const index = view.unlocked ? Math.min(ownClock.index, lastFrame) : Math.min(view.frame, lastFrame);
  const frame = run.frames[index];
  const editable = interactive || view.unlocked;
  return {
    track, stage, box, size, view, run, graph, frame, lastFrame, edited: mine !== null,
    radius: placed?.radius ?? 22,
    /** The frame after this one, for scrubbed drawing (none while the graph runs on its own clock). */
    next: !view.unlocked && index < lastFrame ? run.frames[index + 1] : undefined,
    opening: view.chapter === "paper" && view.frame === 0 && !view.unlocked,
    litSteps: lit(live.steps, frame), litLines: lit(live.lines, frame),
    onMove: editable ? move : undefined,
    onWeight: editable && live.weighted ? bump : undefined,
    goToChapter,
  };
}

export type StageState = ReturnType<typeof useStage>;
