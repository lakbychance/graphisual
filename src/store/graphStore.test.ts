/**
 * Editor integrity (see the harness's TESTING.md): seeded random editing sessions, driven the way
 * the UI drives the store, keep the graph consistent after every action, each action is one undo
 * step, and undo/redo walk all the way back to the empty graph and forward again. Run it's New graph
 * puts a consistent, cleanly drawn graph in place, one undo step each.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGraphStore } from "./graphStore";
import { useGraphHistoryStore } from "./graphHistoryStore";
import { canCreateEdge } from "../utils/graph/edgeUtils";
import { calculateAccurateCoords } from "../utils/geometry/calc";
import { EDGE_TYPE } from "../constants/graph";
import { VisualizationMode } from "../constants/visualization";
import { random } from "../algorithms/engine/__tests__/randomGraphs";
import { buildRun } from "../utils/visualization/buildRun";
import { FRESH_ALGORITHMS } from "../utils/visualization/freshGraph";
import { needsDestination } from "../utils/visualization/stepLink";
import type { Run } from "../utils/visualization/runView";

const store = () => useGraphStore.getState();

/** The graph as the history stores it, so two states compare exactly. */
const graphState = () => {
  const { nodes, edges, nodeCounter, stackingOrder } = store().data;
  return JSON.stringify({ nodes, edges: [...edges], nodeCounter, stackingOrder: [...stackingOrder] });
};

/** Describes the first way the graph is inconsistent, or returns null. */
function inconsistency(): string | null {
  const { nodes, edges, nodeCounter, stackingOrder } = store().data;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const ids = [...byId.keys()].sort((a, b) => a - b);
  const same = (other: Iterable<number>) => JSON.stringify([...other].sort((a, b) => a - b)) === JSON.stringify(ids);
  if (byId.size !== nodes.length) return "two nodes share an id";
  if (ids.some((id) => id > nodeCounter)) return `node counter ${nodeCounter} is behind a node id`;
  if (!same(edges.keys())) return "edge lists do not match the nodes";
  if (!same(stackingOrder)) return "stacking order does not match the nodes";

  for (const [owner, list] of edges) {
    const seen = new Set<number>();
    for (const edge of list) {
      const name = `edge ${edge.from}→${edge.to}`;
      const from = byId.get(edge.from);
      const to = byId.get(edge.to);
      if (edge.from !== owner) return `${name} is listed under node ${owner}`;
      if (!from || !to) return `${name} points at a missing node`;
      if (edge.from === edge.to) return `${name} is a self-loop`;
      if (seen.has(edge.to)) return `${name} appears twice`;
      seen.add(edge.to);
      const twin = edges.get(edge.to)?.find((e) => e.to === edge.from);
      if (edge.type === EDGE_TYPE.UNDIRECTED && (twin?.type !== EDGE_TYPE.UNDIRECTED || twin.weight !== edge.weight)) {
        return `undirected ${name} has no matching way back`;
      }
      const { tempX, tempY } = calculateAccurateCoords(from.x, from.y, to.x, to.y);
      if ([edge.x1, edge.y1, edge.nodeX2, edge.nodeY2, edge.x2, edge.y2].join() !== [from.x, from.y, to.x, to.y, tempX, tempY].join()) {
        return `${name} is drawn away from its nodes`;
      }
    }
  }
  return null;
}

/** One random editing action, as the UI offers it; returns false if it had nothing to act on. */
function act(rand: () => number): boolean {
  const int = (n: number) => Math.floor(rand() * n);
  const pick = <T,>(list: T[]): T | undefined => list[int(list.length)];
  const { nodes, edges } = store().data;
  const edge = pick([...edges.values()].flat());
  const hasReverse = (from: number, to: number) => (edges.get(to) ?? []).some((e) => e.to === from);

  switch (int(10)) {
    case 0:
    case 1:
      store().addNode(int(800), int(600));
      return true;
    case 2:
    case 3: {
      const [from, to] = [pick(nodes), pick(nodes)];
      if (!from || !to || !canCreateEdge(edges, from.id, to.id)) return false;
      store().addEdge(from, to);
      return true;
    }
    case 4: {
      if (nodes.length === 0) return false;
      store().deleteNodes(nodes.filter(() => rand() < 0.3).map((n) => n.id));
      return true;
    }
    case 5:
      if (!edge) return false;
      store().deleteEdge(edge.from, edge.to);
      return true;
    case 6: {
      // The edge popup only offers "undirected" when there is no edge the other way.
      if (!edge) return false;
      const undirected = edge.type === EDGE_TYPE.UNDIRECTED;
      if (!undirected && hasReverse(edge.from, edge.to)) return false;
      store().updateEdgeType(edge.from, edge.to, undirected ? EDGE_TYPE.DIRECTED : EDGE_TYPE.UNDIRECTED);
      return true;
    }
    case 7:
      if (!edge) return false;
      store().updateEdgeWeight(edge.from, edge.to, int(30) - 9);
      return true;
    case 8:
      // Also asked where the popup hides it (an edge the other way exists): the store must refuse.
      if (!edge || edge.type !== EDGE_TYPE.DIRECTED) return false;
      store().reverseEdge(edge.from, edge.to);
      return true;
    default: {
      if (nodes.length === 0) return false;
      if (rand() < 0.5) store().moveNode(pick(nodes)!.id, int(800), int(600));
      else store().moveNodes(nodes.filter(() => rand() < 0.5).map((n) => n.id), int(200) - 100, int(200) - 100);
      vi.runOnlyPendingTimers(); // a drag ends: its moves become one undo step
      return true;
    }
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  store().resetGraph();
  useGraphHistoryStore.setState({ past: [], future: [] });
  return () => vi.useRealTimers();
});

describe("editor integrity", () => {
  it("random editing sessions keep the graph consistent, and undo/redo retrace them exactly", () => {
    for (let seed = 1; seed <= 100; seed++) {
      store().resetGraph();
      useGraphHistoryStore.setState({ past: [], future: [] });
      const empty = graphState();
      const rand = random(seed);

      for (let step = 0; step < 60; step++) {
        const at = `seed ${seed} step ${step}`;
        if (rand() < 0.1) {
          (rand() < 0.5 ? store().undo : store().redo)();
          expect(inconsistency(), `${at}: after undo/redo`).toBeNull();
          continue;
        }
        const before = graphState();
        if (!act(rand)) continue;
        const after = graphState();
        expect(inconsistency(), at).toBeNull();
        if (after === before) continue;
        store().undo();
        expect(graphState(), `${at}: one undo restores the graph before the action`).toBe(before);
        store().redo();
        expect(graphState(), `${at}: redo brings the action back`).toBe(after);
      }

      const last = graphState();
      let undos = 0;
      for (; store().canUndo(); undos++) {
        store().undo();
        expect(inconsistency(), `seed ${seed}: undoing back`).toBeNull();
      }
      expect(graphState(), `seed ${seed}: undo reaches the empty graph`).toBe(empty);
      for (let i = 0; i < undos; i++) store().redo();
      expect(graphState(), `seed ${seed}: as many redos come back to the last graph`).toBe(last);
    }
  });

  it("New graph puts a fresh graph in place, drawn cleanly, with Run it waiting for the learner; undo walks back through each to the learner's own, and Bring it back returns to it however many fresh graphs are on top", () => {
    type Point = { x: number; y: number };
    const cross = (o: Point, a: Point, b: Point) => Math.sign((a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x));
    /** How far point p is from segment ab. */
    const away = (p: Point, a: Point, b: Point) => {
      const [dx, dy] = [b.x - a.x, b.y - a.y];
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
      return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
    };
    /** Describes the first way the graph on screen is not drawn cleanly, or returns null. */
    const untidy = (): string | null => {
      const { nodes, edges } = store().data;
      const at = new Map(nodes.map((n) => [n.id, n]));
      const xs = nodes.map((n) => n.x);
      const ys = nodes.map((n) => n.y);
      if (Math.max(...xs) - Math.min(...xs) > 640 || Math.max(...ys) - Math.min(...ys) > 420) return "wider or taller than the canvas box";
      if (new Set(nodes.map((n) => n.label)).size !== nodes.length) return "two nodes share a name";
      for (const a of nodes) {
        for (const b of nodes) if (a.id < b.id && Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r + 30) return `nodes ${a.id} and ${b.id} crowd`;
      }
      const lines = [...edges.values()].flat();
      for (const e of lines) {
        // A one-way edge bows out by up to half a radius.
        const room = (n: { r: number }) => n.r + (e.type === EDGE_TYPE.DIRECTED ? n.r / 2 : 0) + 10;
        const near = nodes.find((n) => n.id !== e.from && n.id !== e.to && away(n, at.get(e.from)!, at.get(e.to)!) < room(n));
        if (near) return `edge ${e.from}–${e.to} runs through node ${near.id}`;
        for (const f of lines) {
          if ([f.from, f.to].some((id) => id === e.from || id === e.to)) continue;
          const [a, b, c, d] = [e.from, e.to, f.from, f.to].map((id) => at.get(id)!);
          if (cross(c, d, a) * cross(c, d, b) < 0 && cross(a, b, c) * cross(a, b, d) < 0) return `edges ${e.from}–${e.to} and ${f.from}–${f.to} cross`;
        }
      }
      return null;
    };

    for (const algorithm of FRESH_ALGORITHMS) {
      store().resetGraph();
      useGraphHistoryStore.setState({ past: [], future: [] });
      // The learner's own graph, a triangle, with a run of it on screen.
      for (const [x, y] of [[0, 0], [200, 0], [100, 150]]) store().addNode(x, y);
      const [a, b, c] = store().data.nodes;
      for (const [from, to] of [[a, b], [b, c], [c, a]]) {
        store().addEdge(from, to);
        store().updateEdgeType(from.id, to.id, EDGE_TYPE.UNDIRECTED);
      }
      // An edit that changes nothing (a weight set to what it was): the history records the graph as it stands.
      store().updateEdgeWeight(a.id, b.id, store().data.edges.get(a.id)!.find((e) => e.to === b.id)!.weight);
      /** Starts a run of the graph on screen, as a learner tapping A (and B) does. */
      const runIt = () => {
        const { nodes, edges } = store().data;
        const [from, to] = [nodes[0].id, nodes[1].id];
        const built = buildRun(algorithm, nodes, edges, from, needsDestination(algorithm) ? to : undefined, { stepMode: true });
        store().setVisualizationMode(VisualizationMode.MANUAL);
        store().startVisualization((built as { run: Run }).run);
      };
      runIt();

      const shown = [graphState()];
      // Bring it back straight after the first fresh graph, then again after a second.
      expect(store().newRunItGraph(500), `${algorithm}: put aside`).toBe(true);
      store().bringBackOwnGraph();
      expect(graphState(), `${algorithm}: brought back after one`).toBe(shown[0]);
      runIt();
      for (const seed of [501, 502]) expect(store().newRunItGraph(seed), `${algorithm}: put aside again`).toBe(true);
      store().bringBackOwnGraph();
      expect(graphState(), `${algorithm}: brought back after two`).toBe(shown[0]);
      runIt();
      for (let seed = 1; seed <= 40; seed++) {
        const at = `${algorithm} seed ${seed}`;
        expect(store().newRunItGraph(seed), `${at}: the learner's own graph is put aside`).toBe(true);
        expect(inconsistency(), at).toBeNull();
        expect(untidy(), at).toBeNull();
        expect(graphState(), `${at}: a different graph`).not.toBe(shown[shown.length - 1]);
        expect(store().visualization.step.run.algorithmId, at).toBe(algorithm);
        expect(store().visualization.runIt?.turn, `${at}: Run it waits for the learner`).not.toBeNull();
        shown.push(graphState());
      }
      for (let i = shown.length - 2; i >= 0; i--) {
        store().undo();
        expect(graphState(), `${algorithm}: undo ${shown.length - 1 - i}`).toBe(shown[i]);
      }

      // Back to the fresh graphs by redo: they are still fresh, and the learner's own graph is behind them.
      for (let i = 0; i < 3; i++) store().redo();
      runIt();
      expect(store().newRunItGraph(1000), `${algorithm}: after redo`).toBe(true);
      runIt();
      expect(store().newRunItGraph(1001), `${algorithm}: again`).toBe(true);
      store().bringBackOwnGraph();
      expect(graphState(), `${algorithm}: brought back`).toBe(shown[0]);
      // The learner's own graph again: New graph puts it aside afresh.
      runIt();
      expect(store().newRunItGraph(1002), `${algorithm}: put aside afresh`).toBe(true);
      store().bringBackOwnGraph();
      expect(graphState(), `${algorithm}: brought back again`).toBe(shown[0]);

      // New graph, then the learner undoes back to their own graph by hand and edits it: Bring it
      // back (its toast still up) leaves the edit alone.
      runIt();
      expect(store().newRunItGraph(1003), `${algorithm}: put aside before an undo by hand`).toBe(true);
      store().undo();
      expect(graphState(), `${algorithm}: undone by hand`).toBe(shown[0]);
      store().addNode(320, 300);
      const edited = graphState();
      store().bringBackOwnGraph();
      expect(graphState(), `${algorithm}: the edit stays`).toBe(edited);
      store().undo();
      expect(graphState(), `${algorithm}: the edit is one undo step`).toBe(shown[0]);
    }
  });
});
