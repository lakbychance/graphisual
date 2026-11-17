import { describe, expect, it } from "vitest";
import "@/algorithms";
import { runAlgorithm } from "../engine";
import * as configs from "./configs";
import { COMPACT, pageGraph, scatterGraph } from "./shared";
import type { LiveConfig } from "./types";

const all = Object.values(configs) as LiveConfig[];
const labels = (run: ReturnType<typeof runAlgorithm>) => run.pathLabels.join("");
const experiment = (live: LiveConfig, on: boolean) => {
  const graph = live.limits.experiment.graph(on);
  return live.limits.experiment.runs.map((r) => runAlgorithm(r.algorithmId, { ...graph, start: r.start ?? graph.start }));
};

describe("live configs", () => {
  it("covers all eight algorithms", () => {
    expect(all.map((c) => c.algorithmId).sort()).toEqual(
      ["bellman-ford", "bfs", "bfs-pathfinding", "cycle-detection", "dfs", "dfs-pathfinding", "dijkstra", "prims"],
    );
  });

  it.each(all)("$algorithmId runs on its page graph and its lit lines exist", (live) => {
    const run = runAlgorithm(live.algorithmId, pageGraph(live, COMPACT));
    expect(run.error).toBeUndefined();
    expect(run.frames.length).toBeGreaterThan(3);
    for (const map of [live.lines, live.steps]) {
      const limit = map === live.lines ? live.pseudocode.length : 6;
      for (const index of Object.values(map).flat()) expect(index).toBeLessThan(limit);
    }
    if (live.kind === "route") expect(run.cost).not.toBeNull();
    if (live.kind === "cycle") expect(run.cycle).toBe(true);
    if (live.kind === "traversal" || live.kind === "tree") expect(run.frames.at(-1)?.visited.size).toBe(6);
  });

  it.each(all)("$algorithmId always gets a usable new graph", (live) => {
    for (const narrow of [false, true]) {
      for (let i = 0; i < 100; i++) {
        const graph = scatterGraph(narrow, live);
        const run = runAlgorithm(live.algorithmId, graph);
        // "No cycle" is reported as an error by the adapter; on this page it is a valid outcome.
        if (live.kind !== "cycle") expect(run.error).toBeUndefined();
        if (live.kind === "route") expect(run.cost).not.toBeNull();
        if (live.kind === "traversal" || live.kind === "tree") expect(run.frames.at(-1)?.visited.size).toBe(6);
      }
    }
  });
});

describe("experiments", () => {
  it("a negative edge makes Dijkstra's wrong and leaves Bellman-Ford right", () => {
    const [dijkstra, bellmanFord] = experiment(configs.dijkstra, true);
    expect([labels(dijkstra), dijkstra.cost]).toEqual(["ABD", 3]);
    expect([labels(bellmanFord), bellmanFord.cost]).toEqual(["ACBD", 2]);
    const [plainA, plainB] = experiment(configs.dijkstra, false);
    expect(plainA.cost).toBe(plainB.cost);
  });

  it("weights make BFS pathfinding miss the cheapest route", () => {
    const [bfs, dijkstra] = experiment(configs.bfsPathfinding, true);
    expect(bfs.cost).toBeGreaterThan(dijkstra.cost!);
    const [plainBfs, plainDijkstra] = experiment(configs.bfsPathfinding, false);
    expect(plainBfs.cost).toBe(plainDijkstra.cost);
  });

  it("DFS pathfinding takes the long way when a direct edge exists", () => {
    const [dfs, bfs] = experiment(configs.dfsPathfinding, true);
    expect(labels(dfs)).toBe("ABCD");
    expect(labels(bfs)).toBe("AED");
    const [plainDfs, plainBfs] = experiment(configs.dfsPathfinding, false);
    expect(labels(plainDfs)).toBe(labels(plainBfs));
  });

  it("BFS and DFS visit every node, in different orders", () => {
    const [bfs, dfs] = experiment(configs.bfs, false).map((run) => run.frames.at(-1)!.order);
    expect(bfs).toHaveLength(6);
    expect(dfs).toHaveLength(6);
    expect(bfs).not.toEqual(dfs);
  });

  it("Prim's spans only its own half of a cut graph, and the same weight from either start otherwise", () => {
    const weight = (run: ReturnType<typeof runAlgorithm>, on: boolean) => {
      const graph = configs.prims.limits.experiment.graph(on);
      return [...run.frames.at(-1)!.traversed].reduce((sum, i) => sum + graph.edges[i].weight, 0);
    };
    const cut = experiment(configs.prims, true);
    expect(cut.map((run) => run.frames.at(-1)!.visited.size)).toEqual([3, 3]);
    const whole = experiment(configs.prims, false);
    expect(whole.map((run) => run.frames.at(-1)!.visited.size)).toEqual([6, 6]);
    expect(weight(whole[0], false)).toBe(weight(whole[1], false));
  });

  it("one edge's direction decides whether there is a cycle", () => {
    expect(experiment(configs.cycleDetection, true)[0].cycle).toBe(true);
    expect(experiment(configs.cycleDetection, false)[0].cycle).toBe(false);
  });
});
