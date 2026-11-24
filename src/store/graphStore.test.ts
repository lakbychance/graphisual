/**
 * Editor integrity (see the harness's TESTING.md): seeded random editing sessions, driven the way
 * the UI drives the store, keep the graph consistent after every action, each action is one undo
 * step, and undo/redo walk all the way back to the empty graph and forward again.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGraphStore } from "./graphStore";
import { useGraphHistoryStore } from "./graphHistoryStore";
import { canCreateEdge } from "../utils/graph/edgeUtils";
import { calculateAccurateCoords } from "../utils/geometry/calc";
import { EDGE_TYPE } from "../constants/graph";
import { random } from "../algorithms/engine/__tests__/randomGraphs";

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
});
