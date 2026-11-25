/**
 * The rework lab's reading of a run: which graph and moment the URL asks for, and what the
 * learner should see at each step. Everything here comes from the shared engine (`createRun`,
 * `frameAt`, `lineAt`, `traceAt`, `narrate`); the lab only decides how to show it.
 *
 * Lab URL: `/rework-lab?v=<variant>&algorithm=<id>&g=<page|app|directed>&from=<node>&to=<node>&step=<n>`.
 * The app's step links work too (see `stepLink.ts`): `&graph=<graph code>` wins over `g`, and a link
 * without `graph` whose `from` is a node number opens the app's own graph, as the app does.
 */
import { algorithmRegistry } from "@/algorithms";
import { frameAt, narrate, changes, type AlgorithmEvent, type EdgeClass, type Frame } from "@/algorithms/engine";
import { COMPACT } from "@/landing/live/shared";
import * as pages from "@/landing/live/configs";
import type { LiveConfig } from "@/landing/live/types";
import type { GraphNode } from "@/components/Graph/types";
import {
  generateCycleWithDeadEnd, generateWeighted, graphFromSpec, type GeneratedGraph,
} from "@/utils/graph/graphGenerator";
import { buildRun } from "@/utils/visualization/buildRun";
import {
  keepsValues, keyMoments, lineAt, rolesAt, runMarksAt, type KeyMoment, type NodeBadge, type NodeRole, type Run,
} from "@/utils/visualization/runView";
import type { DrawnMark, MarkKind } from "@/components/Graph/runMarkShapes";
import { needsDestination } from "@/utils/visualization/stepLink";
import { decodeGraphLink } from "@/utils/graph/graphLink";

/* ------------------------------------------------------------------ setup */

export const VARIANTS = [
  { id: "caption", name: "Caption", blurb: "Everything on the graph, one line of words under it" },
  { id: "notebook", name: "Notebook", blurb: "A side notebook: the step in words, then code or state" },
  { id: "score", name: "Score", blurb: "The run as a score: code lines down, steps across" },
] as const;
export type VariantId = (typeof VARIANTS)[number]["id"];

/** The algorithms the lab plays, each with its landing page's graph. */
const PAGE_CONFIG: Record<string, LiveConfig> = {
  dijkstra: pages.dijkstra,
  "bellman-ford": pages.bellmanFord,
  dfs: pages.dfs,
  "cycle-detection": pages.cycleDetection,
  bfs: pages.bfs,
  prims: pages.prims,
  "bfs-pathfinding": pages.bfsPathfinding,
  "dfs-pathfinding": pages.dfsPathfinding,
};
export const LAB_ALGORITHMS = Object.keys(PAGE_CONFIG);

export type GraphId = "page" | "app" | "directed" | "link";

/** The standard graphs an algorithm can be shown on, default first. */
export function graphChoices(algorithm: string): Array<{ id: GraphId; name: string }> {
  switch (algorithm) {
    case "dijkstra":
    case "bellman-ford":
      return [{ id: "page", name: "Page graph (A–F)" }, { id: "app", name: "App graph (12 nodes)" }];
    case "cycle-detection":
      return [{ id: "app", name: "App graph (ring and dead end)" }, { id: "page", name: "Page graph (directed)" }];
    case "dfs":
      return [{ id: "page", name: "Page graph (undirected)" }, { id: "directed", name: "Directed (cycle page)" }];
    default:
      return [{ id: "page", name: "Page graph (A–F)" }];
  }
}

const LABELS = ["A", "B", "C", "D", "E", "F"];

/** A landing page's six-node graph at its own size, centred on the canvas origin. */
function pageGraph(config: LiveConfig): GeneratedGraph {
  const xs = COMPACT.map(([x]) => x);
  const ys = COMPACT.map(([, y]) => y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  return graphFromSpec({
    nodes: COMPACT.map(([x, y], i) => ({ x: (x - cx) * 1.1, y: (y - cy) * 1.1, label: LABELS[i] })),
    edges: config.edges.map(([from, to, weight]) => ({ from, to, weight, directed: !!config.directed })),
  });
}

/** What the lab plays: a run of an algorithm on a graph, opened at a step. */
export interface Setup {
  variant: VariantId;
  algorithm: string;
  graphId: GraphId;
  graph: GeneratedGraph;
  from: number;
  to: number | null;
  /** The step counter, 1 to N. */
  step: number;
  run: Run;
}

export type SetupResult = { setup: Setup } | { problem: string };

const nameOf = (node: GraphNode) => node.label || String(node.id);

/** The setup a lab URL asks for, with the lab's defaults for whatever it leaves out. */
export function readSetup(search: string): SetupResult {
  const params = new URLSearchParams(search);
  const variant = (VARIANTS.find((v) => v.id === params.get("v"))?.id ?? "caption") as VariantId;
  const asked = params.get("algorithm") ?? "";
  const algorithm = PAGE_CONFIG[asked] ? asked : "dijkstra";
  const pathfinding = needsDestination(algorithm);
  const stepAsked = Number(params.get("step") ?? "1");

  let graphId: GraphId;
  let graph: GeneratedGraph;
  let fromName: string | null;
  let toName: string | null;
  const linked = params.has("graph") ? decodeGraphLink(params.get("graph")!) : null;
  if (linked) {
    graphId = "link";
    graph = graphFromSpec(linked);
    fromName = params.get("from") ?? nameOf(graph.nodes[0]);
    toName = params.get("to") ?? nameOf(graph.nodes[graph.nodes.length - 1]);
  } else {
    const choices = graphChoices(algorithm);
    // An app step link without `graph` names the app's own graph by its node numbers.
    const appLink = !params.has("g") && /^\d+$/.test(params.get("from") ?? "") && choices.some((c) => c.id === "app");
    graphId = choices.find((c) => c.id === (appLink ? "app" : params.get("g")))?.id ?? choices[0].id;
    const app = graphId === "app";
    graph = app
      ? (algorithm === "cycle-detection" ? generateCycleWithDeadEnd() : generateWeighted())
      : pageGraph(graphId === "directed" ? pages.cycleDetection : PAGE_CONFIG[algorithm]);
    fromName = params.get("from") ?? (app ? "1" : "A");
    toName = params.get("to") ?? (app ? "12" : "F");
  }

  const named = (name: string | null) => {
    const matches = graph.nodes.filter((n) => nameOf(n) === name);
    return matches.length === 1 ? matches[0].id : null;
  };
  const from = named(fromName) ?? graph.nodes[0].id;
  const to = pathfinding ? named(toName) ?? graph.nodes[graph.nodes.length - 1].id : null;
  const built = buildRun(algorithm, graph.nodes, graph.edges, from, to ?? undefined);
  if (!built) return { problem: "Unknown algorithm" };
  if ("problem" in built) return { problem: built.problem.replace(/\.$/, "") };
  const total = built.run.ends.length;
  const step = Number.isInteger(stepAsked) ? Math.max(1, Math.min(stepAsked, total)) : 1;
  return { setup: { variant, algorithm, graphId, graph, from, to, step, run: built.run } };
}

/** The lab URL for a setup at step `step` (1 to N). */
export function setupLink(setup: Pick<Setup, "variant" | "algorithm" | "graphId" | "graph" | "from" | "to">, step: number, graphCode?: string | null): string {
  const name = (id: number | null) => {
    const node = id === null ? undefined : setup.graph.nodes.find((n) => n.id === id);
    return node ? nameOf(node) : null;
  };
  const params = new URLSearchParams({ v: setup.variant, algorithm: setup.algorithm });
  if (setup.graphId === "link" && graphCode) params.set("graph", graphCode);
  else if (setup.graphId !== "link") params.set("g", setup.graphId);
  const from = name(setup.from);
  if (from) params.set("from", from);
  const to = name(setup.to);
  if (to) params.set("to", to);
  params.set("step", String(step));
  return `/rework-lab?${params}`;
}

/* ------------------------------------------------------------- one step */

/** How a node reads at a step: the app's own roles (see `rolesAt`). */
export type Role = NodeRole;

/** A node's badges (the app's, see `runMarksAt`, with a depth-first search's times) and its role. */
export interface NodeState extends NodeBadge {
  role: Role;
}

/**
 * An edge drawn over the graph's own: the app's run marks (see `runMarksAt`), with a depth-first
 * search's branch and the engine's classes of the other edges it has met (`back`, `forward`, `cross`).
 */
export type { MarkKind };
export type EdgeMark = DrawnMark;

export interface StepView {
  index: number;
  frame: Frame;
  /** The change this step makes (absent for a step that only checks). */
  change: AlgorithmEvent | undefined;
  nodes: Map<number, NodeState>;
  marks: EdgeMark[];
  /** Kinds of non-tree edge found so far, for a legend. */
  classes: EdgeClass[];
  /** The algorithm keeps a value per node (distance or cost). */
  valued: boolean;
}

export { keepsValues };

const stepEvents = (run: Run, index: number) => run.events.slice(index > 0 ? run.ends[index - 1] : 0, run.ends[index]);

/** What step `index` shows: the app's roles and run marks, depth-first times and edge classes included. */
export function stepView(run: Run, index: number, nodes: GraphNode[]): StepView {
  const frame = frameAt(run.events, index < 0 ? 0 : run.ends[index]);
  const change = (index < 0 ? [] : stepEvents(run, index)).find(changes);
  const shared = runMarksAt(run, index);
  const roles = rolesAt(run, index);

  const states = new Map<number, NodeState>();
  for (const { id } of nodes) states.set(id, { role: roles.get(id) ?? "unseen", changed: false, ...shared.nodes.get(id) });

  const classes = new Set<EdgeClass>();
  for (const { kind } of shared.edges) if (kind === "back" || kind === "forward" || kind === "cross") classes.add(kind);

  return { index, frame, change, nodes: states, marks: shared.edges, classes: [...classes], valued: shared.valued };
}

/* -------------------------------------------------------- the whole run */

/** Something worth finding on the timeline: the app's key moments (see `keyMoments`). */
export type Marker = KeyMoment;

/** What a step does, in one word, for the score. */
export type StepKind = "start" | "take" | "add" | "improve" | "back-up" | "loop" | "answer" | "check";

export interface RunSummary {
  narration: string[];
  lines: Array<number | null>;
  kinds: StepKind[];
  markers: Marker[];
}

function kindOf(change: AlgorithmEvent | undefined): StepKind {
  switch (change?.type) {
    case "start": return "start";
    case "enqueue": return change.from === undefined ? "start" : "add";
    case "settle": return "take";
    case "relax": return change.old === Infinity ? "add" : "improve";
    case "finish": return "back-up";
    case "classify": return "loop";
    case "answer": return "answer";
    default: return "check";
  }
}

/** Narration, lit lines, step kinds and markers for every step, with node ids shown by name. */
export function summarise(run: Run, nodes: GraphNode[]): RunSummary {
  const name = labeller(nodes);
  const narration = narrate(run.events, run.algorithmId).map(name);
  const lines: Array<number | null> = [];
  const kinds: StepKind[] = [];
  run.ends.forEach((_, index) => {
    const step = stepEvents(run, index);
    const change = step.find(changes);
    lines.push(lineAt(run, index));
    kinds.push(kindOf(change));
  });
  return { narration, lines, kinds, markers: keyMoments(run) };
}

/** Replaces `{n:id}` marks with the names the canvas shows. */
export function labeller(nodes: GraphNode[]) {
  const names = new Map(nodes.map((n) => [n.id, nameOf(n)]));
  return (text: string) => text.replace(/\{n:(\d+)\}/g, (_, id) => names.get(Number(id)) ?? id);
}

export { num } from "@/components/Graph/runMarkShapes";

/** The adapter's pseudocode and display name. */
export function algorithmInfo(algorithm: string) {
  const adapter = algorithmRegistry.get(algorithm)!;
  return { name: adapter.metadata.name, pseudocode: adapter.pseudocode };
}
