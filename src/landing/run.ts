/**
 * What a landing page draws for each step of a run, read from the shared event engine.
 *
 * The page runs the app's algorithm adapters on its small graph and plays the same steps
 * the app plays, one change each (`createRun`, `frameAt`), with the app's walked nodes and edges
 * (`walkedAt`), lit pseudocode line (`lineAt`), trace message and data structure (`traceAt`).
 * This module only translates them into the drawing's terms: edges by their index in the
 * page's graph, and the direction each was walked.
 */
import { algorithmRegistry, type EdgeInfo } from "@/algorithms";
import { frameAt, type AlgorithmEvent } from "@/algorithms/engine";
import { EDGE_TYPE } from "@/constants/graph";
import { createRun, lineAt, traceAt, walkedAt } from "@/utils/visualization/runView";
import type { LabGraph } from "./live/types";

export type Phase = "ready" | "explore" | "answer";

/** One step of a run, as the page draws it. */
export interface Frame {
  phase: Phase;
  /** The step reached the destination or found the cycle. */
  found: boolean;
  /** The pseudocode line the step lights (`lineAt`). */
  line: number | null;
  visited: Set<number>;
  current: number | null;
  /** Edges walked so far, by index in the page's graph. */
  traversed: Set<number>;
  /** The edge this step walks, drawn as the scroll moves into the step. */
  activeEdge: number | null;
  /** Edges drawn in the answer's ink: the route or the cycle, and an edge that closes a loop once found. */
  path: Set<number>;
  pathNodes: Set<number>;
  /** Per edge drawn: true when it was walked against its stored direction. */
  reversed: Map<number, boolean>;
  dist: ReadonlyMap<number, number>;
  queue: Array<{ id: number; value?: number }>;
  /** The item the algorithm just took to work on. */
  processing: { id: number; value?: number } | null;
  /** Nodes in the order they were visited. */
  order: number[];
  message: string;
}

export interface Run {
  frames: Frame[];
  /** Total weight of the route's or cycle's edges, or null when there is none. */
  cost: number | null;
  /** Whether the answer is a cycle rather than a route. */
  cycle: boolean;
  /** The route's node labels from start to end (empty for a cycle, no route, or a route of one node). */
  pathLabels: string[];
}

/** Index of the edge from -> to in the page's graph (undirected edges match both ways). */
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

const emptyFrame = (): Frame => ({
  phase: "ready", found: false, line: null, visited: new Set(), current: null, traversed: new Set(), activeEdge: null,
  path: new Set(), pathNodes: new Set(), reversed: new Map(), dist: new Map(), queue: [], processing: null, order: [], message: "",
});

/**
 * Runs an algorithm on a page graph: one frame per step, as the app steps it, lighting
 * what the app's canvas lights (`walkedAt`). The answer lights the route or the cycle at once.
 */
export function runAlgorithm(algorithmId: string, graph: LabGraph): Run {
  const adapter = algorithmRegistry.get(algorithmId);
  const adjacencyList = adjacency(graph);
  const events: AlgorithmEvent[] = adapter?.events({
    adjacencyList, nodes: graph.nodes.map((n) => ({ id: n.id })), startNodeId: graph.start, endNodeId: graph.end,
  }) ?? [];
  const run = createRun(algorithmId, events, [...adjacencyList.keys()]);
  const settles = events.some((e) => e.type === "settle");

  const frames = run.ends.map((end, index): Frame => {
    const frame = frameAt(events, end);
    const step = events.slice(index > 0 ? run.ends[index - 1] : 0, end);
    const trace = traceAt(run, index);
    const view = emptyFrame();
    const walk = (into: Set<number>, { from, to }: { from: number; to: number }) => {
      const i = edgeIndex(graph, from, to);
      if (i < 0) return;
      into.add(i);
      view.reversed.set(i, graph.edges[i].from !== from);
    };
    const walked = walkedAt(run, index);

    view.phase = index === 0 ? "ready" : frame.answer ? "answer" : "explore";
    view.found = step.some((e) => (e.type === "settle" && e.target) || (e.type === "classify" && e.loop));
    view.line = lineAt(run, index);
    view.order = [...frame.settled];
    view.visited = new Set(walked.visited);
    view.current = frame.current;
    view.dist = frame.dist;
    for (const w of walked.walks) walk(view.traversed, w);

    // The edge this step walks: the last one it adds to the drawing.
    for (const e of step) {
      if (e.type === "settle" && e.via !== undefined) view.activeEdge = edgeIndex(graph, e.via, e.node);
      else if (e.type === "classify" && e.loop) view.activeEdge = edgeIndex(graph, e.from, e.to);
      else if (e.type === "relax" && !settles) view.activeEdge = edgeIndex(graph, e.from, e.to);
    }
    if (view.activeEdge !== null && view.activeEdge < 0) view.activeEdge = null;

    // An edge back to a node in progress is inked in the cycle colour as soon as it is found, as in the app.
    for (const w of walked.back) walk(view.path, w);
    for (const id of walked.answer?.nodes ?? []) view.pathNodes.add(id);
    for (const w of walked.answer?.walks ?? []) walk(view.path, w);

    const ds = trace?.dataStructure;
    view.queue = ds?.items ?? [];
    view.processing = ds?.processing ?? null;
    view.message = trace?.message ?? "";
    return view;
  });

  const last = frames[frames.length - 1] ?? emptyFrame();
  const answer = events.find((e) => e.type === "answer");
  const label = (id: number) => graph.nodes.find((n) => n.id === id)?.label ?? String(id);
  const route = answer?.type === "answer" && answer.kind === "route" && answer.path && answer.path.length > 1 ? answer.path : null;
  return {
    frames: frames.length > 0 ? frames : [last],
    cost: last.path.size > 0 ? [...last.path].reduce((sum, i) => sum + graph.edges[i].weight, 0) : null,
    cycle: answer?.type === "answer" && answer.kind === "cycle" && answer.cycle !== null,
    pathLabels: route ? route.map(label) : [],
  };
}

/** Trace messages mark node ids as `{n:3}` and emphasis as `**text**`. */
export function messageParts(message: string, graph: LabGraph): Array<{ text: string; bold: boolean }> {
  const named = message.replace(/\{n:(-?\d+)\}/g, (_, id) => graph.nodes.find((n) => n.id === Number(id))?.label ?? id);
  return named.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((chunk) =>
    chunk.startsWith("**") ? { text: chunk.slice(2, -2), bold: true } : { text: chunk, bold: false },
  );
}

export const formatDistance = (value: number | undefined) => (value === undefined || value === Infinity ? "∞" : String(value));
