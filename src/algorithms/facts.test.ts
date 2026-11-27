/**
 * Oracle checks for the graph facts (see the harness's TESTING.md): each fact against a deliberately
 * simple reference on the seeded random suite (directed, undirected and mixed graphs, self-loops,
 * parallel edges, graphs in pieces, single nodes, negative weights) and the empty graph, and the
 * evidence each fact names is real.
 */
import { describe, expect, it } from "vitest";
import { factList, graphFacts, NO_CYCLE, unmetNeed } from "./facts";
import type { AlgorithmInput, EdgeInfo } from "./types";
import { hasCycle, reachable } from "./engine/__tests__/oracles";
import { asUndirected, randomGraphs, withNegativeWeights, type RandomGraph } from "./engine/__tests__/randomGraphs";

const empty: RandomGraph = { seed: 0, input: { adjacencyList: new Map(), nodes: [], startNodeId: 0 } };
const random = randomGraphs(200);
const suite = [empty, ...random, ...random.map(asUndirected), ...random.map(withNegativeWeights)];

const edgesOf = (input: AlgorithmInput): EdgeInfo[] => [...input.adjacencyList.values()].flat();
const ids = (input: AlgorithmInput) => input.nodes.map((n) => n.id);
/** Whether some edge joins `a` and `b`, either way, arrows ignored. */
const touching = (input: AlgorithmInput, a: number, b: number) =>
  edgesOf(input).some((e) => (e.from === a && e.to === b) || (e.from === b && e.to === a));
/** The nodes `from` reaches when edges may be walked either way. */
const together = (input: AlgorithmInput, from: number) => reachable(asUndirected({ seed: 0, input }).input, from);

/** Whether the nodes split into two sides with every edge between them, by trying every split. */
function splitsInTwo(input: AlgorithmInput): boolean {
  const nodes = ids(input);
  for (let mask = 0; mask < 2 ** nodes.length; mask++) {
    const side = new Map(nodes.map((id, i) => [id, (mask >> i) & 1]));
    if (edgesOf(input).every((e) => side.get(e.from) !== side.get(e.to))) return true;
  }
  return false;
}

/** The edges below 0, an undirected one counted once (it is listed from each end; a self-loop once). */
const negativeCount = (input: AlgorithmInput) =>
  edgesOf(input).filter((e) => e.weight < 0 && (e.type === "directed" || e.from <= e.to)).length;

describe("oracle check: graph facts", () => {
  it("each fact matches a brute-force reference, and the evidence it names is real", () => {
    for (const { seed, input } of suite) {
      const at = `seed ${seed}`;
      const facts = graphFacts(input);
      const edges = edgesOf(input);

      // Direction.
      const types = new Set(edges.map((e) => e.type));
      expect(facts.direction, `${at}: direction`).toBe(types.size === 0 ? null : types.size === 2 ? "mixed" : [...types][0]);
      expect(facts.oneWay !== null, `${at}: a one-way edge`).toBe(types.has("directed"));
      if (facts.oneWay) expect(edges.some((e) => e.from === facts.oneWay!.from && e.to === facts.oneWay!.to && e.type === "directed"), `${at}: one-way edge is real`).toBe(true);

      // Connected, arrows ignored: the named node is out of reach, and the pieces are counted right.
      const pieces = new Set(ids(input).map((id) => [...together(input, id)].sort((a, b) => a - b).join(","))).size;
      const connected = ids(input).every((id) => together(input, ids(input)[0]).has(id));
      expect(facts.apart === null, `${at}: connected`).toBe(connected);
      if (facts.apart) {
        expect(together(input, facts.apart.from).has(facts.apart.to), `${at}: ${facts.apart.to} out of reach of ${facts.apart.from}`).toBe(false);
        expect(facts.apart.pieces, `${at}: pieces`).toBe(pieces);
      }

      // Cycle, as cycle detection has it: a real one, exactly when one exists.
      const cycle = facts.cycle;
      expect(cycle !== null, `${at}: cycle`).toBe(hasCycle(input));
      if (cycle) {
        const ways = (from: number, to: number) => (input.adjacencyList.get(from) ?? []).filter((e) => e.to === to);
        expect(new Set(cycle).size, `${at}: no node twice in ${cycle.join(", ")}`).toBe(cycle.length);
        cycle.forEach((from, i) => {
          const to = cycle[(i + 1) % cycle.length];
          expect(ways(from, to).length > 0, `${at}: edge ${from}→${to} exists`).toBe(true);
        });
        if (cycle.length === 2) {
          const [a, b] = cycle;
          expect([...ways(a, b), ...ways(b, a)].some((e) => e.type === "directed"), `${at}: ${a} and ${b} joined by a directed edge`).toBe(true);
        }
      }

      // Without a cycle, the panel says why in the words for how the edges go: only a mixed graph's walk may go against no arrow and retrace no edge.
      const said = factList(input, facts).find((f) => f.key === "cycle")?.why;
      if (!cycle && facts.direction) expect(said, `${at}: why no cycle`).toBe(NO_CYCLE[facts.direction]);

      // DAG: every edge directed, and no cycle.
      expect(facts.dag, `${at}: DAG`).toBe(edges.every((e) => e.type === "directed") && !hasCycle(input));

      // Bipartite, arrows ignored: the sides split every edge, or the loop is real and odd.
      expect(facts.sides !== null, `${at}: bipartite`).toBe(splitsInTwo(input));
      expect((facts.sides === null) !== (facts.oddCycle === null), `${at}: sides or an odd loop`).toBe(true);
      if (facts.sides) {
        const [one, other] = facts.sides;
        expect([...one, ...other].sort((a, b) => a - b), `${at}: every node on a side`).toEqual(ids(input).sort((a, b) => a - b));
        expect(edges.every((e) => one.includes(e.from) !== one.includes(e.to)), `${at}: every edge between the sides`).toBe(true);
      }
      if (facts.oddCycle) {
        const loop = facts.oddCycle;
        expect(loop.length % 2, `${at}: odd loop ${loop.join(", ")}`).toBe(1);
        expect(new Set(loop).size, `${at}: no node twice in ${loop.join(", ")}`).toBe(loop.length);
        loop.forEach((from, i) => {
          const to = loop[(i + 1) % loop.length];
          expect(touching(input, from, to), `${at}: ${from} and ${to} joined`).toBe(true);
        });
      }

      // Negative edges: each one real and below 0, all of them counted.
      expect(facts.negative.length, `${at}: negative edges`).toBe(negativeCount(input));
      for (const e of facts.negative) {
        expect(e.weight, `${at}: ${e.from}→${e.to} below 0`).toBeLessThan(0);
        expect(edges.includes(e as EdgeInfo), `${at}: ${e.from}→${e.to} is an edge`).toBe(true);
      }

      // Refusals: an algorithm refuses exactly when the fact it needs is missing, naming an edge that breaks it.
      const dijkstra = unmetNeed("Dijkstra's", ["no-negative-edges"], facts);
      expect(dijkstra !== undefined, `${at}: Dijkstra's refuses`).toBe(edges.some((e) => e.weight < 0));
      for (const edge of dijkstra?.evidence.edges ?? []) {
        expect(edges.some((e) => e.from === edge.from && e.to === edge.to && e.weight < 0), `${at}: lit edge is negative`).toBe(true);
      }
      const prims = unmetNeed("Prim's MST", ["undirected"], facts);
      expect(prims !== undefined, `${at}: Prim's refuses`).toBe(edges.some((e) => e.type === "directed"));
      for (const edge of prims?.evidence.edges ?? []) {
        expect(edges.some((e) => e.from === edge.from && e.to === edge.to && e.type === "directed"), `${at}: lit edge is one-way`).toBe(true);
      }
    }
  });
});
