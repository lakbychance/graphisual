/**
 * Link checks (TESTING.md flow 5) for step links: a moment encodes and decodes to the same graph,
 * algorithm, endpoints and step, and opens on the same run, for every algorithm on the random
 * suite; malformed links are clamped or dropped part by part.
 */
import { describe, expect, it } from "vitest";
import { narrate } from "../../algorithms/engine";
import { largeGraph, random, randomGraphs, type RandomGraph } from "../../algorithms/engine/__tests__/randomGraphs";
import type { GraphEdge, GraphNode } from "../../components/Graph/types";
import { encodeGraphLink } from "../graph/graphLink";
import { generateWeighted, type GeneratedGraph } from "../graph/graphGenerator";
import { buildRun } from "./buildRun";
import { freshGraph } from "./freshGraph";
import { steerRun, takenAt } from "./runIt";
import type { Run } from "./runView";
import { decodeStepLink, encodeStepLink, linkToStep, needsDestination, type Moment } from "./stepLink";

const ALGORITHMS = ["dijkstra", "bellman-ford", "bfs", "dfs", "bfs-pathfinding", "dfs-pathfinding", "cycle-detection", "prims"];

/**
 * A suite graph drawn in the app: its edges added one by one in a shuffled order, an undirected
 * edge going into both its nodes' lists at once, as drawing one does. The edges a graph
 * code cannot carry are left out (self-loops, a second edge between the same two nodes). Ids stay
 * scattered, as after editing, and every third node is labelled.
 */
function appGraph({ seed, input }: RandomGraph, allUndirected = false): GeneratedGraph {
  const ids = [...input.adjacencyList.keys()];
  const nodes: GraphNode[] = ids.map((id, i) =>
    ({ id, x: Math.cos(i) * 200, y: Math.sin(i) * 200, r: 30, label: i % 3 === 0 ? `N${id}` : undefined }));
  const edges = new Map<number, GraphEdge[]>(ids.map((id) => [id, []]));
  const pairs = new Set<string>();
  const add = (from: number, to: number, weight: number, type: string) =>
    edges.get(from)!.push({ from, to, weight, type, x1: 0, y1: 0, x2: 0, y2: 0, nodeX2: 0, nodeY2: 0 });
  const shuffle = random(seed);
  const drawn = [...input.adjacencyList.values()].flat()
    .map((edge) => ({ edge, order: shuffle() }))
    .sort((a, b) => a.order - b.order);
  for (const { edge: { from, to, weight, type } } of drawn) {
    const pair = `${Math.min(from, to)}-${Math.max(from, to)}`;
    if (from === to || pairs.has(pair)) continue;
    pairs.add(pair);
    const undirected = allUndirected || type === "undirected";
    add(from, to, weight, undirected ? "undirected" : "directed");
    if (undirected) add(to, from, weight, "undirected");
  }
  return { nodes, edges, nodeCounter: Math.max(...ids) };
}

const nameOf = (graph: GeneratedGraph, id: number) => {
  const node = graph.nodes.find((n) => n.id === id)!;
  return node.label || String(node.id);
};

/** The graph as the learner sees it: node names in scan order, and each node's edges by name. */
const seen = (graph: GeneratedGraph) =>
  [...graph.edges].map(([id, list]) => [nameOf(graph, id), list.map((e) => `${nameOf(graph, e.to)} ${e.weight} ${e.type}`)]);

/** The run's narration with each node named as the canvas shows it. */
function narration(moment: Moment): string[] {
  const { algorithm, graph, from, to } = moment;
  const built = buildRun(algorithm, graph.nodes, graph.edges, from!, to ?? undefined, { stepMode: true });
  if (!built || !("run" in built)) return [];
  return narrate(built.run.events, algorithm).map((line) => line.replace(/\{n:(\d+)\}/g, (_, id) => nameOf(graph, Number(id))));
}

/** Nodes in a line, each joined to the next. */
const node = (id: number, label?: string): GraphNode => ({ id, x: id * 100, y: 0, r: 30, label });
const line = (nodes: GraphNode[]): GeneratedGraph => ({
  nodes,
  edges: new Map(nodes.map((n, i) => [n.id, nodes
    .filter((_, j) => Math.abs(i - j) === 1)
    .map((m) => ({ from: n.id, to: m.id, weight: 1, type: "undirected", x1: 0, y1: 0, x2: 0, y2: 0, nodeX2: 0, nodeY2: 0 }))])),
  nodeCounter: nodes.length,
});

describe("step link", () => {
  const suite = [...randomGraphs(200), largeGraph()];

  it.each(ALGORITHMS)("round-trips the graph, endpoints and step, and opens on the same run, Run it's fresh graphs included (%s)", (algorithm) => {
    const pick = random(7);
    let playable = 0;
    const cases = suite.map((graphCase) => ({
      where: `seed ${graphCase.seed}`,
      // Prim's refuses directed edges, so it runs on the graphs drawn undirected.
      graph: appGraph(graphCase, algorithm === "prims"),
      from: graphCase.input.startNodeId,
      to: needsDestination(algorithm) ? graphCase.input.endNodeId! : null,
    }));
    for (let seed = 1; seed <= 30; seed++) {
      const fresh = freshGraph(algorithm, seed);
      if (fresh) cases.push({ where: `fresh graph ${seed}`, ...fresh });
    }
    for (const { where, graph, from, to } of cases) {
      const built = buildRun(algorithm, graph.nodes, graph.edges, from, to ?? undefined, { stepMode: true });
      const total = built && "run" in built ? built.run.ends.length : 0;
      const moment: Moment = { algorithm, graph, from, to, step: total > 0 ? 1 + Math.floor(pick() * total) : null };
      const link = encodeStepLink(moment);
      expect(link, where).not.toBeNull();
      const decoded = decodeStepLink(link!.slice(1));
      expect(decoded?.algorithm, where).toBe(algorithm);
      expect(seen(decoded!.graph), where).toEqual(seen(graph));
      expect(decoded!.from === null ? null : nameOf(decoded!.graph, decoded!.from), where).toBe(nameOf(graph, from));
      expect(decoded!.to === null ? null : nameOf(decoded!.graph, decoded!.to), where).toBe(to === null ? null : nameOf(graph, to));
      expect(decoded!.step, where).toBe(moment.step);
      if (moment.step !== null) {
        expect(narration(decoded!), where).toEqual(narration(moment));
        playable++;
      }
    }
    expect(playable).toBeGreaterThan(50);
  });

  it("round-trips labels, spaces and characters the link must escape", () => {
    const graph = line([node(1, "Start"), node(2, "a b"), node(3, "x&y=z"), node(4, "#1?")]);
    const moment: Moment = { algorithm: "dfs-pathfinding", graph, from: 1, to: 4, step: 3 };
    const decoded = decodeStepLink(encodeStepLink(moment)!.slice(1))!;
    expect(seen(decoded.graph)).toEqual(seen(graph));
    expect([decoded.from, decoded.to, decoded.step]).toEqual([1, 4, 3]);
  });

  it.each([
    ["a label with a comma", line([node(1, "A,B"), node(2, "C")])],
    ["a label with a semicolon", line([node(1, "A"), node(2, "C;D")])],
    ["a label with a bar", line([node(1, "A|B"), node(2, "C")])],
    ["a label that is another node's id", line([node(1, "2"), node(2)])],
    ["more nodes than a link holds", line(Array.from({ length: 41 }, (_, i) => node(i + 1)))],
  ])("gives no link for a moment it cannot carry exactly: %s", (_why, graph) => {
    expect(encodeStepLink({ algorithm: "bfs", graph, from: 1, to: null, step: 1 })).toBeNull();
  });
});

describe("step link: the step on screen", () => {
  // The algorithms with choices to pick in Run it; Bellman-Ford's answers never change its run.
  const STEERED = ALGORITHMS.filter((a) => a !== "bellman-ford");

  it.each(STEERED)("links the step on screen while it is the run a link opens, and never once Run it's picks took it another way (%s)", (algorithm) => {
    const pick = random(11);
    let linked = 0;
    let refused = 0;
    for (const graphCase of randomGraphs(120)) {
      const graph = appGraph(graphCase, algorithm === "prims");
      const from = graphCase.input.startNodeId;
      const to = needsDestination(algorithm) ? graphCase.input.endNodeId! : undefined;
      const built = buildRun(algorithm, graph.nodes, graph.edges, from, to, { stepMode: true });
      if (!built || !("run" in built)) continue;
      const { run } = built;
      // The first decision with a second valid option, taken the other way.
      const at = run.events.findIndex((e) => e.type === "decide" && e.options.length > 1);
      const decision = run.events.slice(0, at).filter((e) => e.type === "decide").length;
      const other = at < 0 ? null : (run.events[at] as { options: number[] }).options[1];
      const steered = other === null ? run : steerRun(run, [...takenAt(run).slice(0, decision), other]).run;
      for (const shown of [run, steered]) {
        const index = Math.floor(pick() * shown.ends.length);
        const link = linkToStep(shown, index, graph);
        // The steered run is the run a link opens up to the step that shows the other pick.
        const same = shown === run || shown.ends[index] <= at;
        if (!same) {
          expect(link, `seed ${graphCase.seed}`).toEqual({ none: "picks" });
          refused++;
          continue;
        }
        expect(typeof link, `seed ${graphCase.seed}`).toBe("string");
        const opened = decodeStepLink((link as string).slice(1))!;
        expect([opened.step, opened.from === null ? null : nameOf(opened.graph, opened.from)], `seed ${graphCase.seed}`)
          .toEqual([index + 1, nameOf(graph, from)]);
        linked++;
      }
    }
    expect(linked).toBeGreaterThan(50);
    expect(refused).toBeGreaterThan(5);
  });

  /** A run's events up to step `index` with every node id as the name the canvas shows. */
  const NODE_FIELDS = new Set(["node", "from", "to", "via", "ties", "through", "parent", "options", "start", "target", "path", "order", "unreached", "cycle"]);
  const byName = (run: Run, graph: GeneratedGraph, index: number) => {
    const name = (v: unknown) => (typeof v === "number" ? nameOf(graph, v) : v);
    return JSON.stringify([run.ends.slice(0, index + 1), run.events.slice(0, run.ends[index])], (key, value) =>
      !NODE_FIELDS.has(key) ? value : Array.isArray(value) ? value.map(name) : name(value));
  };

  it.each(ALGORITHMS)("opens the very steps on screen, node for node, when the node list keeps another order than the edges (%s)", (algorithm) => {
    const pick = random(23);
    // The Weighted graph lists node 6 among the nodes but scans it late; suite graphs get their node list shuffled.
    const graphs = [generateWeighted(), ...randomGraphs(150).map((graphCase) => {
      const graph = appGraph(graphCase, algorithm === "prims");
      const shuffle = random(graphCase.seed + 1);
      return { ...graph, nodes: graph.nodes.map((n) => ({ n, o: shuffle() })).sort((a, b) => a.o - b.o).map(({ n }) => n) };
    })];
    let linked = 0;
    for (const graph of graphs) {
      for (const start of graph.nodes.slice(0, 4)) {
        const end = needsDestination(algorithm) ? graph.nodes[graph.nodes.length - 1].id : undefined;
        const built = buildRun(algorithm, graph.nodes, graph.edges, start.id, end, { stepMode: true });
        if (!built || !("run" in built)) continue;
        const { run } = built;
        for (const index of [run.ends.length - 1, Math.floor(pick() * run.ends.length)]) {
          // Every such moment has a link (nothing here is one a link cannot carry)...
          const link = linkToStep(run, index, graph);
          expect(typeof link, JSON.stringify(link)).toBe("string");
          if (typeof link !== "string") continue;
          // ...and it opens on the very steps on screen.
          const opened = decodeStepLink(link.slice(1))!;
          const reopened = buildRun(algorithm, opened.graph.nodes, opened.graph.edges, opened.from!, opened.to ?? undefined, { stepMode: true });
          expect(reopened && "run" in reopened, link).toBe(true);
          expect(opened.step, link).toBe(index + 1);
          expect(byName((reopened as { run: Run }).run, opened.graph, index), link).toBe(byName(run, graph, index));
          linked++;
        }
      }
    }
    expect(linked).toBeGreaterThan(100);
  });

  it.each([
    ["too many nodes", line(Array.from({ length: 41 }, (_, i) => node(i + 1))), { none: "size" }],
    ["a name with a comma", line([node(1, "A"), node(2, "C,D")]), { none: "names", name: "C,D" }],
    ["a label that is another node's id", line([node(1, "2"), node(2)]), { none: "same-name", name: "2" }],
    ["an edge each way between two nodes", {
      ...line([node(1, "A"), node(2, "B")]),
      edges: new Map([
        [1, [{ from: 1, to: 2, weight: 1, type: "directed", x1: 0, y1: 0, x2: 0, y2: 0, nodeX2: 0, nodeY2: 0 }]],
        [2, [{ from: 2, to: 1, weight: 1, type: "directed", x1: 0, y1: 0, x2: 0, y2: 0, nodeX2: 0, nodeY2: 0 }]],
      ]),
    }, { none: "two-way", name: "A", other: "B" }],
  ])("says why a graph has no link: %s", (_why, graph, why) => {
    const built = buildRun("bfs", graph.nodes, graph.edges, 1, undefined, { stepMode: true });
    expect(linkToStep((built as { run: Run }).run, 0, graph)).toEqual(why);
  });
});

describe("step link: malformed input", () => {
  // A, B and C in a line (A–B undirected, B→C directed), and D on its own.
  const graph = encodeURIComponent(encodeGraphLink({
    nodes: [{ x: 0, y: 0, label: "A" }, { x: 100, y: 0, label: "B" }, { x: 200, y: 0, label: "C" }, { x: 300, y: 0, label: "D" }],
    edges: [{ from: 0, to: 1, weight: 2, directed: false }, { from: 1, to: 2, weight: 3, directed: true }],
  }));
  const open = (query: string) => decodeStepLink(`?${query}`);
  const steps = (query: string) => {
    const moment = open(query)!;
    const built = buildRun(moment.algorithm, moment.graph.nodes, moment.graph.edges, moment.from!, moment.to ?? undefined, { stepMode: true });
    return built && "run" in built ? built.run.ends.length : 0;
  };

  it.each([
    ["", "no algorithm"],
    ["algorithm=quicksort", "unknown algorithm"],
    ["algorithm=", "empty algorithm"],
  ])("opens nothing for %j (%s)", (query) => {
    expect(open(query)).toBeNull();
  });

  it("keeps today's links: algorithm and graph only, waiting for a tap", () => {
    const moment = open(`algorithm=dijkstra&graph=${graph}`)!;
    expect(moment.graph.nodes.map((n) => n.label)).toEqual(["A", "B", "C", "D"]);
    expect([moment.from, moment.to, moment.step]).toEqual([null, null, null]);
  });

  it("opens a fixed own graph at the step when the link carries no graph", () => {
    const moment = open("algorithm=dijkstra&from=1&to=12&step=3")!;
    expect(moment.graph.nodes).toHaveLength(12);
    expect(moment.step).toBe(3);
    expect(open("algorithm=cycle-detection&from=1&step=12")!.step).toBe(12);
  });

  it.each(["bfs", "dfs", "bfs-pathfinding", "dfs-pathfinding", "prims"])(
    "ignores nodes and step without a graph where the own graph is random (%s)", (algorithm) => {
      const moment = open(`algorithm=${algorithm}&from=1&to=2&step=3`)!;
      expect([moment.from, moment.to, moment.step]).toEqual([null, null, null]);
    });

  it.each([
    ["1,2,A|0,0,1,u", "a self-loop"],
    ["", "an empty code"],
    [Array.from({ length: 41 }, (_, i) => `${i},0,`).join(";"), "too many nodes"],
  ])("opens the own graph waiting for a tap when the graph code is malformed (%s)", (code) => {
    const moment = open(`algorithm=dijkstra&graph=${encodeURIComponent(code)}&from=1&to=2&step=3`)!;
    expect(moment.graph.nodes).toHaveLength(12);
    expect([moment.from, moment.to, moment.step]).toEqual([null, null, null]);
  });

  it.each([
    ["step=2", 2],
    ["", 1],
    ["step=", 1],
    ["step=abc", 1],
    ["step=2.5", 1],
    ["step=0", 1],
    ["step=-4", 1],
    ["step=9999", "last"],
  ])("clamps the step for %j", (stepPart, expected) => {
    const query = `algorithm=dijkstra&graph=${graph}&from=A&to=C&${stepPart}`;
    expect(open(query)!.step).toBe(expected === "last" ? steps(query) : expected);
  });

  it.each([
    ["algorithm=bfs&graph=G&step=3", "a step with no start", { from: null, to: null, step: null }],
    ["algorithm=bfs&graph=G&from=Z&step=3", "an unknown start", { from: null, to: null, step: null }],
    ["algorithm=dijkstra&graph=G&from=A&to=Z&step=3", "an unknown destination", { from: 1, to: null, step: null }],
    ["algorithm=dijkstra&graph=G&from=A&step=3", "a missing destination", { from: 1, to: null, step: null }],
    ["algorithm=dijkstra&graph=G&from=A&to=D&step=3", "an unreachable destination", { from: 1, to: 4, step: null }],
    ["algorithm=bfs&graph=G&from=A&to=C&step=2", "a destination the algorithm does not take", { from: 1, to: null, step: 2 }],
  ])("drops what it cannot honour: %s (%s)", (query, _why, expected) => {
    const moment = open(query.replace("G", graph))!;
    expect({ from: moment.from, to: moment.to, step: moment.step }).toEqual(expected);
  });

  it("names no node when two share the name", () => {
    const twins = encodeURIComponent("0,0,A;100,0,A|0,1,1,u");
    expect(open(`algorithm=bfs&graph=${twins}&from=A&step=1`)!.from).toBeNull();
  });
});
