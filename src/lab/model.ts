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
import { EDGE_TYPE } from "@/constants/graph";
import type { GraphEdge, GraphNode } from "@/components/Graph/types";
import {
  generateCycleWithDeadEnd, generateWeighted, graphFromSpec, type GeneratedGraph,
} from "@/utils/graph/graphGenerator";
import { buildRun } from "@/utils/visualization/buildRun";
import { lineAt, rolesAt, type NodeRole, type Run } from "@/utils/visualization/runView";
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

export interface NodeState {
  role: Role;
  /** Distance or cost so far (undefined: ∞), for the algorithms that keep one. */
  value?: number;
  /** The value before this step, when this step changed it. */
  old?: number;
  /** This step changed this node. */
  changed: boolean;
  /** Depth-first discovery and finish times. */
  d?: number;
  f?: number;
  /** Place in the queue or stack, 1 = taken next. */
  slot?: number;
}

/**
 * An edge drawn over the graph's own.
 * - `change`: the edge this step looked at or walked (back up, for a backtrack)
 * - `tentative`: a best-so-far parent edge that may still change
 * - `tree`: a final parent edge, or a depth-first tree edge out of a finished node
 * - `branch`: a depth-first tree edge into a node still in progress (the current branch)
 * - `back`, `forward`, `cross`: how a depth-first search classifies a non-tree edge
 */
export type MarkKind = "change" | "tentative" | "tree" | "branch" | EdgeClass;

export interface EdgeMark {
  from: number;
  to: number;
  kind: MarkKind;
}

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

export const keepsValues = (algorithm: string) => ["dijkstra", "prims", "bellman-ford"].includes(algorithm);
const depthFirst = (algorithm: string) => ["dfs", "dfs-pathfinding", "cycle-detection"].includes(algorithm);

const stepEvents = (run: Run, index: number) => run.events.slice(index > 0 ? run.ends[index - 1] : 0, run.ends[index]);

/** Edges of the graph once each: an undirected edge appears in both its nodes' lists. */
function edgeList(edges: Map<number, GraphEdge[]>): GraphEdge[] {
  const seen = new Set<string>();
  const list: GraphEdge[] = [];
  for (const out of edges.values()) {
    for (const edge of out) {
      const undirected = edge.type === EDGE_TYPE.UNDIRECTED;
      const key = undirected ? [Math.min(edge.from, edge.to), Math.max(edge.from, edge.to)].join("-") : `${edge.from}>${edge.to}`;
      if (seen.has(key)) continue;
      seen.add(key);
      list.push(edge);
    }
  }
  return list;
}

/**
 * How a stack-based depth-first search's edges classify once both their ends are visited: the
 * parent edge is a tree edge; an edge between a node and one of its ancestors is a back edge
 * (pointing up) or a forward edge (pointing down); any other is a cross edge. `looked` holds the
 * edges (`from-to`) the search has checked or pushed along so far.
 */
function deriveClasses(frame: Frame, edges: Map<number, GraphEdge[]>, looked: Set<string>): Map<string, EdgeClass> {
  const order = new Map(frame.settled.map((id, i) => [id, i]));
  const isAncestor = (a: number, b: number) => {
    for (let at = frame.via.get(b); at !== undefined; at = frame.via.get(at)) if (at === a) return true;
    return false;
  };
  const classes = new Map<string, EdgeClass>();
  for (const edge of edgeList(edges)) {
    const { from, to } = edge;
    if (!order.has(from) || !order.has(to) || from === to) continue;
    // Said once the search has looked along the edge and both its ends are visited.
    if (!looked.has(`${from}-${to}`) && !(edge.type === EDGE_TYPE.UNDIRECTED && looked.has(`${to}-${from}`))) continue;
    const [early, late] = order.get(from)! < order.get(to)! ? [from, to] : [to, from];
    if (frame.via.get(late) === early) {
      classes.set(`${early}-${late}`, "tree");
    } else if (isAncestor(early, late)) {
      if (edge.type === EDGE_TYPE.UNDIRECTED) classes.set(`${late}-${early}`, "back");
      else classes.set(`${from}-${to}`, from === late ? "back" : "forward");
    } else {
      classes.set(`${from}-${to}`, "cross");
    }
  }
  return classes;
}

/** Priority-queue order: cheapest first, ties in the order the algorithm scans nodes. */
function slots(run: Run, frame: Frame): Map<number, number> {
  const rank = (id: number) => {
    const i = run.nodeOrder.indexOf(id);
    return i < 0 ? Infinity : i;
  };
  let order: number[];
  if (run.algorithmId === "dijkstra" || run.algorithmId === "prims") {
    order = [...frame.queue].sort((a, b) => (a.value ?? 0) - (b.value ?? 0) || rank(a.id) - rank(b.id)).map((q) => q.id);
  } else if (run.algorithmId === "dfs" || run.algorithmId === "dfs-pathfinding") {
    order = [...frame.queue].reverse().map((q) => q.id);
  } else {
    order = frame.queue.map((q) => q.id);
  }
  return new Map(order.map((id, i) => [id, i + 1]));
}

/** What step `index` shows. */
export function stepView(run: Run, index: number, nodes: GraphNode[], edges: Map<number, GraphEdge[]>): StepView {
  const end = index < 0 ? 0 : run.ends[index];
  const frame = frameAt(run.events, end);
  const step = index < 0 ? [] : stepEvents(run, index);
  const change = step.find(changes);
  const algorithm = run.algorithmId;
  const valued = keepsValues(algorithm);
  const roles = rolesAt(run, index);
  const finished = new Set(frame.finished);
  const settled = new Set(frame.settled);
  const queued = slots(run, frame);
  const done = frame.answer !== null;

  // Depth-first clock: one tick per visit and per finish.
  const times = new Map<number, { d?: number; f?: number }>();
  if (depthFirst(algorithm)) {
    let clock = 0;
    for (const event of run.events.slice(0, end)) {
      if (event.type === "settle") times.set(event.node, { d: ++clock });
      if (event.type === "finish") times.set(event.node, { ...times.get(event.node), f: ++clock });
    }
  }

  const changedNodes = new Set<number>();
  if (change) {
    if (change.type === "relax") changedNodes.add(change.to);
    if (change.type === "enqueue" || change.type === "settle" || change.type === "finish" || change.type === "start") changedNodes.add(change.node);
    if (change.type === "classify") changedNodes.add(change.to);
  }

  const states = new Map<number, NodeState>();
  for (const { id } of nodes) {
    states.set(id, {
      role: roles.get(id) ?? "unseen",
      value: valued ? frame.dist.get(id) : undefined,
      old: change?.type === "relax" && change.to === id ? change.old : undefined,
      changed: changedNodes.has(id),
      ...times.get(id),
      slot: queued.get(id),
    });
  }

  const marks: EdgeMark[] = [];
  const classes = new Set<EdgeClass>();
  if (depthFirst(algorithm)) {
    const looked = new Set<string>();
    for (const event of run.events.slice(0, end)) {
      if (event.type === "skip") looked.add(`${event.from}-${event.to}`);
      if (event.type === "enqueue" && event.from !== undefined) looked.add(`${event.from}-${event.node}`);
    }
    const classified = algorithm === "cycle-detection" ? frame.edgeClass : deriveClasses(frame, edges, looked);
    for (const [key, kind] of classified) {
      const [from, to] = key.split("-").map(Number);
      if (kind === "tree") marks.push({ from, to, kind: settled.has(to) && !finished.has(to) && !done ? "branch" : "tree" });
      else {
        marks.push({ from, to, kind });
        classes.add(kind);
      }
    }
  } else if (valued) {
    for (const [to, from] of frame.prev) {
      marks.push({ from, to, kind: settled.has(to) || done ? "tree" : "tentative" });
    }
  } else {
    for (const [to, from] of frame.via) marks.push({ from, to, kind: "tree" });
    for (const [to, from] of frame.prev) if (!settled.has(to)) marks.push({ from, to, kind: "tentative" });
  }

  // The edge this step changes something along.
  let walk: { from: number; to: number } | null = null;
  if (change?.type === "relax" || change?.type === "classify") walk = { from: change.from, to: change.to };
  else if (change?.type === "enqueue" && change.from !== undefined) walk = { from: change.from, to: change.node };
  else if (change?.type === "settle" && change.via !== undefined) walk = { from: change.via, to: change.node };
  else if (change?.type === "finish" && change.parent !== undefined) walk = { from: change.node, to: change.parent };
  if (walk && !done) marks.push({ ...walk, kind: "change" });

  return { index, frame, change, nodes: states, marks, classes: [...classes], valued };
}

/* -------------------------------------------------------- the whole run */

/** Something worth finding on the timeline. */
export interface Marker {
  index: number;
  kind: "found" | "negative" | "back" | "round";
  label: string;
}

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
export function summarise(run: Run, nodes: GraphNode[], edges: Map<number, GraphEdge[]>): RunSummary {
  const name = labeller(nodes);
  const narration = narrate(run.events, run.algorithmId).map(name);
  const lines: Array<number | null> = [];
  const kinds: StepKind[] = [];
  const markers: Marker[] = [];
  let foundBack = new Set<string>();
  run.ends.forEach((_, index) => {
    const step = stepEvents(run, index);
    const change = step.find(changes);
    lines.push(lineAt(run, index));
    kinds.push(kindOf(change));
    // Bellman-Ford: where each round after the first begins.
    const round = step[0]?.group ?? 0;
    const rounds = run.algorithmId === "bellman-ford" && change?.type !== "answer";
    if (rounds && index > 0 && round > 1 && stepEvents(run, index - 1)[0]?.group !== round) {
      markers.push({ index, kind: "round", label: `Round ${round}` });
    }
    for (const event of step) {
      if (event.type === "relax" && event.weight < 0) {
        markers.push({ index, kind: "negative", label: "Negative edge" });
        break;
      }
    }
    const found = step.some((e) => (e.type === "settle" && e.target && e.via !== undefined) || (e.type === "classify" && e.kind === "back" && run.algorithmId === "cycle-detection"));
    if (found) markers.push({ index, kind: "found", label: run.algorithmId === "cycle-detection" ? "Loop found" : "Destination found" });
    if (run.algorithmId === "dfs" || run.algorithmId === "dfs-pathfinding") {
      const back = new Set(stepView(run, index, nodes, edges).marks.filter((m) => m.kind === "back").map((m) => `${m.from}-${m.to}`));
      if ([...back].some((key) => !foundBack.has(key))) markers.push({ index, kind: "back", label: "Back edge" });
      foundBack = back;
    }
  });
  return { narration, lines, kinds, markers };
}

/** Replaces `{n:id}` marks with the names the canvas shows. */
export function labeller(nodes: GraphNode[]) {
  const names = new Map(nodes.map((n) => [n.id, nameOf(n)]));
  return (text: string) => text.replace(/\{n:(\d+)\}/g, (_, id) => names.get(Number(id)) ?? id);
}

/** A value as the narration writes it. */
export const num = (value: number | undefined) =>
  value === undefined || value === Infinity ? "∞" : value < 0 ? `−${-value}` : String(value);

/** The adapter's pseudocode and display name. */
export function algorithmInfo(algorithm: string) {
  const adapter = algorithmRegistry.get(algorithm)!;
  return { name: adapter.metadata.name, pseudocode: adapter.pseudocode };
}
