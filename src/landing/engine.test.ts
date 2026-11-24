/**
 * Oracle check for the landing pages (see the harness's TESTING.md). Until task 0.5, the pages
 * run algorithms through their own engine (`runAlgorithm`, built on `legacyExecute()`). This checks it
 * shows the event answer that the engine's oracle checks verify, on every page graph and every
 * experiment graph (switch on and off), and that each page lights only lines and steps it has.
 * The golden files record those answers in words, so together they hold each page's claims.
 * TEMPORARY: delete this file with `src/landing/engine.ts` in task 0.5.
 */
import { describe, expect, it } from "vitest";
import { algorithmRegistry, type EdgeInfo } from "@/algorithms";
import type { AlgorithmEvent, AnswerEvent } from "@/algorithms/engine";
import { runAlgorithm, type LabGraph } from "./engine";
import * as configs from "./live/configs";
import { COMPACT, pageGraph } from "./live/shared";
import type { LiveConfig } from "./live/types";

const all = Object.values(configs) as LiveConfig[];
/** Every page lists six how-it-works steps. */
const STEPS = 6;

/** The event answer for a landing graph, from the same adapter. */
function eventAnswer(algorithmId: string, graph: LabGraph) {
  const adjacencyList = new Map<number, EdgeInfo[]>(graph.nodes.map((n) => [n.id, []]));
  for (const { from, to, weight, directed } of graph.edges) {
    const type = directed ? "directed" : "undirected";
    adjacencyList.get(from)!.push({ from, to, weight, type });
    if (!directed) adjacencyList.get(to)!.push({ from: to, to: from, weight, type });
  }
  const input = { adjacencyList, nodes: graph.nodes.map((n) => ({ id: n.id })), startNodeId: graph.start, endNodeId: graph.end };
  const events: AlgorithmEvent[] = algorithmRegistry.get(algorithmId)!.events(input);
  return { events, answer: events.find((e): e is AnswerEvent => e.type === "answer")! };
}

function expectSameAnswer(algorithmId: string, graph: LabGraph, at: string) {
  const run = runAlgorithm(algorithmId, graph);
  const { events, answer } = eventAnswer(algorithmId, graph);
  const last = run.frames[run.frames.length - 1];
  const label = (id: number) => graph.nodes[id].label;
  let missing: boolean;
  if (answer.kind === "route") {
    const path = answer.path ?? [];
    expect(run.pathLabels, `${at}: route`).toEqual(path.length > 1 ? path.map(label) : []);
    if (answer.cost !== undefined) expect(run.cost, `${at}: cost`).toBe(answer.cost);
    missing = answer.path === null;
  } else if (answer.kind === "cycle") {
    expect(run.cycle, `${at}: cycle`).toBe(answer.cycle !== null);
    expect([...last.pathNodes].sort(), `${at}: nodes on the cycle`).toEqual([...new Set(answer.cycle ?? [])].sort());
    missing = answer.cycle === null;
  } else if (answer.kind === "tree") {
    const weight = [...last.traversed].reduce((sum, i) => sum + graph.edges[i].weight, 0);
    expect(weight, `${at}: tree weight`).toBe(answer.total);
    missing = answer.unreached.length > 0;
  } else {
    missing = false;
  }
  const settled = events.flatMap((e) => (e.type === "settle" ? [e.node] : []));
  if (answer.kind === "order" || answer.kind === "tree") expect(last.order, `${at}: visit order`).toEqual(settled);
  expect(run.error !== undefined, `${at}: error ${run.error}`).toBe(missing);
}

describe("oracle check: the answer the landing pages show (temporary, until task 0.5)", () => {
  it.each(all)("$algorithmId: its page graph and experiment graphs show the event answer", (live) => {
    expectSameAnswer(live.algorithmId, pageGraph(live, COMPACT), "page graph");
    const { experiment } = live.limits;
    for (const on of [true, false]) {
      const graph = experiment.graph(on);
      for (const r of experiment.runs) {
        expectSameAnswer(r.algorithmId, { ...graph, start: r.start ?? graph.start }, `${r.name}, switch ${on ? "on" : "off"}`);
      }
    }
  });

  it.each(all)("$algorithmId: lights only pseudocode lines and steps the page has", (live) => {
    for (const index of Object.values(live.lines).flat()) expect(index).toBeLessThan(live.pseudocode.length);
    for (const index of Object.values(live.steps).flat()) expect(index).toBeLessThan(STEPS);
  });
});
