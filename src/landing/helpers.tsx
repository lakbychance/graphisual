import type { ReactNode } from "react";
import { encodeGraphLink } from "@/utils/graph/graphLink";
import { messageParts, type Frame, type LabGraph, type Run } from "./engine";
import type { LiveConfig, PhaseMap } from "./live/types";

export interface AlgorithmLandingProps {
  subtitle: string;
  howItWorks: { description: string[]; steps: string[] };
  /** Each as "Name — what it does". */
  useCases: { text: string }[];
  faq: { question: string; answer: string }[];
  live: LiveConfig;
}

export const nameOf = (graph: LabGraph, id: number) => graph.nodes.find((n) => n.id === id)?.label ?? String(id);
const treeWeight = (frame: Frame, graph: LabGraph) => [...frame.traversed].reduce((sum, i) => sum + graph.edges[i].weight, 0);
const cycleNodes = (frame: Frame, graph: LabGraph) => [...frame.pathNodes].map((id) => nameOf(graph, id)).sort().join(", ");
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** Which entries of a phase map a frame lights up. */
export function lit(map: PhaseMap, frame: Frame): number[] {
  if (frame.phase === "ready") return map.ready;
  if (frame.phase === "answer") return map.answer;
  return /Found destination|Cycle detected/.test(frame.message) ? map.found : map.explore;
}

/** The app link that opens a graph with the page's algorithm selected. */
export function appLink(algorithmId: string, graph: LabGraph): string {
  const indexOf = (id: number) => graph.nodes.findIndex((n) => n.id === id);
  const link = encodeGraphLink({
    nodes: graph.nodes.map((n) => ({ x: n.x, y: n.y, label: n.label })),
    edges: graph.edges.map((e) => ({ from: indexOf(e.from), to: indexOf(e.to), weight: e.weight, directed: Boolean(e.directed) })),
  });
  return `/?algorithm=${algorithmId}&graph=${encodeURIComponent(link)}`;
}

/** What a whole run came to, as a sentence. */
export function outcome(live: LiveConfig, run: Run, graph: LabGraph): ReactNode {
  const last = run.frames[run.frames.length - 1];
  if (live.kind === "route") {
    if (run.cost === null) return <>There is no route between the two nodes.</>;
    const route = <b>{run.pathLabels.join(" to ")}</b>;
    return live.weighted ? <>The route is {route}, at cost <b>{run.cost}</b>.</> : <>The route is {route}, <b>{plural(last.path.size, "edge")}</b> long.</>;
  }
  if (live.kind === "tree") return <>The tree joins <b>{plural(last.visited.size, "node")}</b> with total weight <b>{treeWeight(last, graph)}</b>.</>;
  if (live.kind === "cycle") return run.cycle ? <>It found a cycle through <b>{cycleNodes(last, graph)}</b>.</> : <>There is no cycle in this graph.</>;
  return <>It visited <b>{last.order.map((id) => nameOf(graph, id)).join(", ")}</b>, in that order.</>;
}

export function Message({ frame, graph }: { frame: Frame; graph: LabGraph }) {
  return <>{messageParts(frame.message, graph).map((part, i) => (part.bold ? <b key={i}>{part.text}</b> : <span key={i}>{part.text}</span>))}</>;
}

export interface Entry { name: string; graph: LabGraph; run: Run }

/** What one run of an experiment came to, and whether that is a wrong answer. */
export function verdict(live: LiveConfig, entry: Entry, entries: Entry[]): { node: ReactNode; wrong: boolean } {
  const { run, graph } = entry;
  const last = run.frames[run.frames.length - 1];
  if (live.kind === "traversal") return { node: <>Visits <b>{last.order.map((id) => nameOf(graph, id)).join(", ")}</b>.</>, wrong: false };
  if (live.kind === "cycle") {
    return run.cycle
      ? { node: <>Finds a cycle through <b>{cycleNodes(last, graph)}</b>.</>, wrong: false }
      : { node: <><b>No cycle.</b> Every path ends without returning to a node that is still being explored.</>, wrong: false };
  }
  if (live.kind === "tree") {
    const reached = last.visited.size;
    return reached === graph.nodes.length
      ? { node: <>Joins all {reached} nodes. <b>Total weight {treeWeight(last, graph)}.</b></>, wrong: false }
      : { node: <>Reaches <b>{reached} of {graph.nodes.length} nodes</b>, total weight {treeWeight(last, graph)}. The rest cannot be joined.</>, wrong: true };
  }
  const byEdges = live.limits.experiment.measure === "edges";
  const measure = (e: Entry) => (e.run.cost === null ? Infinity : byEdges ? e.run.frames[e.run.frames.length - 1].path.size : e.run.cost);
  const value = measure(entry);
  const best = Math.min(...entries.map(measure));
  if (value === Infinity) return { node: <>Finds no route.</>, wrong: false };
  const route = <b>{run.pathLabels.join(" to ")}</b>;
  if (byEdges) {
    return value > best
      ? { node: <>Returns {route}, {plural(value, "edge")}. A route with {best} exists.</>, wrong: true }
      : { node: <>Finds {route}, {plural(value, "edge")}, the shortest route.</>, wrong: false };
  }
  return value > best
    ? { node: <>Returns {route} at cost {value}. A route costing {best} exists.</>, wrong: true }
    : { node: <>Finds {route} at cost {value}, the cheapest route.</>, wrong: false };
}
