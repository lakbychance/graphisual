/**
 * Live engine for the algorithm landing pages.
 *
 * Runs the app's real algorithm adapters on a small graph and turns their old coarse step
 * stream (`legacySteps.ts`, until task 0.5) into frames a page can scrub through: which nodes
 * are visited, which edges were walked, the best-known distances, the queue and the trace message.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { algorithmRegistry, type EdgeInfo } from "@/algorithms";
import { EDGE_TYPE } from "@/constants/graph";
import { legacyExecute, StepType } from "./legacySteps";

export interface LabNode { id: number; label: string; x: number; y: number }
export interface LabEdge { from: number; to: number; weight: number; directed?: boolean }
/** `end` is set for pathfinding algorithms only. */
export interface LabGraph { nodes: LabNode[]; edges: LabEdge[]; start: number; end?: number }

export type Phase = "ready" | "explore" | "answer";

export interface Frame {
  phase: Phase;
  visited: Set<number>;
  current: number | null;
  traversed: Set<number>;
  activeEdge: number | null;
  /** Edges of the answer: the route, or the cycle. */
  path: Set<number>;
  pathNodes: Set<number>;
  /** Per walked edge: true when it was walked against its stored direction. */
  reversed: Map<number, boolean>;
  dist: Map<number, number>;
  queue: Array<{ id: number; value?: number }>;
  queueKind: string | null;
  /** The item the algorithm just took to work on. */
  processing: { id: number; value?: number } | null;
  /** Nodes in the order they were first visited. */
  order: number[];
  message: string;
}

export interface Run {
  frames: Frame[];
  /** Steps spent exploring (everything before the answer is traced). */
  work: number;
  /** Total weight of the answer's edges, or null when no answer was produced. */
  cost: number | null;
  /** Whether the answer is a cycle rather than a route. */
  cycle: boolean;
  /** The route's node labels from start to end (empty for a cycle or no answer). */
  pathLabels: string[];
  error?: string;
}

/** Index of the edge a step refers to (undirected edges match both ways). */
function edgeIndex(graph: LabGraph, from: number, to: number): number {
  return graph.edges.findIndex(
    (e) => (e.from === from && e.to === to) || (!e.directed && e.from === to && e.to === from),
  );
}

function adjacency(graph: LabGraph): Map<number, EdgeInfo[]> {
  const list = new Map<number, EdgeInfo[]>();
  for (const n of graph.nodes) list.set(n.id, []);
  for (const e of graph.edges) {
    const type = e.directed ? EDGE_TYPE.DIRECTED : EDGE_TYPE.UNDIRECTED;
    list.get(e.from)?.push({ from: e.from, to: e.to, weight: e.weight, type });
    if (!e.directed) list.get(e.to)?.push({ from: e.to, to: e.from, weight: e.weight, type });
  }
  return list;
}

export function runAlgorithm(algorithmId: string, graph: LabGraph): Run {
  const adapter = algorithmRegistry.get(algorithmId);
  const ready: Frame = {
    phase: "ready", visited: new Set(), current: null, traversed: new Set(), activeEdge: null,
    path: new Set(), pathNodes: new Set(), reversed: new Map(), dist: new Map([[graph.start, 0]]),
    queue: [], queueKind: null, processing: null, order: [],
    message: `**Nothing has been visited yet.** The run starts at {n:${graph.start}}`,
  };
  if (!adapter) return { frames: [ready], work: 0, cost: null, cycle: false, pathLabels: [], error: `Unknown algorithm "${algorithmId}"` };

  const result = legacyExecute(algorithmId, {
    adjacencyList: adjacency(graph),
    nodes: graph.nodes.map((n) => ({ id: n.id })),
    startNodeId: graph.start,
    endNodeId: graph.end,
  });
  const drawsAnswer = result.steps.some((s) => s.type !== StepType.VISIT && s.edge.from !== -1);

  const frames: Frame[] = [ready];
  let prev = ready;
  let work = 0;
  for (const step of result.steps) {
    // The answer's first step only names the start node; it draws nothing, so it gets no frame.
    if (step.type !== StepType.VISIT && step.edge.from === -1 && drawsAnswer) continue;
    const next: Frame = {
      ...prev,
      visited: new Set(prev.visited), traversed: new Set(prev.traversed),
      path: new Set(prev.path), pathNodes: new Set(prev.pathNodes), reversed: new Map(prev.reversed), dist: new Map(prev.dist),
      activeEdge: null,
    };
    const idx = step.edge.from === -1 ? -1 : edgeIndex(graph, step.edge.from, step.edge.to);
    if (idx >= 0) next.reversed.set(idx, graph.edges[idx].from !== step.edge.from);
    if (step.type === StepType.VISIT) {
      work += 1;
      next.phase = "explore";
      if (!next.visited.has(step.edge.to)) next.order = [...next.order, step.edge.to];
      next.visited.add(step.edge.to);
      next.current = step.edge.to;
      if (idx >= 0) { next.traversed.add(idx); next.activeEdge = idx; }
    } else {
      next.phase = "answer";
      next.current = null;
      next.processing = null;
      if (idx >= 0) { next.path.add(idx); next.activeEdge = idx; }
      if (step.edge.from !== -1) next.pathNodes.add(step.edge.from);
      next.pathNodes.add(step.edge.to);
    }
    const ds = step.trace?.dataStructure;
    if (ds) {
      next.queue = ds.items;
      next.queueKind = ds.type;
      next.processing = ds.processing ?? null;
      for (const item of ds.items) if (item.value !== undefined) next.dist.set(item.id, item.value);
      if (ds.processing?.value !== undefined) next.dist.set(ds.processing.id, ds.processing.value);
    }
    if (step.trace?.message) next.message = step.trace.message;
    else if (step.type !== StepType.VISIT) {
      next.message = step.edge.from === -1
        ? "**The answer** is the start node itself"
        : `**${step.type === StepType.CYCLE ? "On the cycle" : "On the route"}:** {n:${step.edge.from}} to {n:${step.edge.to}}`;
    }
    frames.push(next);
    prev = next;
  }

  const last = frames[frames.length - 1];
  const cost = last.path.size > 0 ? [...last.path].reduce((sum, i) => sum + graph.edges[i].weight, 0) : null;
  const cycle = result.steps.some((s) => s.type === StepType.CYCLE);

  // Order the route's nodes by walking its edges from the start.
  const pathLabels: string[] = [];
  if (last.path.size > 0 && !cycle) {
    const label = (id: number) => graph.nodes.find((n) => n.id === id)?.label ?? String(id);
    const remaining = new Set(last.path);
    let at = graph.start;
    pathLabels.push(label(at));
    while (remaining.size > 0) {
      const hit = [...remaining].find((i) => graph.edges[i].from === at || (!graph.edges[i].directed && graph.edges[i].to === at));
      if (hit === undefined) break;
      remaining.delete(hit);
      at = graph.edges[hit].from === at ? graph.edges[hit].to : graph.edges[hit].from;
      pathLabels.push(label(at));
    }
  }

  return { frames, work, cost, cycle, pathLabels, error: result.error };
}

/** Trace messages mark node ids as `{n:3}` and emphasis as `**text**`. */
export function messageParts(message: string, graph: LabGraph): Array<{ text: string; bold: boolean }> {
  const named = message.replace(/\{n:(-?\d+)\}/g, (_, id) => graph.nodes.find((n) => n.id === Number(id))?.label ?? id);
  return named.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((chunk) =>
    chunk.startsWith("**") ? { text: chunk.slice(2, -2), bold: true } : { text: chunk, bold: false },
  );
}

export const formatDistance = (value: number | undefined) => (value === undefined || value === Infinity ? "∞" : String(value));

export interface Playback {
  index: number;
  playing: boolean;
  last: number;
  setIndex: (index: number) => void;
  toggle: () => void;
  step: (delta: number) => void;
  restart: () => void;
}

/** A clock over a run's frames. Rewinds and replays on its own when `loop` is set. */
export function usePlayback(length: number, { ms = 700, loop = true, autoplay = true, hold = 2200 } = {}): Playback {
  const last = Math.max(0, length - 1);
  const [index, setIndexState] = useState(0);
  const [playing, setPlaying] = useState(autoplay);
  const indexRef = useRef(0);
  indexRef.current = index;

  const setIndex = useCallback((next: number) => setIndexState(Math.max(0, Math.min(last, next))), [last]);

  useEffect(() => { if (index > last) setIndexState(last); }, [index, last]);

  useEffect(() => {
    if (!playing) return;
    const atEnd = index >= last;
    if (atEnd && !loop) { setPlaying(false); return; }
    const timer = window.setTimeout(() => setIndexState(atEnd ? 0 : indexRef.current + 1), atEnd ? hold : ms);
    return () => window.clearTimeout(timer);
  }, [playing, index, last, loop, ms, hold]);

  return useMemo(() => ({
    index: Math.min(index, last), playing, last, setIndex,
    toggle: () => setPlaying((p) => { if (!p && indexRef.current >= last) setIndexState(0); return !p; }),
    step: (delta: number) => { setPlaying(false); setIndex(indexRef.current + delta); },
    restart: () => { setIndexState(0); setPlaying(true); },
  }), [index, last, playing, setIndex]);
}
