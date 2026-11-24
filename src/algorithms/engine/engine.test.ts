/**
 * The event engine's checks (see the harness's TESTING.md): oracle, rule and scrub checks on
 * the seeded random suite, and the golden narration file per algorithm.
 */
import { describe, it, expect } from "vitest";
import dijkstraAdapter from "../adapters/dijkstra";
import bellmanFordAdapter from "../adapters/bellmanFord";
import bfsAdapter from "../adapters/bfs";
import dfsAdapter from "../adapters/dfs";
import bfsPathfindingAdapter from "../adapters/bfs-pathfinding";
import dfsPathfindingAdapter from "../adapters/dfs-pathfinding";
import cycleDetectionAdapter from "../adapters/cycleDetection";
import primsAdapter from "../adapters/prims";
import type { AlgorithmAdapter, AlgorithmInput } from "../types";
import { createAdjacencyList } from "../adapters/__tests__/testUtils";
import {
  applyEvent, emptyFrame, frameAt, narrate, type AlgorithmEvent, type AnswerEvent, type Frame,
} from ".";
import { asUndirected, largeGraph, randomGraphs, withNegativeWeights, type RandomGraph } from "./__tests__/randomGraphs";
import {
  bruteForceDistances, hasCycle, hasReachableNegativeCycle, hopCounts, kruskalWeight, reachable,
} from "./__tests__/oracles";
import {
  addsLightestCrossingEdge, bfsDepthNeverDecreases, dfsTimesNest, groupsOnlyIncrease, pointsAtPseudocode,
  relaxOnlyLowers, settlesOnceInOrder, type Rule,
} from "./__tests__/rules";

const suite = [...randomGraphs(200), largeGraph()];
/** Prim's refuses directed edges, so it runs on the suite made undirected. */
const undirectedSuite = suite.map(asUndirected);
/** Bellman-Ford also runs where some weights are negative. */
const signedSuite = [...suite, ...suite.map(withNegativeWeights)];

/** Algorithms on the event engine, with the graphs they run on and the rules their event streams obey. */
const ported: Array<{ adapter: AlgorithmAdapter; graphs: RandomGraph[]; rules: Record<string, Rule> }> = [
  { adapter: dijkstraAdapter, graphs: suite, rules: { pointsAtPseudocode, groupsOnlyIncrease, relaxOnlyLowers, settlesOnceInOrder } },
  { adapter: bellmanFordAdapter, graphs: signedSuite, rules: { pointsAtPseudocode, groupsOnlyIncrease, relaxOnlyLowers } },
  { adapter: bfsAdapter, graphs: suite, rules: { pointsAtPseudocode, groupsOnlyIncrease, bfsDepthNeverDecreases } },
  { adapter: bfsPathfindingAdapter, graphs: suite, rules: { pointsAtPseudocode, groupsOnlyIncrease, bfsDepthNeverDecreases } },
  { adapter: dfsAdapter, graphs: suite, rules: { pointsAtPseudocode, groupsOnlyIncrease, dfsTimesNest } },
  { adapter: dfsPathfindingAdapter, graphs: suite, rules: { pointsAtPseudocode, groupsOnlyIncrease, dfsTimesNest } },
  { adapter: cycleDetectionAdapter, graphs: suite, rules: { pointsAtPseudocode, groupsOnlyIncrease, dfsTimesNest } },
  { adapter: primsAdapter, graphs: undirectedSuite, rules: { pointsAtPseudocode, groupsOnlyIncrease, relaxOnlyLowers, addsLightestCrossingEdge } },
];

const eventsOf = (adapter: AlgorithmAdapter, input: AlgorithmInput) => adapter.events!(input);

function answerOf<K extends AnswerEvent["kind"]>(events: AlgorithmEvent[], kind: K) {
  return events.find((e): e is Extract<AnswerEvent, { kind: K }> => e.type === "answer" && e.kind === kind);
}

const settledIn = (events: AlgorithmEvent[]) => events.flatMap((e) => (e.type === "settle" ? [e.node] : []));

/** Checks the route runs from start to end along real edges; returns its weight (cheapest edge per hop). */
function expectRealRoute(seed: number, input: AlgorithmInput, path: number[]): number {
  expect([path[0], path[path.length - 1]], `seed ${seed}: route ends`).toEqual([input.startNodeId, input.endNodeId]);
  expect(new Set(path).size, `seed ${seed}: route repeats no node`).toBe(path.length);
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const weights = (input.adjacencyList.get(path[i - 1]) ?? []).filter((e) => e.to === path[i]).map((e) => e.weight);
    expect(weights.length, `seed ${seed}: edge ${path[i - 1]}→${path[i]} exists`).toBeGreaterThan(0);
    total += Math.min(...weights);
  }
  return total;
}

describe("oracle check", () => {
  it("Dijkstra's distances and route match brute-force shortest paths", () => {
    for (const { seed, input } of suite) {
      const events = eventsOf(dijkstraAdapter, input);
      const best = bruteForceDistances(input);
      const end = input.endNodeId!;
      const answer = answerOf(events, "route");

      for (const e of events) {
        if (e.type === "settle") expect(e.value, `seed ${seed}: distance of ${e.node}`).toBe(best.get(e.node));
      }
      if (!best.has(end)) {
        expect(answer?.path, `seed ${seed}: no route exists`).toBeNull();
        continue;
      }
      expect(answer?.cost, `seed ${seed}: route cost`).toBe(best.get(end));
      expect(expectRealRoute(seed, input, answer?.path ?? []), `seed ${seed}: route weight`).toBe(best.get(end));
    }
  });

  it("Bellman-Ford's route matches brute-force shortest paths, and it reports a negative cycle exactly when one is reachable", () => {
    for (const { seed, input } of signedSuite) {
      const answer = answerOf(eventsOf(bellmanFordAdapter, input), "route");
      const end = input.endNodeId!;
      if (input.startNodeId === end) {
        expect(answer?.path, `seed ${seed}: start is the destination`).toEqual([end]);
        continue;
      }
      const negativeCycle = hasReachableNegativeCycle(input);
      expect(answer?.negativeCycle !== undefined, `seed ${seed}: negative cycle`).toBe(negativeCycle);
      if (negativeCycle) continue;
      const best = bruteForceDistances(input);
      if (!best.has(end)) {
        expect(answer?.path, `seed ${seed}: no route exists`).toBeNull();
        continue;
      }
      expect(answer?.cost, `seed ${seed}: route cost`).toBe(best.get(end));
      expect(expectRealRoute(seed, input, answer?.path ?? []), `seed ${seed}: route weight`).toBe(best.get(end));
    }
  });

  for (const adapter of [bfsAdapter, dfsAdapter]) {
    it(`${adapter.metadata.name} visits exactly the nodes reachable from the start, each once`, () => {
      for (const { seed, input } of suite) {
        const events = eventsOf(adapter, input);
        const visited = settledIn(events);
        const expected = reachable(input, input.startNodeId);
        expect(new Set(visited), `seed ${seed}: visited`).toEqual(expected);
        expect(visited.length, `seed ${seed}: each once`).toBe(expected.size);
        const answer = answerOf(events, "order");
        expect(answer?.order, `seed ${seed}: answer order`).toEqual(visited);
        expect(answer?.unreached, `seed ${seed}: unreached`).toEqual(input.nodes.map((n) => n.id).filter((id) => !expected.has(id)));
      }
    });
  }

  it("BFS pathfinding's route has the fewest possible edges", () => {
    for (const { seed, input } of suite) {
      const answer = answerOf(eventsOf(bfsPathfindingAdapter, input), "route");
      const hops = hopCounts(input).get(input.endNodeId!);
      if (hops === undefined) {
        expect(answer?.path, `seed ${seed}: no route exists`).toBeNull();
        continue;
      }
      const path = answer?.path ?? [];
      expectRealRoute(seed, input, path);
      expect(path.length - 1, `seed ${seed}: edges on the route`).toBe(hops);
    }
  });

  it("DFS pathfinding finds a real route exactly when one exists", () => {
    for (const { seed, input } of suite) {
      const answer = answerOf(eventsOf(dfsPathfindingAdapter, input), "route");
      if (!reachable(input, input.startNodeId).has(input.endNodeId!)) {
        expect(answer?.path, `seed ${seed}: no route exists`).toBeNull();
        continue;
      }
      expect(answer?.path, `seed ${seed}: a route exists`).not.toBeNull();
      expectRealRoute(seed, input, answer?.path ?? []);
    }
  });

  it("Cycle detection finds a real cycle exactly when a depth-first colouring does", () => {
    for (const { seed, input } of suite) {
      const cycle = answerOf(eventsOf(cycleDetectionAdapter, input), "cycle")?.cycle ?? null;
      expect(cycle !== null, `seed ${seed}: cycle found`).toBe(hasCycle(input));
      if (!cycle) continue;
      cycle.forEach((from, i) => {
        const to = cycle[(i + 1) % cycle.length];
        expect((input.adjacencyList.get(from) ?? []).some((e) => e.to === to), `seed ${seed}: edge ${from}→${to} exists`).toBe(true);
      });
    }
  });

  it("Prim's tree weighs the same as Kruskal's minimum spanning tree of the start's part of the graph", () => {
    for (const { seed, input } of undirectedSuite) {
      const answer = answerOf(eventsOf(primsAdapter, input), "tree");
      const part = reachable(input, input.startNodeId);
      expect(answer?.total, `seed ${seed}: tree weight`).toBe(kruskalWeight(input));
      expect(answer?.edges.length, `seed ${seed}: tree edges`).toBe(part.size - 1);
      for (const { from, to, weight } of answer?.edges ?? []) {
        const real = (input.adjacencyList.get(from) ?? []).some((e) => e.to === to && e.weight === weight);
        expect(real, `seed ${seed}: edge ${from}–${to} weighs ${weight}`).toBe(true);
      }
      expect(answer?.unreached, `seed ${seed}: left out`).toEqual(input.nodes.map((n) => n.id).filter((id) => !part.has(id)));
    }
  });
});

describe("rule checks", () => {
  for (const { adapter, graphs, rules } of ported) {
    for (const [name, rule] of Object.entries(rules)) {
      it(`${adapter.metadata.name}: ${name}`, () => {
        for (const { seed, input } of graphs) {
          const violation = rule(eventsOf(adapter, input), { pseudocode: adapter.pseudocode!, input });
          expect(violation, `seed ${seed}`).toBeNull();
        }
      });
    }
  }
});

describe("scrub check", () => {
  it("frameAt from cached checkpoints equals replaying from step 0, for every step", () => {
    for (const { adapter, graphs } of ported) {
      for (const { seed, input } of graphs) {
        const events: AlgorithmEvent[] = eventsOf(adapter, input);
        const replayed: Frame[] = [emptyFrame];
        for (const event of events) replayed.push(applyEvent(replayed[replayed.length - 1], event));
        // Scrub backwards first, then forwards, so checkpoints are both built and reused.
        const order = replayed.map((_, i) => i);
        for (const i of [...order].reverse().concat(order)) {
          expect(frameAt(events, i), `${adapter.metadata.id} seed ${seed} step ${i}`).toStrictEqual(replayed[i]);
        }
      }
    }
  });
});

/* ------------------------------------------------------------ golden narration */

const LABELS = ["A", "B", "C", "D", "E", "F"];

interface Lettered {
  input: AlgorithmInput;
  edgeList: string;
}

/** A small graph with lettered nodes (ids are indexes into LABELS). Without `end` it has no destination. */
function lettered(
  edges: Array<[number, number, number]>, size: number, start: number, end?: number,
  { directed = false, weighted = true } = {},
): Lettered {
  const input: AlgorithmInput = {
    adjacencyList: createAdjacencyList(
      LABELS.slice(0, size).map((_, id) => id),
      edges.map(([from, to, weight]) => ({ from, to, weight, type: directed ? "directed" : "undirected" })),
    ),
    nodes: LABELS.slice(0, size).map((_, id) => ({ id })),
    startNodeId: start,
    endNodeId: end,
  };
  const edgeList = edges
    .map(([from, to, weight]) => `${LABELS[from]}${directed ? "→" : "–"}${LABELS[to]}${weighted ? ` ${weight < 0 ? `−${-weight}` : weight}` : ""}`)
    .join(", ");
  return { input, edgeList };
}

const plain = (message: string) => message.replace(/\{n:(\d+)\}/g, (_, id) => LABELS[Number(id)]);

function transcript(adapter: AlgorithmAdapter, title: string, { input, edgeList }: Lettered, levels: Array<"overview" | "every-edge">) {
  const events = eventsOf(adapter, input);
  const ends = input.endNodeId === undefined ? "" : ` to ${LABELS[input.endNodeId]}`;
  const lines = [`## ${title}`, "", `From ${LABELS[input.startNodeId]}${ends}. Edges: ${edgeList}`];
  for (const level of levels) {
    lines.push("", level === "overview" ? "### Overview" : "### Every edge", "");
    narrate(events, level, adapter.metadata.id).forEach((message, i) => lines.push(`${String(i + 1).padStart(2)}. ${plain(message)}`));
  }
  return lines.join("\n");
}

/** A golden file: a title, then transcripts separated by blank lines. */
const golden = (title: string, ...sections: string[]) => [`# ${title}`, "", ...sections.flatMap((s) => [s, ""])].join("\n");

const BOTH: Array<"overview" | "every-edge"> = ["overview", "every-edge"];

/** The classic weighted graph the landing pages use. */
const STANDARD: Array<[number, number, number]> = [
  [0, 1, 4], [0, 2, 2], [2, 1, 1], [1, 3, 5], [2, 4, 9], [3, 4, 2], [3, 5, 3], [4, 5, 6],
];
/** The cycle detection page's directed graph. */
const CYCLE_STANDARD: Array<[number, number, number]> = [
  [0, 1, 1], [0, 2, 1], [1, 3, 1], [3, 4, 1], [4, 2, 1], [2, 1, 1], [3, 5, 1], [4, 5, 1],
];
const unweighted = { weighted: false };

describe("golden narration", () => {
  it("Dijkstra's", async () => {
    const text = golden(
      "Dijkstra's",
      transcript(dijkstraAdapter, "Standard graph", lettered(STANDARD, 6, 0, 5), BOTH),
      transcript(dijkstraAdapter, "A tie", lettered([[0, 1, 2], [0, 2, 2], [1, 3, 1], [2, 3, 3]], 4, 0, 3), ["every-edge"]),
      transcript(dijkstraAdapter, "No route", lettered([[0, 1, 3], [2, 1, 1]], 3, 0, 2, { directed: true }), ["every-edge"]),
      transcript(dijkstraAdapter, "Start is the destination", lettered([[0, 1, 3]], 2, 0, 0), ["overview"]),
    );
    await expect(text).toMatchFileSnapshot("./__golden__/dijkstra.md");
  });

  it("Bellman-Ford", async () => {
    const text = golden(
      "Bellman-Ford",
      transcript(bellmanFordAdapter, "Standard graph", lettered(STANDARD, 6, 0, 5), BOTH),
      transcript(bellmanFordAdapter, "A negative edge", lettered([[0, 1, 2], [0, 2, 5], [2, 1, -4], [1, 3, 1]], 4, 0, 3, { directed: true }), BOTH),
      transcript(bellmanFordAdapter, "A negative cycle", lettered([[0, 1, 1], [1, 2, -2], [2, 1, 1]], 3, 0, 2, { directed: true }), BOTH),
      transcript(bellmanFordAdapter, "No route", lettered([[0, 1, 3], [2, 1, 1]], 3, 0, 2, { directed: true }), ["overview"]),
    );
    await expect(text).toMatchFileSnapshot("./__golden__/bellman-ford.md");
  });

  it("BFS", async () => {
    const text = golden(
      "BFS",
      transcript(bfsAdapter, "Standard graph", lettered(STANDARD, 6, 0, undefined, unweighted), BOTH),
      transcript(bfsAdapter, "Disconnected graph", lettered([[0, 1, 1], [2, 3, 1]], 4, 0, undefined, unweighted), ["overview"]),
    );
    await expect(text).toMatchFileSnapshot("./__golden__/bfs.md");
  });

  it("DFS", async () => {
    const text = golden(
      "DFS",
      transcript(dfsAdapter, "Standard graph", lettered(STANDARD, 6, 0, undefined, unweighted), BOTH),
      transcript(dfsAdapter, "Disconnected graph", lettered([[0, 1, 1], [2, 3, 1]], 4, 0, undefined, unweighted), ["overview"]),
    );
    await expect(text).toMatchFileSnapshot("./__golden__/dfs.md");
  });

  it("BFS pathfinding", async () => {
    const text = golden(
      "BFS pathfinding",
      transcript(bfsPathfindingAdapter, "Standard graph", lettered(STANDARD, 6, 0, 5, unweighted), BOTH),
      transcript(bfsPathfindingAdapter, "No route", lettered([[0, 1, 1], [2, 1, 1]], 3, 0, 2, { directed: true, weighted: false }), ["every-edge"]),
      transcript(bfsPathfindingAdapter, "Start is the destination", lettered([[0, 1, 1]], 2, 0, 0, unweighted), ["overview"]),
    );
    await expect(text).toMatchFileSnapshot("./__golden__/bfs-pathfinding.md");
  });

  it("DFS pathfinding", async () => {
    const text = golden(
      "DFS pathfinding",
      transcript(dfsPathfindingAdapter, "Standard graph", lettered(STANDARD, 6, 0, 5, unweighted), BOTH),
      transcript(
        dfsPathfindingAdapter, "A longer route than needed",
        lettered([[0, 1, 1], [1, 2, 1], [2, 3, 1], [0, 4, 1], [4, 3, 1]], 5, 0, 3, unweighted), ["overview"],
      ),
      transcript(dfsPathfindingAdapter, "No route", lettered([[0, 1, 1], [2, 1, 1]], 3, 0, 2, { directed: true, weighted: false }), ["every-edge"]),
    );
    await expect(text).toMatchFileSnapshot("./__golden__/dfs-pathfinding.md");
  });

  it("Cycle detection", async () => {
    const text = golden(
      "Cycle detection",
      transcript(cycleDetectionAdapter, "Standard graph", lettered(CYCLE_STANDARD, 6, 0, undefined, { directed: true, weighted: false }), BOTH),
      transcript(
        cycleDetectionAdapter, "No cycle",
        lettered([[0, 1, 1], [1, 2, 1], [1, 3, 1], [0, 2, 1]], 4, 0, undefined, { directed: true, weighted: false }), BOTH,
      ),
      transcript(cycleDetectionAdapter, "Undirected", lettered([[0, 1, 1], [1, 2, 1], [2, 0, 1]], 3, 0, undefined, unweighted), ["every-edge"]),
      transcript(
        cycleDetectionAdapter, "The cycle is in another part",
        lettered([[0, 1, 1], [2, 3, 1], [3, 2, 1]], 4, 0, undefined, { directed: true, weighted: false }), ["overview"],
      ),
    );
    await expect(text).toMatchFileSnapshot("./__golden__/cycle-detection.md");
  });

  it("Prim's", async () => {
    const cut = STANDARD.filter(([a, b]) => !(a === 1 && b === 3) && !(a === 2 && b === 4));
    const text = golden(
      "Prim's",
      transcript(primsAdapter, "Standard graph", lettered(STANDARD, 6, 0), BOTH),
      transcript(primsAdapter, "Disconnected graph", lettered(cut, 6, 0), ["overview"]),
    );
    await expect(text).toMatchFileSnapshot("./__golden__/prims.md");
  });
});
