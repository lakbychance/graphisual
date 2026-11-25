/**
 * A moment of a run carried in a URL, so a link opens the app at that exact step:
 *
 *   `/?algorithm=<id>&graph=<graph code>&from=<node>&to=<node>&step=<n>`
 *
 * It extends the graph links the landing pages hand over (`?algorithm=` alone, or with `&graph=`),
 * which keep working as before: every parameter after `algorithm` is optional.
 *
 * - `graph`: the graph code (see `graphLink.ts`). Missing or malformed: the algorithm's own graph.
 *   `from`, `to` and `step` name nodes and a run of the linked graph, so they only count with it:
 *   - a `graph` that does not decode: they are ignored, and the app opens as with `?algorithm=`;
 *   - no `graph`: they count only for the algorithms whose own graph is always the same
 *     (Dijkstra, Bellman-Ford, cycle detection). The others draw a new random graph on each load,
 *     where the same link would land on a different moment, so they are ignored there.
 * - `from`, `to`: nodes by the name the canvas shows (their label, or their id when unlabelled).
 *   `to` only for algorithms that need a destination; elsewhere it is ignored.
 * - `step`: the step counter as the learner reads it, 1 (the Start step) to N. Missing or not a
 *   whole number: 1. Out of range (0 included): the nearest step, 1 or N.
 *
 * The value is untrusted. Whatever cannot be honoured is dropped and the rest kept: an unknown node
 * leaves the app waiting for a tap, as does a run the app would refuse (no route, ...).
 */
import { algorithmRegistry, AlgorithmType } from "../../algorithms";
import type { GraphEdge, GraphNode } from "../../components/Graph/types";
import { EDGE_TYPE } from "../../constants/graph";
import {
  generateCycleWithDeadEnd, generateRandomGraph, generateWeighted, graphFromSpec, type GeneratedGraph, type GraphSpec,
} from "../graph/graphGenerator";
import { decodeGraphLink, encodeGraphLink } from "../graph/graphLink";
import { buildRun } from "./buildRun";

/** A moment of a run: the graph, the algorithm, its endpoints and the step on screen. */
export interface Moment {
  algorithm: string;
  graph: GeneratedGraph;
  /** Node ids; null when not chosen. */
  from: number | null;
  to: number | null;
  /** The step counter, 1 to N; null when no run is on screen. */
  step: number | null;
}

/** The graph an algorithm opens with when the link carries none. */
const generatedGraph: Record<string, () => GeneratedGraph> = {
  "dijkstra": generateWeighted,
  "bellman-ford": generateWeighted,
  "prims": () => generateRandomGraph({ nodeCount: 6, edgeDensity: 0.5, directed: false, weighted: true, minWeight: 1, maxWeight: 10, layout: "circular" }),
  "bfs": () => generateRandomGraph({ nodeCount: 6, edgeDensity: 0.4, directed: false, weighted: false, layout: "circular" }),
  "dfs": () => generateRandomGraph({ nodeCount: 6, edgeDensity: 0.4, directed: false, weighted: false, layout: "circular" }),
  "bfs-pathfinding": () => generateRandomGraph({ nodeCount: 6, edgeDensity: 0.4, directed: false, weighted: false, layout: "circular" }),
  "dfs-pathfinding": () => generateRandomGraph({ nodeCount: 6, edgeDensity: 0.4, directed: false, weighted: false, layout: "circular" }),
  "cycle-detection": generateCycleWithDeadEnd,
};

/** Algorithms whose own graph is the same on every load, so a link without `graph` can name its nodes. */
const FIXED_GRAPH = new Set(["dijkstra", "bellman-ford", "cycle-detection"]);

/** The name the canvas shows for a node. */
const nameOf = (node: GraphNode) => node.label || String(node.id);

export const needsDestination = (algorithm: string) =>
  algorithmRegistry.get(algorithm)?.metadata.type === AlgorithmType.PATHFINDING;

/**
 * The graph as a spec the graph code carries, in the order the algorithms scan it (so ties break
 * the same way), with each node's edges in the same order. Ids are renumbered by the code, so an
 * unlabelled node whose id would change keeps its name as a label.
 */
function specOf({ nodes, edges }: GeneratedGraph): { spec: GraphSpec; names: Map<number, string> } {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const order = [...new Set([...edges.keys(), ...byId.keys()])].filter((id) => byId.has(id));
  const index = new Map(order.map((id, i) => [id, i]));
  const names = new Map(order.map((id) => [id, nameOf(byId.get(id)!)]));
  const specNodes = order.map((id, i) => {
    const { x, y, label } = byId.get(id)!;
    return { x, y, label: label || (id === i + 1 ? undefined : String(id)) };
  });

  // An undirected edge sits in both its nodes' lists and the code adds it to both at once, so it
  // goes out when it is next in both lists. If the lists disagree, the first waiting edge goes.
  const queues = order.map((id) => (edges.get(id) ?? []).filter((e) => index.has(e.to)));
  const isReverse = (a: GraphEdge, b: GraphEdge | undefined) =>
    b !== undefined && b.from === a.to && b.to === a.from && b.type === EDGE_TYPE.UNDIRECTED;
  const ready = (queue: GraphEdge[]) =>
    queue.length > 0 && (queue[0].type !== EDGE_TYPE.UNDIRECTED || isReverse(queue[0], queues[index.get(queue[0].to)!][0]));
  const specEdges: GraphSpec["edges"] = [];
  for (;;) {
    const next = queues.findIndex(ready);
    const i = next >= 0 ? next : queues.findIndex((q) => q.length > 0);
    if (i < 0) break;
    const edge = queues[i].shift()!;
    const undirected = edge.type === EDGE_TYPE.UNDIRECTED;
    if (undirected) {
      const partner = queues[index.get(edge.to)!];
      const j = partner.findIndex((e) => isReverse(edge, e));
      if (j >= 0) partner.splice(j, 1);
    }
    specEdges.push({ from: i, to: index.get(edge.to)!, weight: edge.weight, directed: !undirected });
  }
  return { spec: { nodes: specNodes, edges: specEdges }, names };
}

/** The nodes in the order the algorithms scan them, each with its edges, by the names the canvas shows. */
function seen({ nodes, edges }: GeneratedGraph): string[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const name = (id: number) => (byId.has(id) ? nameOf(byId.get(id)!) : `?${id}`);
  return [...new Set([...edges.keys(), ...byId.keys()])]
    .filter((id) => byId.has(id))
    .map((id) => [name(id), ...(edges.get(id) ?? []).map((e) => `${name(e.to)} ${e.weight} ${e.type}`)].join("; "));
}

/**
 * The link to a moment, as a path from the app's root; null when a link cannot carry it exactly
 * (a graph the code cannot hold, such as a label with `,` `;` or `|`, or two nodes shown by the
 * same name), checked by opening the link and comparing.
 */
export function encodeStepLink(moment: Moment): string | null {
  const { algorithm, graph, from, to, step } = moment;
  const { spec, names } = specOf(graph);
  const params = new URLSearchParams({ algorithm, graph: encodeGraphLink(spec) });
  if (from !== null) params.set("from", names.get(from) ?? String(from));
  if (to !== null) params.set("to", names.get(to) ?? String(to));
  if (step !== null) params.set("step", String(step));
  const link = `/?${params}`;

  const opened = decodeStepLink(`?${params}`);
  const nameIn = (g: GeneratedGraph, id: number | null) => {
    const node = id === null ? undefined : g.nodes.find((n) => n.id === id);
    return node ? nameOf(node) : null;
  };
  const same = opened !== null
    && opened.algorithm === algorithm
    && seen(opened.graph).join("\n") === seen(graph).join("\n")
    && nameIn(opened.graph, opened.from) === nameIn(graph, from)
    && nameIn(opened.graph, opened.to) === nameIn(graph, to)
    && opened.step === step;
  return same ? link : null;
}

/** The moment a link asks for, as far as it can be honoured; null when it names no known algorithm. */
export function decodeStepLink(search: string): Moment | null {
  const params = new URLSearchParams(search);
  const algorithm = params.get("algorithm") ?? "";
  if (!algorithmRegistry.get(algorithm)) return null;

  const linked = params.has("graph") ? decodeGraphLink(params.get("graph")!) : null;
  const graph = linked ? graphFromSpec(linked) : generatedGraph[algorithm]?.();
  if (!graph) return null;
  // The nodes and step belong to the linked graph, or to an own graph that is always the same.
  const named = linked !== null || (!params.has("graph") && FIXED_GRAPH.has(algorithm));

  // A name two nodes share points at neither.
  const nodeNamed = (name: string | null) => {
    const matches = name === null ? [] : graph.nodes.filter((n) => nameOf(n) === name);
    return matches.length === 1 ? matches[0].id : null;
  };
  const from = named ? nodeNamed(params.get("from")) : null;
  const to = from !== null && needsDestination(algorithm) ? nodeNamed(params.get("to")) : null;
  const moment: Moment = { algorithm, graph, from, to, step: null };
  if (from === null || (needsDestination(algorithm) && to === null)) return moment;

  const built = buildRun(algorithm, graph.nodes, graph.edges, from, to ?? undefined);
  if (!built || !("run" in built)) return moment;
  const total = built.run.ends.length;
  const asked = Number(params.get("step") ?? "");
  const step = params.get("step") && Number.isInteger(asked) ? Math.max(1, Math.min(asked, total)) : 1;
  return { ...moment, step };
}
