/**
 * The event engine's checks (see the harness's TESTING.md): oracle, rule, scrub and steering checks
 * on the seeded random suite, and the golden narration file per algorithm. The golden files also
 * record the message the app shows when it will not play a run, the runs the landing pages'
 * experiments make claims about (built from the pages' own graphs), and a few steered runs.
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
  applyEvent, changes, emptyFrame, frameAt, narrate, stepEnds, steer,
  type AlgorithmEvent, type AnswerEvent, type ChoicePolicy, type DecideEvent, type Frame,
} from ".";
import { asUndirected, largeGraph, random, randomGraphs, withNegativeWeights, type RandomGraph } from "./__tests__/randomGraphs";
import {
  bruteForceDistances, hasCycle, hasReachableNegativeCycle, hopCounts, kruskalWeight, reachable,
} from "./__tests__/oracles";
import {
  addsLightestCrossingEdge, bfsDepthNeverDecreases, decisionsAreHonest, dfsTimesNest, doneStaysDone, edgeClassesMatchTimes, groupsOnlyIncrease, oneChangePerStep,
  keyMomentsMatchEvents, pointsAtPseudocode, parentLinksFormTree, relaxOnlyLowers, settlesOnceInOrder, type Rule,
} from "./__tests__/rules";

const suite = [...randomGraphs(200), largeGraph()];
/** Prim's refuses directed edges, so it runs on the suite made undirected. */
const undirectedSuite = suite.map(asUndirected);
/** Bellman-Ford also runs where some weights are negative. */
const signedSuite = [...suite, ...suite.map(withNegativeWeights)];

/** Algorithms on the event engine, with the graphs they run on and the rules their event streams obey. */
const ported: Array<{ adapter: AlgorithmAdapter; graphs: RandomGraph[]; rules: Record<string, Rule> }> = [
  { adapter: dijkstraAdapter, graphs: suite, rules: { pointsAtPseudocode, decisionsAreHonest, keyMomentsMatchEvents, groupsOnlyIncrease, oneChangePerStep, parentLinksFormTree, relaxOnlyLowers, settlesOnceInOrder } },
  { adapter: bellmanFordAdapter, graphs: signedSuite, rules: { pointsAtPseudocode, keyMomentsMatchEvents, groupsOnlyIncrease, oneChangePerStep, parentLinksFormTree, relaxOnlyLowers } },
  { adapter: bfsAdapter, graphs: suite, rules: { pointsAtPseudocode, decisionsAreHonest, keyMomentsMatchEvents, groupsOnlyIncrease, oneChangePerStep, parentLinksFormTree, bfsDepthNeverDecreases } },
  { adapter: bfsPathfindingAdapter, graphs: suite, rules: { pointsAtPseudocode, decisionsAreHonest, keyMomentsMatchEvents, groupsOnlyIncrease, oneChangePerStep, parentLinksFormTree, bfsDepthNeverDecreases } },
  { adapter: dfsAdapter, graphs: suite, rules: { pointsAtPseudocode, decisionsAreHonest, keyMomentsMatchEvents, groupsOnlyIncrease, oneChangePerStep, parentLinksFormTree, dfsTimesNest, edgeClassesMatchTimes, doneStaysDone } },
  { adapter: dfsPathfindingAdapter, graphs: suite, rules: { pointsAtPseudocode, decisionsAreHonest, keyMomentsMatchEvents, groupsOnlyIncrease, oneChangePerStep, parentLinksFormTree, dfsTimesNest, edgeClassesMatchTimes, doneStaysDone } },
  { adapter: cycleDetectionAdapter, graphs: suite, rules: { pointsAtPseudocode, decisionsAreHonest, keyMomentsMatchEvents, groupsOnlyIncrease, oneChangePerStep, parentLinksFormTree, dfsTimesNest, edgeClassesMatchTimes, doneStaysDone } },
  { adapter: primsAdapter, graphs: undirectedSuite, rules: { pointsAtPseudocode, decisionsAreHonest, keyMomentsMatchEvents, groupsOnlyIncrease, oneChangePerStep, parentLinksFormTree, relaxOnlyLowers, addsLightestCrossingEdge } },
];

const eventsOf = (adapter: AlgorithmAdapter, input: AlgorithmInput) => adapter.events(input);

function answerOf<K extends AnswerEvent["kind"]>(events: AlgorithmEvent[], kind: K) {
  return events.find((e): e is Extract<AnswerEvent, { kind: K }> => e.type === "answer" && e.kind === kind);
}

const settledIn = (events: AlgorithmEvent[]) => events.flatMap((e) => (e.type === "settle" ? [e.node] : []));

/** Checks the route runs from start to end along real edges; returns its weight (cheapest edge per hop). */
function expectRealRoute(at: string, input: AlgorithmInput, path: number[]): number {
  expect([path[0], path[path.length - 1]], `${at}: route ends`).toEqual([input.startNodeId, input.endNodeId]);
  expect(new Set(path).size, `${at}: route repeats no node`).toBe(path.length);
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const weights = (input.adjacencyList.get(path[i - 1]) ?? []).filter((e) => e.to === path[i]).map((e) => e.weight);
    expect(weights.length, `${at}: edge ${path[i - 1]}→${path[i]} exists`).toBeGreaterThan(0);
    total += Math.min(...weights);
  }
  return total;
}

/**
 * Each algorithm's oracle: checks a run's events against a simple reference on the same graph.
 * `at` names the run in failure messages. The oracle checks run them on the default runs, the
 * steering checks on steered ones.
 */
type Oracle = (at: string, input: AlgorithmInput, events: AlgorithmEvent[]) => void;

/** BFS and DFS visit exactly the nodes reachable from the start, each once. */
const traversalOracle: Oracle = (at, input, events) => {
  const visited = settledIn(events);
  const expected = reachable(input, input.startNodeId);
  expect(new Set(visited), `${at}: visited`).toEqual(expected);
  expect(visited.length, `${at}: each once`).toBe(expected.size);
  const answer = answerOf(events, "order");
  expect(answer?.order, `${at}: answer order`).toEqual(visited);
  expect(answer?.unreached, `${at}: unreached`).toEqual(input.nodes.map((n) => n.id).filter((id) => !expected.has(id)));
};

const oracles: Record<string, Oracle> = {
  dijkstra(at, input, events) {
    const best = bruteForceDistances(input);
    const end = input.endNodeId!;
    const answer = answerOf(events, "route");
    for (const e of events) {
      if (e.type === "settle") expect(e.value, `${at}: distance of ${e.node}`).toBe(best.get(e.node));
    }
    if (!best.has(end)) {
      expect(answer?.path, `${at}: no route exists`).toBeNull();
      return;
    }
    expect(answer?.cost, `${at}: route cost`).toBe(best.get(end));
    expect(expectRealRoute(at, input, answer?.path ?? []), `${at}: route weight`).toBe(best.get(end));
  },

  "bellman-ford"(at, input, events) {
    const answer = answerOf(events, "route");
    const end = input.endNodeId!;
    if (input.startNodeId === end) {
      expect(answer?.path, `${at}: start is the destination`).toEqual([end]);
      return;
    }
    const negativeCycle = hasReachableNegativeCycle(input);
    expect(answer?.negativeCycle !== undefined, `${at}: negative cycle`).toBe(negativeCycle);
    if (negativeCycle) return;
    const best = bruteForceDistances(input);
    if (!best.has(end)) {
      expect(answer?.path, `${at}: no route exists`).toBeNull();
      return;
    }
    expect(answer?.cost, `${at}: route cost`).toBe(best.get(end));
    expect(expectRealRoute(at, input, answer?.path ?? []), `${at}: route weight`).toBe(best.get(end));
  },

  bfs: traversalOracle,
  dfs: traversalOracle,

  "bfs-pathfinding"(at, input, events) {
    const answer = answerOf(events, "route");
    const hops = hopCounts(input).get(input.endNodeId!);
    if (hops === undefined) {
      expect(answer?.path, `${at}: no route exists`).toBeNull();
      return;
    }
    const path = answer?.path ?? [];
    expectRealRoute(at, input, path);
    expect(path.length - 1, `${at}: edges on the route`).toBe(hops);
  },

  "dfs-pathfinding"(at, input, events) {
    const answer = answerOf(events, "route");
    if (!reachable(input, input.startNodeId).has(input.endNodeId!)) {
      expect(answer?.path, `${at}: no route exists`).toBeNull();
      return;
    }
    expect(answer?.path, `${at}: a route exists`).not.toBeNull();
    expectRealRoute(at, input, answer?.path ?? []);
  },

  "cycle-detection"(at, input, events) {
    const cycle = answerOf(events, "cycle")?.cycle ?? null;
    expect(cycle !== null, `${at}: cycle found`).toBe(hasCycle(input));
    if (!cycle) return;
    cycle.forEach((from, i) => {
      const to = cycle[(i + 1) % cycle.length];
      expect((input.adjacencyList.get(from) ?? []).some((e) => e.to === to), `${at}: edge ${from}→${to} exists`).toBe(true);
    });
  },

  prims(at, input, events) {
    const answer = answerOf(events, "tree");
    const part = reachable(input, input.startNodeId);
    expect(answer?.total, `${at}: tree weight`).toBe(kruskalWeight(input));
    expect(answer?.edges.length, `${at}: tree edges`).toBe(part.size - 1);
    for (const { from, to, weight } of answer?.edges ?? []) {
      const real = (input.adjacencyList.get(from) ?? []).some((e) => e.to === to && e.weight === weight);
      expect(real, `${at}: edge ${from}–${to} weighs ${weight}`).toBe(true);
    }
    expect(answer?.unreached, `${at}: left out`).toEqual(input.nodes.map((n) => n.id).filter((id) => !part.has(id)));
  },
};

/** Runs an adapter's oracle on its default run of every graph. */
function oracleCheck(adapter: AlgorithmAdapter, graphs: RandomGraph[]) {
  for (const { seed, input } of graphs) oracles[adapter.metadata.id](`seed ${seed}`, input, eventsOf(adapter, input));
}

describe("oracle check", () => {
  it("Dijkstra's distances and route match brute-force shortest paths", () => oracleCheck(dijkstraAdapter, suite));

  it("Bellman-Ford's route matches brute-force shortest paths, and it reports a negative cycle exactly when one is reachable", () =>
    oracleCheck(bellmanFordAdapter, signedSuite));

  for (const adapter of [bfsAdapter, dfsAdapter]) {
    it(`${adapter.metadata.name} visits exactly the nodes reachable from the start, each once`, () => oracleCheck(adapter, suite));
  }

  it("BFS pathfinding's route has the fewest possible edges", () => oracleCheck(bfsPathfindingAdapter, suite));

  it("DFS pathfinding finds a real route exactly when one exists", () => oracleCheck(dfsPathfindingAdapter, suite));

  it("Cycle detection finds a real cycle exactly when a depth-first colouring does", () => oracleCheck(cycleDetectionAdapter, suite));

  it("Prim's tree weighs the same as Kruskal's minimum spanning tree of the start's part of the graph", () =>
    oracleCheck(primsAdapter, undirectedSuite));
});

/* ---------------------------------------------------------- steered runs */

/** The node a run took at each of its decisions, in order. */
const picksOf = (events: readonly AlgorithmEvent[]) => events.flatMap((e) => (e.type === "decide" ? [e.node] : []));

/** A policy that makes the picks given, then picks at random among the valid options. */
function pickThenRandom(picks: readonly number[], rand: () => number): ChoicePolicy {
  let at = 0;
  return ({ options }) => {
    const pick = at < picks.length ? picks[at] : options[Math.floor(rand() * options.length)];
    at += 1;
    return pick;
  };
}

/** Bellman-Ford makes no choices: it checks the edges in one fixed order every round. */
const steerable = ported.filter(({ adapter }) => adapter.metadata.id !== "bellman-ford");

/**
 * The graphs a steered run must still answer correctly. Cycle detection leaves out graphs that mix
 * directed and undirected edges: there, whether a depth-first colouring finds a cycle depends on
 * the order it meets the edges in (its oracle shares the default order), so another valid order
 * can miss one. Directed or undirected throughout, any order finds a cycle exactly when there is one.
 */
const mixed = ({ input }: RandomGraph) => new Set([...input.adjacencyList.values()].flat().map((e) => e.type)).size > 1;
const answeredWhenSteered = (id: string, graphs: RandomGraph[]) => (id === "cycle-detection" ? graphs.filter((g) => !mixed(g)) : graphs);

describe("steering check", () => {
  for (const { adapter, graphs, rules } of steerable) {
    const { id, name } = adapter.metadata;
    const context = (input: AlgorithmInput) => ({ algorithmId: id, pseudocode: adapter.pseudocode, input });

    it(`${name}: taking any other valid option at any decision, then random valid ones, still matches the oracle and obeys every rule`, () => {
      for (const { seed, input } of answeredWhenSteered(id, graphs)) {
        const rand = random(seed);
        const base = eventsOf(adapter, input);
        const picks = picksOf(base);
        base.filter((e): e is DecideEvent => e.type === "decide").forEach((decision, k) => {
          for (const option of decision.options.filter((o) => o !== decision.node)) {
            const at = `seed ${seed}, ${option} at decision ${k}`;
            const events = adapter.events(input, pickThenRandom([...picks.slice(0, k), option], rand));
            expect(picksOf(events)[k], `${at}: followed`).toBe(option);
            oracles[id](at, input, events);
            for (const [rule, check] of Object.entries(rules)) expect(check(events, context(input)), `${at}: ${rule}`).toBeNull();
          }
        });
      }
    });

    it(`${name}: a pick that is not a valid option is rejected with the decision it was made at, and the run goes on as if it had not been made`, () => {
      for (const { seed, input } of graphs) {
        const run = (choose: ChoicePolicy) => adapter.events(input, choose);
        const valid = run(pickThenRandom([], random(seed)));
        const picks = picksOf(valid);
        expect(steer(run, picks), `seed ${seed}: valid picks`).toEqual({ events: valid, followed: picks.length, rejected: null });
        valid.forEach((decision, event) => {
          if (decision.type !== "decide") return;
          const k = picksOf(valid.slice(0, event)).length;
          // A node of the graph that is not an option, or else no node at all.
          const wrong = input.nodes.map((n) => n.id).find((n) => !decision.options.includes(n)) ?? -1;
          const steered = steer(run, [...picks.slice(0, k), wrong, ...picks.slice(k + 1)]);
          // The run as if the wrong pick had not been made: the same up to the decision, which takes its first option.
          const expected = steer(run, picks.slice(0, k)).events;
          expect(expected[event], `seed ${seed}: decision ${k}`).toMatchObject({ type: "decide", options: decision.options, node: decision.options[0] });
          expect(steered, `seed ${seed}: ${wrong} at decision ${k}`).toEqual({
            events: expected,
            followed: k,
            rejected: { choice: wrong, decision: k, event, decide: expected[event] },
          });
        });
      }
    });
  }

  it("Cycle detection: steering reaches exactly the runs that some order of the edge lists and of the restarts gives", () => {
    let checked = 0;
    for (const graph of answeredWhenSteered("cycle-detection", suite)) {
      const inputs = orderings(graph.input);
      if (!inputs) continue;
      checked += 1;
      const ordered = new Set(inputs.map((input) => changesOf(cycleDetectionAdapter.events(input))));
      const steered = everySteeredRun((choose) => cycleDetectionAdapter.events(graph.input, choose));
      expect(steered, `seed ${graph.seed}`).toEqual(ordered);
    }
    expect(checked, "graphs small enough to try every order").toBeGreaterThan(50);
  });
});

/** Every order of a list. */
const permutations = <T,>(items: readonly T[]): T[][] => items.length <= 1
  ? [[...items]]
  : items.flatMap((item, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]));

/** At most this many orders of one graph are tried. */
const ORDER_LIMIT = 3000;

/**
 * The same graph given every way it can be: each node's edges in every order, and the nodes in every
 * order (where cycle detection starts again). Null when there are more than ORDER_LIMIT.
 */
function orderings(input: AlgorithmInput): AlgorithmInput[] | null {
  const ids = [...input.adjacencyList.keys()];
  const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));
  const count = ids.reduce((n, id) => n * factorial(input.adjacencyList.get(id)!.length), factorial(ids.length));
  if (count > ORDER_LIMIT) return null;
  let lists: Array<Array<[number, EdgeInfo[]]>> = [[]];
  for (const id of ids) lists = lists.flatMap((chosen) => permutations(input.adjacencyList.get(id)!).map((edges) => [...chosen, [id, edges] as [number, EdgeInfo[]]]));
  return permutations(ids).flatMap((keys) => lists.map((chosen) => {
    const byId = new Map(chosen);
    return { ...input, adjacencyList: new Map(keys.map((id) => [id, byId.get(id)!])) };
  }));
}

/** A run as the learner follows it: its changes, in order (the checks between them aside). */
const changesOf = (events: readonly AlgorithmEvent[]) => JSON.stringify(events.filter(changes));

/** The runs every sequence of valid picks gives (see `changesOf`). */
function everySteeredRun(run: (choose: ChoicePolicy) => AlgorithmEvent[]): Set<string> {
  const runs = new Set<string>();
  const pending: number[][] = [[]];
  while (pending.length > 0) {
    const picks = pending.pop()!;
    const { events } = steer(run, picks);
    const next = events.filter((e): e is DecideEvent => e.type === "decide")[picks.length];
    if (next) for (const option of next.options) pending.push([...picks, option]);
    else runs.add(changesOf(events));
  }
  return runs;
}

describe("rule checks", () => {
  for (const { adapter, graphs, rules } of ported) {
    for (const [name, rule] of Object.entries(rules)) {
      it(`${adapter.metadata.name}: ${name}`, () => {
        for (const { seed, input } of graphs) {
          const violation = rule(eventsOf(adapter, input), { algorithmId: adapter.metadata.id, pseudocode: adapter.pseudocode, input });
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

/**
 * A run's transcript. With `picks` the run is steered: it takes those nodes at its decisions, in
 * order (forced ones included), and the transcript names them.
 */
function transcript(
  adapter: AlgorithmAdapter, title: string, { input, edgeList, label = (id) => LABELS[id] }: Lettered, narrated = true, picks?: number[],
) {
  const plain = (message: string) => message.replace(/\{n:(\d+)\}/g, (_, id) => label(Number(id)));
  const events = picks ? steer((choose) => adapter.events(input, choose), picks).events : eventsOf(adapter, input);
  const ends = input.endNodeId === undefined ? "" : ` to ${label(input.endNodeId)}`;
  const lines = [`## ${title}`, "", `From ${label(input.startNodeId)}${ends}. Edges: ${edgeList}`];
  if (picks) lines.push("", `Steered: takes ${picks.map(label).join(", ")}, then goes on as usual`);
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
      transcript(dijkstraAdapter, "A tie, steered to the other node", lettered([[0, 1, 2], [0, 2, 2], [1, 3, 1], [2, 3, 3]], 4, 0, 3), true, [0, 2]),
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
      transcript(bfsAdapter, "Standard graph, steered to C first", lettered(STANDARD, 6, 0, undefined, unweighted), true, [0, 2]),
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
      transcript(dfsAdapter, "Standard graph, steered to C first", lettered(STANDARD, 6, 0, undefined, unweighted), true, [0, 2]),
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
