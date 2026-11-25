/**
 * The event engine's checks (see the harness's TESTING.md): oracle, rule and scrub checks on
 * the seeded random suite, and the golden narration file per algorithm. The golden files also
 * record the message the app shows when it will not play a run, and the runs the landing pages'
 * experiments make claims about (built from the pages' own graphs).
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
import type { AlgorithmAdapter, AlgorithmInput, EdgeInfo } from "../types";
import * as landing from "@/landing/live/configs";
import { WEIGHTED_EDGES } from "@/landing/live/shared";
import type { LabGraph, LiveConfig } from "@/landing/live/types";
import { generateCycleWithDeadEnd, generateWeighted, type GeneratedGraph } from "@/utils/graph/graphGenerator";
import {
  applyEvent, emptyFrame, frameAt, narrate, stepEnds, type AlgorithmEvent, type AnswerEvent, type Frame,
} from ".";
import { asUndirected, largeGraph, randomGraphs, withNegativeWeights, type RandomGraph } from "./__tests__/randomGraphs";
import {
  bruteForceDistances, hasCycle, hasReachableNegativeCycle, hopCounts, kruskalWeight, reachable,
} from "./__tests__/oracles";
import {
  addsLightestCrossingEdge, bfsDepthNeverDecreases, dfsTimesNest, doneStaysDone, groupsOnlyIncrease, oneChangePerStep, pointsAtPseudocode,
  relaxOnlyLowers, settlesOnceInOrder, type Rule,
} from "./__tests__/rules";

const suite = [...randomGraphs(200), largeGraph()];
/** Prim's refuses directed edges, so it runs on the suite made undirected. */
const undirectedSuite = suite.map(asUndirected);
/** Bellman-Ford also runs where some weights are negative. */
const signedSuite = [...suite, ...suite.map(withNegativeWeights)];

/** Algorithms on the event engine, with the graphs they run on and the rules their event streams obey. */
const ported: Array<{ adapter: AlgorithmAdapter; graphs: RandomGraph[]; rules: Record<string, Rule> }> = [
  { adapter: dijkstraAdapter, graphs: suite, rules: { pointsAtPseudocode, groupsOnlyIncrease, oneChangePerStep, relaxOnlyLowers, settlesOnceInOrder } },
  { adapter: bellmanFordAdapter, graphs: signedSuite, rules: { pointsAtPseudocode, groupsOnlyIncrease, oneChangePerStep, relaxOnlyLowers } },
  { adapter: bfsAdapter, graphs: suite, rules: { pointsAtPseudocode, groupsOnlyIncrease, oneChangePerStep, bfsDepthNeverDecreases } },
  { adapter: bfsPathfindingAdapter, graphs: suite, rules: { pointsAtPseudocode, groupsOnlyIncrease, oneChangePerStep, bfsDepthNeverDecreases } },
  { adapter: dfsAdapter, graphs: suite, rules: { pointsAtPseudocode, groupsOnlyIncrease, oneChangePerStep, dfsTimesNest, doneStaysDone } },
  { adapter: dfsPathfindingAdapter, graphs: suite, rules: { pointsAtPseudocode, groupsOnlyIncrease, oneChangePerStep, dfsTimesNest, doneStaysDone } },
  { adapter: cycleDetectionAdapter, graphs: suite, rules: { pointsAtPseudocode, groupsOnlyIncrease, oneChangePerStep, dfsTimesNest, doneStaysDone } },
  { adapter: primsAdapter, graphs: undirectedSuite, rules: { pointsAtPseudocode, groupsOnlyIncrease, oneChangePerStep, relaxOnlyLowers, addsLightestCrossingEdge } },
];

const eventsOf = (adapter: AlgorithmAdapter, input: AlgorithmInput) => adapter.events(input);

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
          const violation = rule(eventsOf(adapter, input), { pseudocode: adapter.pseudocode, input });
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

/* --------------------------------------------------------- the app's answer */

/**
 * The app plays a run one step at a time and shows the answer held by the last step's
 * frame, unless the adapter refuses the run. This ties both to the event answer the checks above verify.
 */
describe("oracle check: the answer the app shows", () => {
  for (const { adapter, graphs } of ported) {
    it(`${adapter.metadata.name}: the last step's frame holds the event answer, and the app refuses exactly when there is none`, () => {
      for (const { seed, input } of graphs) {
        const events = eventsOf(adapter, input);
        const answer = events.find((e): e is AnswerEvent => e.type === "answer")!;
        const ends = stepEnds(events);
        expect(frameAt(events, ends[ends.length - 1]).answer, `seed ${seed}: answer on the last step`).toBe(answer);
        const missing = (answer.kind === "route" && answer.path === null) || (answer.kind === "cycle" && answer.cycle === null);
        const refusal = adapter.refusal?.(events, input);
        expect(refusal !== undefined, `seed ${seed}: refusal ${refusal}`).toBe(missing);
      }
    });
  }
});

/* ------------------------------------------------------------ golden narration */

const LABELS = ["A", "B", "C", "D", "E", "F"];

interface Lettered {
  input: AlgorithmInput;
  edgeList: string;
  /** How a node is named in the transcript (a letter by default). */
  label?: (id: number) => string;
}

/** A small graph with lettered nodes (ids are indexes into LABELS). Without `end` it has no destination. */
function lettered(
  edges: Array<[number, number, number]>, size: number, start: number, end?: number,
  { directed = false, weighted = true } = {},
): Lettered {
  const type = directed ? "directed" : "undirected";
  const adjacencyList = new Map<number, EdgeInfo[]>(LABELS.slice(0, size).map((_, id) => [id, []]));
  for (const [from, to, weight] of edges) {
    adjacencyList.get(from)!.push({ from, to, weight, type });
    if (!directed) adjacencyList.get(to)!.push({ from: to, to: from, weight, type });
  }
  const input: AlgorithmInput = {
    adjacencyList,
    nodes: LABELS.slice(0, size).map((_, id) => ({ id })),
    startNodeId: start,
    endNodeId: end,
  };
  const edgeList = edges
    .map(([from, to, weight]) => `${LABELS[from]}${directed ? "→" : "–"}${LABELS[to]}${weighted ? ` ${weight < 0 ? `−${-weight}` : weight}` : ""}`)
    .join(", ");
  return { input, edgeList };
}

/** A landing page's graph, lettered the same way (its node ids are already indexes into LABELS). */
function fromLanding({ nodes, edges, start, end }: LabGraph, weighted = true): Lettered {
  const directed = edges.every((e) => e.directed);
  if (!directed && edges.some((e) => e.directed)) throw new Error("A landing graph mixes directed and undirected edges");
  return lettered(edges.map((e) => [e.from, e.to, e.weight]), nodes.length, start, end, { directed, weighted });
}

/** The graph a landing page's experiment runs on, with its toggle on or off. */
const experiment = ({ limits }: LiveConfig, on: boolean) => fromLanding(limits.experiment.graph(on), limits.experiment.weighted(on));

function transcript(adapter: AlgorithmAdapter, title: string, { input, edgeList, label = (id) => LABELS[id] }: Lettered, narrated = true) {
  const plain = (message: string) => message.replace(/\{n:(\d+)\}/g, (_, id) => label(Number(id)));
  const events = eventsOf(adapter, input);
  const ends = input.endNodeId === undefined ? "" : ` to ${label(input.endNodeId)}`;
  const lines = [`## ${title}`, "", `From ${label(input.startNodeId)}${ends}. Edges: ${edgeList}`];
  if (narrated) {
    lines.push("");
    narrate(events, adapter.metadata.id).forEach((message, i) => lines.push(`${String(i + 1).padStart(2)}. ${plain(message)}`));
  }
  const refusal = adapter.refusal?.(events, input);
  if (refusal) lines.push("", `The app says: ${plain(refusal)}`);
  return lines.join("\n");
}

/** A golden file: a title, then transcripts separated by blank lines. */
const golden = (title: string, ...sections: string[]) => [`# ${title}`, "", ...sections.flatMap((s) => [s, ""])].join("\n");

/**
 * A graph the app generates when it opens an algorithm (nodes are numbered, as the app shows them).
 * The app reads the edges node by node in the order the graph's edge map lists them, and so does this.
 */
function generated({ nodes, edges }: GeneratedGraph, start: number, end?: number): Lettered {
  const adjacencyList = new Map<number, EdgeInfo[]>([...edges].map(([id, list]) => [id, list.map((e): EdgeInfo => ({ from: e.from, to: e.to, weight: e.weight, type: e.type === "directed" ? "directed" : "undirected" }))]));
  const listed = [...edges.values()].flat().filter((e) => e.type === "directed" || e.from < e.to);
  const edgeList = listed.map((e) => `${e.from}${e.type === "directed" ? "→" : "–"}${e.to}${e.type === "directed" ? ` ${e.weight}` : ""}`).join(", ");
  return { input: { adjacencyList, nodes: nodes.map((n) => ({ id: n.id })), startNodeId: start, endNodeId: end }, edgeList, label: String };
}

/** The classic weighted graph the landing pages use. */
const STANDARD = WEIGHTED_EDGES;
/** The cycle detection page's directed graph. */
const CYCLE_STANDARD = landing.cycleDetection.edges;
const unweighted = { weighted: false };

describe("golden narration", () => {
  it("Dijkstra's", async () => {
    const text = golden(
      "Dijkstra's",
      transcript(dijkstraAdapter, "Standard graph", lettered(STANDARD, 6, 0, 5)),
      transcript(dijkstraAdapter, "A negative edge", experiment(landing.dijkstra, true)),
      transcript(dijkstraAdapter, "A tie", lettered([[0, 1, 2], [0, 2, 2], [1, 3, 1], [2, 3, 3]], 4, 0, 3)),
      transcript(dijkstraAdapter, "No route", lettered([[0, 1, 3], [2, 1, 1]], 3, 0, 2, { directed: true })),
      transcript(dijkstraAdapter, "Start is the destination", lettered([[0, 1, 3]], 2, 0, 0)),
      transcript(dijkstraAdapter, "Parallel edges", lettered([[0, 1, 6], [0, 1, 9], [0, 1, 5], [0, 2, 1], [2, 1, 1], [2, 1, 9]], 3, 0, 1)),
      transcript(dijkstraAdapter, "Parallel edges that cost the same", lettered([[0, 1, 3], [0, 2, 1], [2, 1, 9], [2, 1, 9], [2, 3, 1], [2, 3, 4], [2, 3, 4]], 4, 0, 1)),
    );
    await expect(text).toMatchFileSnapshot("./__golden__/dijkstra.md");
  });

  it("Bellman-Ford", async () => {
    const text = golden(
      "Bellman-Ford",
      transcript(bellmanFordAdapter, "Standard graph", lettered(STANDARD, 6, 0, 5)),
      transcript(bellmanFordAdapter, "A negative edge", experiment(landing.bellmanFord, true)),
      transcript(bellmanFordAdapter, "A negative cycle", lettered([[0, 1, 1], [1, 2, -2], [2, 1, 1]], 3, 0, 2, { directed: true })),
      transcript(bellmanFordAdapter, "No route", lettered([[0, 1, 3], [2, 1, 1]], 3, 0, 2, { directed: true })),
      transcript(bellmanFordAdapter, "Parallel edges", lettered([[0, 1, 2], [1, 0, 5], [1, 0, 7], [1, 2, 1], [3, 2, 1], [3, 2, 4]], 4, 0, 2, { directed: true })),
      transcript(bellmanFordAdapter, "Parallel edges, one of them improves", lettered([[0, 1, 6], [0, 1, 9], [0, 1, 5], [0, 1, 7]], 2, 0, 1, { directed: true })),
      transcript(bellmanFordAdapter, "Parallel edges around another change", lettered([[0, 1, 1], [0, 1, 5], [0, 2, 1], [0, 1, 5]], 3, 0, 1, { directed: true })),
      transcript(bellmanFordAdapter, "Parallel edges in a negative cycle", lettered([[0, 1, 1], [1, 2, -2], [2, 1, 1], [2, 1, 3]], 3, 0, 1, { directed: true })),
      transcript(bellmanFordAdapter, "The graph the app generates", generated(generateWeighted(), 1, 12)),
    );
    await expect(text).toMatchFileSnapshot("./__golden__/bellman-ford.md");
  });

  it("BFS", async () => {
    const text = golden(
      "BFS",
      transcript(bfsAdapter, "Standard graph", lettered(STANDARD, 6, 0, undefined, unweighted)),
      transcript(bfsAdapter, "Disconnected graph", lettered([[0, 1, 1], [2, 3, 1]], 4, 0, undefined, unweighted)),
      transcript(bfsAdapter, "Same graph, two orders: from A", experiment(landing.bfs, false)),
      transcript(bfsAdapter, "Same graph, two orders: from F", experiment(landing.bfs, true)),
    );
    await expect(text).toMatchFileSnapshot("./__golden__/bfs.md");
  });

  it("DFS", async () => {
    const text = golden(
      "DFS",
      transcript(dfsAdapter, "Standard graph", lettered(STANDARD, 6, 0, undefined, unweighted)),
      transcript(dfsAdapter, "Disconnected graph", lettered([[0, 1, 1], [2, 3, 1]], 4, 0, undefined, unweighted)),
      transcript(dfsAdapter, "Same graph, two orders: from A", experiment(landing.dfs, false)),
      transcript(dfsAdapter, "Same graph, two orders: from F", experiment(landing.dfs, true)),
    );
    await expect(text).toMatchFileSnapshot("./__golden__/dfs.md");
  });

  it("BFS pathfinding", async () => {
    const text = golden(
      "BFS pathfinding",
      transcript(bfsPathfindingAdapter, "Standard graph", lettered(STANDARD, 6, 0, 5, unweighted)),
      transcript(bfsPathfindingAdapter, "Weights it does not see", experiment(landing.bfsPathfinding, true)),
      transcript(bfsPathfindingAdapter, "No route", lettered([[0, 1, 1], [2, 1, 1]], 3, 0, 2, { directed: true, weighted: false })),
      transcript(bfsPathfindingAdapter, "Start is the destination", lettered([[0, 1, 1]], 2, 0, 0, unweighted)),
    );
    await expect(text).toMatchFileSnapshot("./__golden__/bfs-pathfinding.md");
  });

  it("DFS pathfinding", async () => {
    const text = golden(
      "DFS pathfinding",
      transcript(dfsPathfindingAdapter, "Standard graph", lettered(STANDARD, 6, 0, 5, unweighted)),
      transcript(dfsPathfindingAdapter, "A longer route than needed", experiment(landing.dfsPathfinding, true)),
      transcript(dfsPathfindingAdapter, "No route", lettered([[0, 1, 1], [2, 1, 1]], 3, 0, 2, { directed: true, weighted: false })),
    );
    await expect(text).toMatchFileSnapshot("./__golden__/dfs-pathfinding.md");
  });

  it("Cycle detection", async () => {
    const text = golden(
      "Cycle detection",
      transcript(cycleDetectionAdapter, "Standard graph", lettered(CYCLE_STANDARD, 6, 0, undefined, { directed: true, weighted: false })),
      transcript(cycleDetectionAdapter, "One edge makes a cycle", experiment(landing.cycleDetection, true)),
      transcript(cycleDetectionAdapter, "No cycle", experiment(landing.cycleDetection, false)),
      transcript(cycleDetectionAdapter, "Undirected", lettered([[0, 1, 1], [1, 2, 1], [2, 0, 1]], 3, 0, undefined, unweighted)),
      transcript(
        cycleDetectionAdapter, "The cycle is in another part",
        lettered([[0, 1, 1], [2, 3, 1], [3, 2, 1]], 4, 0, undefined, { directed: true, weighted: false }),
      ),
      transcript(cycleDetectionAdapter, "Parallel edges", lettered([[0, 1, 1], [0, 2, 1], [2, 1, 1], [2, 1, 1], [2, 0, 1], [2, 1, 1]], 3, 0, undefined, { directed: true, weighted: false })),
      transcript(cycleDetectionAdapter, "The graph the app generates", generated(generateCycleWithDeadEnd(), 1)),
    );
    await expect(text).toMatchFileSnapshot("./__golden__/cycle-detection.md");
  });

  it("Prim's", async () => {
    const text = golden(
      "Prim's",
      transcript(primsAdapter, "Standard graph", lettered(STANDARD, 6, 0)),
      transcript(primsAdapter, "Disconnected graph", experiment(landing.prims, true)),
      transcript(primsAdapter, "Parallel edges", lettered([[0, 1, 6], [0, 1, 9], [0, 1, 5], [0, 2, 1], [2, 1, 1], [2, 1, 9]], 3, 0)),
      transcript(primsAdapter, "Parallel edges that cost the same", lettered([[0, 1, 3], [0, 2, 1], [2, 1, 9], [2, 1, 9], [2, 3, 1], [2, 3, 4], [2, 3, 4]], 4, 0)),
      transcript(primsAdapter, "Directed edges", lettered([[0, 1, 3]], 2, 0, undefined, { directed: true }), false),
    );
    await expect(text).toMatchFileSnapshot("./__golden__/prims.md");
  });
});
