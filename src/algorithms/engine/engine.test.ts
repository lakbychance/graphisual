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
import { buildRun } from "@/utils/visualization/buildRun";
import { FRESH_ALGORITHMS, freshGraph } from "@/utils/visualization/freshGraph";
import {
  accepted, applyEvent, asks, CATALOGUE, changes, clue, emptyFrame, familyOf, frameAt, misconception, narrate, stepEnds, steer,
  type AlgorithmEvent, type AnswerEvent, type ChoicePolicy, type DecideEvent, type Frame,
} from ".";
import { nid } from "../traceHelpers";
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
    // A real cycle (see `hasCycle`): distinct nodes, each joined to the next by an edge that may be
    // walked that way, and two nodes joined by more than the one undirected edge.
    expect(new Set(cycle).size, `${at}: no node twice in ${cycle.join(", ")}`).toBe(cycle.length);
    const ways = (from: number, to: number) => (input.adjacencyList.get(from) ?? []).filter((e) => e.to === to);
    cycle.forEach((from, i) => {
      const to = cycle[(i + 1) % cycle.length];
      expect(ways(from, to).length > 0, `${at}: edge ${from}→${to} exists`).toBe(true);
    });
    if (cycle.length === 2) {
      const [a, b] = cycle;
      expect([...ways(a, b), ...ways(b, a)].some((e) => e.type === "directed"), `${at}: ${a} and ${b} joined by a directed edge`).toBe(true);
    }
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

  it("Cycle detection finds a real cycle exactly when one exists, directed, undirected or mixed", () => oracleCheck(cycleDetectionAdapter, suite));

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

describe("steering check", () => {
  for (const { adapter, graphs, rules } of steerable) {
    const { id, name } = adapter.metadata;
    const context = (input: AlgorithmInput) => ({ algorithmId: id, pseudocode: adapter.pseudocode, input });

    it(`${name}: taking any other valid option at any decision, then random valid ones, still matches the oracle and obeys every rule`, () => {
      for (const { seed, input } of graphs) {
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

    it(`${name}: every pick that is not valid, at every decision, is named for a misconception from its catalogue (never the fallback), and the run waits for the learner at every decision with more than one valid option or a way on that closes the loop`, () => {
      const family = familyOf(id)!;
      for (const { seed, input } of graphs) {
        const run = (choose: ChoicePolicy) => adapter.events(input, choose);
        const base = run(pickThenRandom([], random(seed)));
        const picks = picksOf(base);
        base.forEach((decision, event) => {
          if (decision.type !== "decide") return;
          const k = picksOf(base.slice(0, event)).length;
          // A choice of several, or a way on that closes cycle detection's loop, is always the learner's to make.
          const closesLoop = id === "cycle-detection" && decision.kind === "next" && decision.options.some((o) => frameAt(base, event).settled.includes(o));
          if (decision.options.length > 1 || closesLoop) expect(asks(id, base, event, input.adjacencyList), `seed ${seed}: decision ${k} asked`).toBe(true);
          for (const wrong of input.nodes.map((n) => n.id).filter((n) => !decision.options.includes(n))) {
            const { events, rejected } = steer(run, [...picks.slice(0, k), wrong]);
            const at = `seed ${seed}: ${wrong} at decision ${k}`;
            expect(rejected, at).not.toBeNull();
            const named = misconception(id, events, rejected!, input.adjacencyList);
            expect(CATALOGUE[family] as readonly string[], at).toContain(named.kind);
            expect(named.kind, at).not.toBe("other");
            expect(named.text, `${at}: names the pick`).toContain(nid(wrong));
          }
        });
      }
    });

  }

  it("Cycle detection: steering reaches exactly the runs that some order of the edge lists and of the restarts gives, and each finds a cycle exactly when one exists", () => {
    let checked = 0;
    for (const graph of suite) {
      const inputs = orderings(graph.input);
      if (!inputs) continue;
      checked += 1;
      const ordered = new Set(inputs.map((input, i) => {
        const events = cycleDetectionAdapter.events(input);
        oracles["cycle-detection"](`seed ${graph.seed}, order ${i}`, input, events);
        return changesOf(events);
      }));
      const steered = everySteeredRun((choose) => cycleDetectionAdapter.events(graph.input, choose));
      expect(steered, `seed ${graph.seed}`).toEqual(ordered);
    }
    expect(checked, "graphs small enough to try every order").toBeGreaterThan(50);
  });
});

/**
 * A small graph with lettered nodes (A is id 1, B id 2, ...): edges "A-B:4" (undirected) or "A>B:4"
 * (directed), weight 1 when left out, in the order given.
 */
function named(spec: string, start: string, end?: string) {
  const id = (name: string) => name.charCodeAt(0) - 64;
  const adjacencyList = new Map<number, EdgeInfo[]>();
  const add = (name: string) => {
    if (!adjacencyList.has(id(name))) adjacencyList.set(id(name), []);
  };
  for (const edge of spec.split(/\s+/).filter(Boolean)) {
    const [, from, kind, to, w] = /^(\w)([->])(\w)(?::(\d+))?$/.exec(edge)!;
    add(from);
    add(to);
    const weight = Number(w ?? 1);
    const type = kind === "-" ? "undirected" : "directed";
    adjacencyList.get(id(from))!.push({ from: id(from), to: id(to), weight, type });
    if (type === "undirected") adjacencyList.get(id(to))!.push({ from: id(to), to: id(from), weight, type });
  }
  for (const name of [start, end]) if (name) add(name);
  const input: AlgorithmInput = {
    adjacencyList, nodes: [...adjacencyList.keys()].map((n) => ({ id: n })), startNodeId: id(start), endNodeId: end ? id(end) : undefined,
  };
  return { input, id, label: (n: number) => String.fromCharCode(64 + n) };
}

/** Steers `adapter` on the lettered graph through `picks` (one per decision, forced ones included; the last one wrong) and names the wrong one. */
function missed(adapter: AlgorithmAdapter, graph: ReturnType<typeof named>, picks: string) {
  const { events, rejected } = steer((choose) => adapter.events(graph.input, choose), picks.split(" ").map(graph.id));
  expect(rejected?.decision, `${picks}: rejected at the last pick`).toBe(picks.split(" ").length - 1);
  return misconception(adapter.metadata.id, events, rejected!, graph.input.adjacencyList, graph.label);
}

describe("steering check: the misconception catalogue", () => {
  const route = named("A-B:4 A-C:2 C-B:1 B-D:5 C-E:9 D-E:2 D-F:3 E-F:6", "A", "F");

  it("Dijkstra's: an already-final node, an unreached one, a neighbour of the node just taken, the shortest last edge, and label order", () => {
    expect(missed(dijkstraAdapter, route, "A C A").kind).toBe("final");
    expect(missed(dijkstraAdapter, route, "A D").kind).toBe("unreached");
    expect(missed(dijkstraAdapter, route, "A B")).toEqual({
      kind: "label-order", text: `${nid(2)} comes first by name, but Dijkstra goes by distance — ${nid(3)} is at 2, ${nid(2)} at 4`,
    });
    expect(missed(dijkstraAdapter, named("A-B:1 A-C:2 B-D:5", "A", "D"), "A B D")).toEqual({
      kind: "neighbour", text: `${nid(4)} is next to ${nid(2)}, but ${nid(3)} is closer to the start overall — Dijkstra always takes the closest node in the whole queue`,
    });
    // A is the start; B at 10, C at 12, D at 14, E at 15; F hangs off C by an edge of 4 (16 in all).
    expect(missed(dijkstraAdapter, named("A-C:12 C-F:4 A-B:10 A-D:14 A-E:15", "A", "F"), "A B C D F").kind).toBe("edge-weight");
    expect(missed(dijkstraAdapter, route, "A C B E").kind).toBe("farther");
  });

  it("Prim's: a node already in the tree, a neighbour of the node just added, label order, and a dearer edge", () => {
    expect(missed(primsAdapter, named("A-B:1 A-C:2 B-D:5", "A"), "A B A").kind).toBe("in-tree");
    expect(missed(primsAdapter, named("A-B:1 A-C:2 B-D:5", "A"), "A B D").kind).toBe("neighbour");
    // B is nearer the start than D, but Prim's does not weigh routes: B is named for coming first by name.
    expect(missed(primsAdapter, named("A-B:9 A-C:2 C-D:8", "A"), "A C B")).toEqual({
      kind: "label-order", text: `${nid(2)} comes first by name, but Prim's goes by cost — ${nid(4)} joins for 8, ${nid(2)} for 9`,
    });
    expect(missed(primsAdapter, named("A-B:1 A-C:5 A-D:2", "A"), "A D").kind).toBe("dearer");
  });

  it("BFS: a visited node, an unseen one, a node a level deeper, and one as far out from another parent", () => {
    const tree = named("A-B A-C B-D C-E", "A");
    expect(missed(bfsAdapter, tree, "A A").kind).toBe("visited");
    expect(missed(bfsAdapter, tree, "A D").kind).toBe("unseen");
    expect(missed(bfsAdapter, tree, "A B D").kind).toBe("deeper");
    expect(missed(bfsAdapter, tree, "A B C E")).toEqual({
      kind: "other-parent", text: `${nid(5)} is just as far out, but ${nid(4)} joined the queue first — a queue serves nodes in the order they arrived`,
    });
  });

  it("DFS: a node waiting from further up instead of the top of the stack", () => {
    expect(missed(dfsAdapter, named("A-B A-C B-D B-E", "A"), "A B C")).toEqual({
      kind: "wide", text: `${nid(3)} waits from ${nid(1)}, further up, but DFS goes deep first — it takes ${nid(4)}, the newest node on the stack`,
    });
  });

  it("Cycle detection: the edge it came in on, a node it already finished, a finished node elsewhere, no edge, a one-way edge, itself, and a restart at a searched node", () => {
    const triangle = named("A-B B-C C-A", "A");
    expect(missed(cycleDetectionAdapter, triangle, "B C B").kind).toBe("came-in");
    const tail = named("A-D A-B B-C C-A", "A");
    expect(missed(cycleDetectionAdapter, tail, "D D").kind).toBe("followed");
    expect(missed(cycleDetectionAdapter, tail, "D B C D").kind).toBe("not-neighbour");
    const directed = named("A>B A>C C>D C>B", "A");
    expect(missed(cycleDetectionAdapter, directed, "B C B").kind).toBe("finished");
    expect(missed(cycleDetectionAdapter, directed, "B C A").kind).toBe("wrong-way");
    expect(missed(cycleDetectionAdapter, directed, "B C C").kind).toBe("self");
    const apart = named("A>B C>D D>C", "A");
    expect(missed(cycleDetectionAdapter, apart, "B A").kind).toBe("searched");
  });

  it("Cycle detection on a mixed graph: a finished node whose two-way edges lead back closes the loop, the clue allows it, and a finished node with no way back is named for that", () => {
    // A–B and B–C two-way, A→C one-way; C→D one-way, so D is finished with no way back; A→D too.
    const mixed = named("A-B B-C A>C C>D A>D", "A");
    const run = (choose: ChoicePolicy) => cycleDetectionAdapter.events(mixed.input, choose);
    const [A, C, D] = ["A", "C", "D"].map(mixed.id);
    const { events, rejected } = steer(run, "B C D C".split(" ").map(mixed.id));
    expect(rejected, "C is a valid pick").toBeNull();
    const at = events.map((e) => e.type).lastIndexOf("decide");
    const decision = events[at] as DecideEvent;
    const frame = frameAt(events, at);
    expect(frame.current).toBe(A);
    expect(decision.options).toEqual([C]);
    expect(frame.finished).toContain(C);
    expect(accepted(decision, C, frame, "cycle-detection")).toBe(`Yes, ${nid(C)} closes the loop`);
    expect(clue("cycle-detection", decision, frame)).toBe(
      "A hint: the search goes on to a node not yet visited, or back to one still in progress, which closes a loop — a finished node closes one too when its two-way edges lead back to a node in progress",
    );
    expect(missed(cycleDetectionAdapter, mixed, "B C D D")).toEqual({
      kind: "finished", text: `${nid(D)} is already finished and nothing from it leads back to a node still in progress, so it can't close a loop`,
    });
  });

  it("Cycle detection on random graphs: the clue never rules out a valid pick, and a finished pick is named for having no way back only when nothing from it leads back to a node in progress", () => {
    let finishedOptions = 0;
    let finishedNamed = 0;
    for (const { seed, input } of randomGraphs(3000)) {
      const graph = input.adjacencyList;
      const events = cycleDetectionAdapter.events(input, pickThenRandom([], random(seed)));
      events.forEach((event, at) => {
        if (event.type !== "decide" || event.kind !== "next") return;
        const frame = frameAt(events, at);
        const node = frame.current as number;
        const inProgress = (id: number) => frame.settled.includes(id) && !frame.finished.includes(id);
        const words = clue("cycle-detection", event, frame);
        for (const option of event.options) {
          const where = `seed ${seed}: ${option} from ${node} at event ${at}`;
          if (!frame.finished.includes(option)) {
            expect(!frame.settled.includes(option) || inProgress(option), `${where}: unvisited or in progress`).toBe(true);
            continue;
          }
          finishedOptions += 1;
          expect(leadsBack(graph, frame, node, option), `${where}: leads back`).toBe(true);
          expect(words, `${where}: the clue allows a finished node`).toContain("a finished node closes one too");
        }
        const decision = events.slice(0, at).filter((e) => e.type === "decide").length;
        for (const pick of input.nodes.map((n) => n.id).filter((n) => !event.options.includes(n))) {
          const named = misconception("cycle-detection", events, { choice: pick, decision, event: at, decide: event }, graph);
          if (named.kind !== "finished") continue;
          finishedNamed += 1;
          expect(leadsBack(graph, frame, node, pick), `seed ${seed}: ${pick} from ${node} at event ${at}: nothing leads back`).toBe(false);
        }
      });
    }
    expect(finishedOptions, "finished nodes that close a loop").toBeGreaterThan(10);
    expect(finishedNamed, "finished picks named").toBeGreaterThan(100);
  });
});

/**
 * Whether going from `node` to the finished node `pick` can close a loop: along one of `node`'s
 * edges to `pick`, then on through finished nodes to a node still in progress, without using that
 * edge again (two-way edges between the same two nodes count as one). From the node in progress,
 * the search's own path leads down to `node`.
 */
function leadsBack(graph: AlgorithmInput["adjacencyList"], frame: Frame, node: number, pick: number): boolean {
  const inProgress = (id: number) => frame.settled.includes(id) && !frame.finished.includes(id);
  return (graph.get(node) ?? []).filter((e) => e.to === pick).some((first) => {
    const same = (e: EdgeInfo) => first.type === "undirected" && e.type === "undirected" && e.from === pick && e.to === node;
    const seen = new Set([pick]);
    const pending = [pick];
    while (pending.length > 0) {
      const at = pending.pop()!;
      for (const e of graph.get(at) ?? []) {
        if (same(e)) continue;
        if (inProgress(e.to)) return true;
        if (frame.finished.includes(e.to) && !seen.has(e.to)) {
          seen.add(e.to);
          pending.push(e.to);
        }
      }
    }
    return false;
  });
}

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

/** The runs every sequence of valid picks gives, as events. */
function steeredRuns(run: (choose: ChoicePolicy) => AlgorithmEvent[]): AlgorithmEvent[][] {
  const runs: AlgorithmEvent[][] = [];
  const pending: number[][] = [[]];
  while (pending.length > 0) {
    const picks = pending.pop()!;
    const { events } = steer(run, picks);
    const next = events.filter((e): e is DecideEvent => e.type === "decide")[picks.length];
    if (next) for (const option of next.options) pending.push([...picks, option]);
    else runs.push(events);
  }
  return runs;
}

/** The runs every sequence of valid picks gives (see `changesOf`). */
const everySteeredRun = (run: (choose: ChoicePolicy) => AlgorithmEvent[]) => new Set(steeredRuns(run).map(changesOf));

/**
 * The lures a fresh graph promises (see `freshGraph.ts`): per algorithm, the misconceptions a wrong
 * pick is named for that make it tempting. Dijkstra's and Prim's neighbour also hangs off the node
 * just taken by its lightest edge to a waiting node; cycle detection's one-way edge leads back to the
 * node just come from.
 */
const LURE_KINDS: Record<string, string[]> = {
  dijkstra: ["neighbour"], prims: ["neighbour"], bfs: ["other-parent"], dfs: ["wide"],
  "cycle-detection": ["finished", "followed", "came-in", "wrong-way"],
};

/** Fresh graphs checked per algorithm; Prim's over a thousand (D54). */
const SEEDS = 100;
const PRIMS_SEEDS = 1000;

describe("steering check: fresh graphs", () => {
  for (const id of FRESH_ALGORITHMS) {
    it(`${id}: every fresh graph is valid input that the app plays, and every run of it a learner can make matches the oracle and waits for the learner at a tie and at a lure`, () => {
      const adapter = ported.find((p) => p.adapter.metadata.id === id)!.adapter;
      const family = familyOf(id)!;
      const loops = { none: 0, reachable: 0, behind: 0 };
      const seeds = id === "prims" ? PRIMS_SEEDS : SEEDS;
      for (let seed = 1; seed <= seeds; seed++) {
        const fresh = freshGraph(id, seed);
        expect(fresh, `seed ${seed}`).not.toBeNull();
        const { graph, from, to } = fresh!;
        const built = buildRun(id, graph.nodes, graph.edges, from, to ?? undefined, { stepMode: true });
        expect(built && "run" in built, `seed ${seed}: the app plays it`).toBe(true);
        const input = (built as { run: { input: AlgorithmInput } }).run.input;
        const ids = input.nodes.map((n) => n.id);
        const edges = [...input.adjacencyList.values()].flat();
        expect(ids.length >= 5 && ids.length <= 8, `seed ${seed}: ${ids.length} nodes`).toBe(true);
        // Weighted graphs keep to 2 and up: the canvas leaves a weight of 1 unwritten.
        const least = id === "dijkstra" || id === "prims" ? 2 : 0;
        expect(edges.every((e) => e.weight >= least), `seed ${seed}: weights`).toBe(true);
        if (id === "prims") {
          expect(edges.every((e) => e.type === "undirected"), `seed ${seed}: undirected`).toBe(true);
          expect(reachable(input, from).size, `seed ${seed}: connected`).toBe(ids.length);
        }
        if (to !== null) expect(reachable(input, from).has(to), `seed ${seed}: destination reachable`).toBe(true);
        if (id === "cycle-detection") {
          const events = adapter.events(input);
          const kind = !hasCycle(input) ? "none" : events.some((e) => e.type === "decide" && e.kind === "restart") ? "behind" : "reachable";
          loops[kind] += 1;
        }

        const run = (choose: ChoicePolicy) => adapter.events(input, choose);
        /** Whether picking `wrong` at the decision `events[at]` is rejected and named for a lure. */
        const lures = (events: AlgorithmEvent[], at: number, wrong: number) => {
          const k = picksOf(events.slice(0, at)).length;
          const { events: steered, rejected } = steer(run, [...picksOf(events).slice(0, k), wrong]);
          if (!rejected) return false;
          const { kind } = misconception(id, steered, rejected, input.adjacencyList);
          if (!LURE_KINDS[family].includes(kind)) return false;
          if (kind === "wrong-way") {
            const { current } = frameAt(steered, rejected.event);
            const cameIn = steered.slice(0, rejected.event).filter((e) => e.type === "settle" && e.node === current);
            return cameIn.length > 0 && (cameIn[cameIn.length - 1] as { via?: number }).via === wrong;
          }
          if (family !== "dijkstra" && family !== "prims") return true;
          const { current, queue } = frameAt(steered, rejected.event);
          const out = (input.adjacencyList.get(current!) ?? []).filter((e) => queue.some((item) => item.id === e.to));
          return out.some((e) => e.to === wrong && e.weight === Math.min(...out.map((o) => o.weight)));
        };
        steeredRuns(run).forEach((events, r) => {
          const at = `seed ${seed}, run ${r}`;
          oracles[id](at, input, events);
          const turns = events.flatMap((e, i) => (e.type === "decide" && asks(id, events, i, input.adjacencyList) ? [i] : []));
          expect(turns.some((i) => (events[i] as DecideEvent).options.length > 1), `${at}: a tie`).toBe(true);
          const lured = turns.some((i) => ids.some((wrong) => !(events[i] as DecideEvent).options.includes(wrong) && lures(events, i, wrong)));
          expect(lured, `${at}: a lure`).toBe(true);
        });
      }
      // Cycle detection mixes it up (D53): about one graph in three has no loop; a loop is sometimes in reach of the first search, sometimes behind a new one.
      if (id === "cycle-detection") {
        expect(loops.none / seeds, JSON.stringify(loops)).toBeGreaterThan(0.2);
        expect(loops.none / seeds, JSON.stringify(loops)).toBeLessThan(0.5);
        expect(Math.min(loops.reachable, loops.behind), JSON.stringify(loops)).toBeGreaterThan(5);
      }
    });
  }
});

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

/**
 * A small graph with lettered nodes (ids are indexes into LABELS). Without `end` it has no destination.
 * An edge may name its own type, for a graph that mixes directed and undirected edges.
 */
function lettered(
  edges: Array<[number, number, number, EdgeInfo["type"]?]>, size: number, start: number, end?: number,
  { directed = false, weighted = true } = {},
): Lettered {
  const adjacencyList = new Map<number, EdgeInfo[]>(LABELS.slice(0, size).map((_, id) => [id, []]));
  for (const [from, to, weight, type = directed ? "directed" : "undirected"] of edges) {
    adjacencyList.get(from)!.push({ from, to, weight, type });
    if (type === "undirected") adjacencyList.get(to)!.push({ from: to, to: from, weight, type });
  }
  const input: AlgorithmInput = {
    adjacencyList,
    nodes: LABELS.slice(0, size).map((_, id) => ({ id })),
    startNodeId: start,
    endNodeId: end,
  };
  const edgeList = edges
    .map(([from, to, weight, type = directed ? "directed" : "undirected"]) =>
      `${LABELS[from]}${type === "directed" ? "→" : "–"}${LABELS[to]}${weighted ? ` ${weight < 0 ? `−${-weight}` : weight}` : ""}`)
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
  // A search that finds no cycle plays to its answer in Step mode; only Auto mode shows the message (see `buildRun`).
  const noCycle = events.some((e) => e.type === "answer" && e.kind === "cycle" && e.cycle === null);
  if (refusal) lines.push("", noCycle ? `In Auto mode the app says: ${plain(refusal)} In Step mode the run plays to its answer` : `The app says: ${plain(refusal)}`);
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
      transcript(
        cycleDetectionAdapter, "Mixed: the loop closes at a node already done",
        lettered([[0, 2, 1, "undirected"], [0, 1, 1, "directed"], [1, 2, 1, "undirected"]], 3, 0, undefined, unweighted),
      ),
      transcript(
        cycleDetectionAdapter, "Mixed: a directed and an undirected edge between the same two nodes",
        lettered([[0, 1, 1, "undirected"], [0, 1, 1, "directed"]], 2, 0, undefined, unweighted),
      ),
      transcript(
        cycleDetectionAdapter, "Mixed: no cycle",
        lettered([[0, 1, 1, "undirected"], [1, 2, 1, "directed"], [0, 2, 1, "directed"]], 3, 0, undefined, unweighted),
      ),
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
