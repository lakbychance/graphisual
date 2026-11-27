/**
 * Editor integrity (see the harness's TESTING.md): seeded random editing sessions, driven the way
 * the UI drives the store, keep the graph consistent after every action, each action is one undo
 * step, and undo/redo walk all the way back to the empty graph and forward again. Run it's New graph
 * puts a consistent, cleanly drawn graph in place, one undo step each. The text panel (one edge per
 * line) round-trips any graph, stays in step with the canvas both ways in any mix of edits, shares
 * one undo history with it, and never lets malformed text touch the graph.
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
import { followCanvas, MAX_TEXT, meaningOf, meaningOfList, nameOf, readEdgeList, textAfterCommit, textOf, whyNotWritable, writeEdgeList, type TextState } from "../utils/graph/edgeList";

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

/* ------------------------------------------------------------ the text panel */

/** Names a learner might type: letters, numbers that sort differently as text ("10" < "2"), a dash inside, five characters. */
const NAMES = ["A", "B", "C", "D", "E", "F", "2", "10", "x1", "s-t", "Node5", "−1"];

/** The graph on the canvas, by name (see `meaningOf`). */
const canvasMeaning = () => meaningOf(store().data.nodes, store().data.edges);
const meaningOfText = (text: string) => {
  const { list } = readEdgeList(text);
  return list && meaningOfList(list);
};

/** A random graph as a learner might type it: any spelling of an edge, weights or none, lone nodes, notes and blank lines. */
function typedGraph(rand: () => number): string {
  const int = (n: number) => Math.floor(rand() * n);
  const names = NAMES.filter(() => rand() < 0.5);
  const lines: string[] = [];
  const pairs = new Set<string>();
  for (const a of names) {
    for (const b of names) {
      if (a === b || rand() > 0.35) continue;
      const directed = rand() < 0.5;
      // One edge per pair, except one-way edges in opposite directions.
      if (pairs.has(`${a} ${b}`) || pairs.has(`${b} ${a}`) && (!directed || !pairs.has(`>${b} ${a}`))) continue;
      pairs.add(`${a} ${b}`);
      if (directed) pairs.add(`>${a} ${b}`);
      const link = directed ? ["->", ">", "→", "->"][int(4)] : ["", "-", "--", ""][int(4)];
      const glued = directed && rand() < 0.3;
      const weight = rand() < 0.3 ? "" : ` ${int(40) - 15}`;
      lines.push(glued ? `${a}${link}${b}${weight}` : `${a} ${link ? `${link} ` : ""}${b}${weight}`.replace(/ +/g, rand() < 0.2 ? "   " : " "));
    }
  }
  for (const name of names) if (rand() < 0.3) lines.splice(int(lines.length + 1), 0, name);
  if (rand() < 0.3) lines.splice(int(lines.length + 1), 0, "# my homework graph");
  if (rand() < 0.3) lines.splice(int(lines.length + 1), 0, "");
  if (lines.length > 0 && rand() < 0.3) lines[0] += "  # a note";
  return lines.join(rand() < 0.1 ? "\r\n" : "\n");
}

/** Lines that do not read, and the line each problem is on. */
const MALFORMED: Array<[string, number]> = [
  ["A B\nA B x", 2], ["A ->", 1], ["-> B", 1], ["A - ", 1], ["A A", 1], ["A B 1000", 1], ["A B 2.5", 1],
  ["Alphabet B", 1], ["A* B", 1], ["A B 3 4", 1], ["A B C", 1], ["A B -> C", 1], ["A -> B -> C", 1],
  ["A B\nB A", 2], ["A -> B\nA B", 2], ["A B 2\n\n# note\nB -> A", 4], ["A -> B\nA > B 3", 2],
  [Array.from({ length: 41 }, (_, i) => `N${i}`).join("\n"), 0],
  [Array.from({ length: 201 }, (_, i) => `${i % 20} ${20 + Math.floor(i / 20)}`).join("\n"), 0],
  ["A B\n".repeat(MAX_TEXT), 0],
  // An arrow or dash anywhere but once between two names.
  ["A -> ->", 1], ["C - -", 1], ["A -> - 4", 1], ["A - ->", 1], ["9>→", 1], ["B -> >", 1], ["1->-", 1],
  ["A -> -> B", 1], ["A->->B", 1], ["A>>B", 1], ["A - - B", 1], ["A - > B", 1],
];

/** Lines whose problem is easy to misread, and the words that must name it truly. */
const TRUE_PROBLEMS: Array<[string, string]> = [
  ["A -> -> B", "one arrow or dash between two names"], ["A->->B", "one arrow or dash between two names"],
  ["A>>B", "one arrow or dash between two names"], ["A - - B", "one arrow or dash between two names"],
  ["A - > B", "one arrow or dash between two names"], ["A -> ->", "one arrow or dash between two names"],
  ["A B x", "weight"], ["A B -> C", "one edge per line"], ["A ->", "a node on each side"],
  [Array.from({ length: 45 }, (_, i) => `N${i}`).join("\n"), "the edge list holds at most 40 nodes; this one has 45"],
];

/** One edit a learner might make to the text: a line added, removed or changed, a rename, a note, garbage, or a whole new graph. */
function editText(rand: () => number, text: string): string {
  const int = (n: number) => Math.floor(rand() * n);
  const pick = <T,>(list: T[]): T => list[int(list.length)];
  const lines = text.split("\n");
  const at = int(lines.length + 1);
  switch (int(8)) {
    case 0:
      lines.splice(at, 0, `${pick(NAMES)} ${pick(["", "-> ", "> "])}${pick(NAMES)}${rand() < 0.5 ? ` ${int(20) - 5}` : ""}`);
      break;
    case 1:
      lines.splice(int(lines.length), 1);
      break;
    case 2: {
      const i = int(lines.length);
      lines[i] = /\s-?\d+$/.test(lines[i]) ? lines[i].replace(/-?\d+$/, String(int(20))) : `${lines[i]} ${int(20)}`;
      break;
    }
    case 3: {
      const [from, to] = [pick(NAMES), pick(NAMES)];
      return lines.map((line) => line.split(" ").map((word) => (word === from ? to : word)).join(" ")).join("\n");
    }
    case 4:
      lines.splice(at, 0, pick(["", "# note", "   "]));
      break;
    case 5:
      lines.splice(at, 0, pick(MALFORMED)[0].split("\n").pop()!);
      break;
    case 6:
      lines.splice(at, 0, Array.from({ length: 1 + int(12) }, () => pick([..."AB1 ->#*−.\t→9xé"])).join(""));
      break;
    default:
      return typedGraph(rand);
  }
  return lines.join("\n");
}

describe("editor integrity: the text panel", () => {
  const anchor = { x: 40, y: -20 };

  it("round-trips: typed text draws the graph it says, the graph's text says the same graph, and that text redraws it", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const at = `seed ${seed}`;
      store().resetGraph();
      const typed = typedGraph(random(seed));
      expect(store().applyEdgeListText(typed, anchor), at).toEqual([]);
      expect(inconsistency(), at).toBeNull();
      expect(canvasMeaning(), at).toBe(meaningOfText(typed));

      const written = writeEdgeList(store().data.nodes, store().data.edges);
      expect(meaningOfText(written), `${at}: the graph's text`).toBe(canvasMeaning());
      const drawn = graphState();
      expect(store().applyEdgeListText(written, anchor), at).toEqual([]);
      expect(graphState(), `${at}: its own text changes nothing`).toBe(drawn);

      store().resetGraph();
      store().applyEdgeListText(written, anchor);
      expect(canvasMeaning(), `${at}: the graph's text redraws it`).toBe(meaningOfText(typed));
    }
  });

  it.each(MALFORMED.map(([text, line]) => [text.slice(0, 24).replace(/\n/g, "⏎"), text, line] as const))(
    "malformed text never touches the graph, and says which line is wrong: %s", (_name, text, line) => {
      store().applyEdgeListText("A B 3\nB -> C 2\nD", anchor);
      const before = graphState();
      const history = useGraphHistoryStore.getState().past.length;
      const problems = store().applyEdgeListText(text, anchor);
      expect(problems.map((p) => p.line)).toContain(line);
      expect(problems.every((p) => p.text.length > 0)).toBe(true);
      expect(graphState()).toBe(before);
      expect(useGraphHistoryStore.getState().past.length).toBe(history);
    });

  it("canvas and text edits in any mix keep the two in step, each change is one undo step across both, and undo/redo walk back through them all", () => {
    for (let seed = 1; seed <= 100; seed++) {
      store().resetGraph();
      useGraphHistoryStore.setState({ past: [], future: [] });
      const empty = graphState();
      const rand = random(seed);
      // The panel's text, as `TextPanel` keeps it.
      let panel: TextState = textOf(store().data.nodes, store().data.edges);
      /** The panel follows the canvas: it says what the canvas shows, unless the canvas has a name text can't write. */
      const follow = (at: string) => {
        panel = followCanvas(panel, store().data.nodes, store().data.edges);
        // (A draft that does not read stays, with its problems shown, while the canvas says the same as before.)
        const unread = meaningOfText(panel.text) === null && panel.meaning === canvasMeaning();
        if (!whyNotWritable(store().data.nodes) && !unread) expect(meaningOfText(panel.text), `${at}: the text says what the canvas shows`).toBe(canvasMeaning());
      };

      for (let step = 0; step < 60; step++) {
        const at = `seed ${seed} step ${step}`;
        const r = rand();
        if (r < 0.1) {
          (rand() < 0.5 ? store().undo : store().redo)();
          expect(inconsistency(), `${at}: after undo/redo`).toBeNull();
          follow(at);
          continue;
        }
        const before = graphState();
        const places = new Map(store().data.nodes.map((n) => [n.id, `${n.x},${n.y}`]));
        if (r < 0.45) {
          // An edit on the canvas: any editing action, or a rename (sometimes to a name another node has, or one text can't write).
          const { nodes } = store().data;
          if (rand() < 0.2 && nodes.length > 0) store().updateNodeLabel(nodes[Math.floor(rand() * nodes.length)].id, [...NAMES, "", "a b", "#1", "A"][Math.floor(rand() * 15)]);
          else if (!act(rand)) continue;
        } else {
          const text = editText(rand, panel.text);
          const unwritable = whyNotWritable(store().data.nodes);
          const problems = store().applyEdgeListText(text, anchor);
          if (problems.length > 0 || unwritable) {
            panel = textAfterCommit(text, store().data.nodes, store().data.edges);
            expect(graphState(), `${at}: text that does not read leaves the graph alone`).toBe(before);
            expect(problems.length > 0, `${at}: and says why`).toBe(true);
            continue;
          }
          expect(canvasMeaning(), `${at}: the canvas shows what the text says`).toBe(meaningOfText(text));
          for (const node of store().data.nodes) {
            if (places.has(node.id)) expect(`${node.x},${node.y}`, `${at}: node ${node.id} stays where it was`).toBe(places.get(node.id));
          }
          panel = textAfterCommit(text, store().data.nodes, store().data.edges);
          expect(followCanvas(panel, store().data.nodes, store().data.edges).text, `${at}: the learner's text stays as written`).toBe(text);
        }
        const after = graphState();
        expect(inconsistency(), at).toBeNull();
        // After a text edit the undo below comes straight after it, before any redraw (Cmd+Z in the text).
        if (r < 0.45) follow(at);
        if (after === before) continue;
        store().undo();
        expect(graphState(), `${at}: one undo restores the graph before the edit`).toBe(before);
        follow(`${at} undone`);
        store().redo();
        expect(graphState(), `${at}: redo brings the edit back`).toBe(after);
        follow(`${at} redone`);
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

  it.each(TRUE_PROBLEMS)("says what is truly wrong with %j", (text, words) => {
    expect(readEdgeList(text).problems[0]?.text).toContain(words);
  });

  it("Undo in the text straight after typing, before the pause, takes back the typing and the text follows", () => {
    store().applyEdgeListText("A B\nB C", anchor);
    let panel = textOf(store().data.nodes, store().data.edges);
    const typed = `${panel.text}\nC D`;
    // Cmd+Z: what was typed is handed over, then undone, in one keypress.
    store().applyEdgeListText(typed, anchor);
    panel = textAfterCommit(typed, store().data.nodes, store().data.edges);
    store().undo();
    panel = followCanvas(panel, store().data.nodes, store().data.edges);
    expect(meaningOfText(panel.text)).toBe(canvasMeaning());
    expect(panel.text).not.toContain("D");
    store().redo();
    panel = followCanvas(panel, store().data.nodes, store().data.edges);
    expect(meaningOfText(panel.text)).toBe(canvasMeaning());
    expect(panel.text).toContain("C D");
  });

  it("a node named with a number never shares its name with a node added on the canvas later", () => {
    const names = () => store().data.nodes.map(nameOf);
    const addSome = (count: number) => { for (let i = 0; i < count; i++) store().addNode(i * 150, 400); };
    // Typed on an empty canvas.
    store().applyEdgeListText("5 6", anchor);
    addSome(6);
    expect(whyNotWritable(store().data.nodes)).toBeNull();
    expect(new Set(names()).size).toBe(names().length);
    // A numbered node renamed in the text.
    store().resetGraph();
    addSome(3);
    store().applyEdgeListText("1 2\n3", anchor);
    store().applyEdgeListText("1 2\n7", anchor);
    addSome(6);
    expect(whyNotWritable(store().data.nodes)).toBeNull();
    expect(new Set(names()).size).toBe(names().length);
  });

  it("renaming nodes in the text keeps them in their places: one at a time, or all at once", () => {
    for (let seed = 1; seed <= 150; seed++) {
      const at = `seed ${seed}`;
      store().resetGraph();
      store().applyEdgeListText(typedGraph(random(seed)), anchor);
      const places = () => store().data.nodes.map((n) => `${n.id}@${n.x},${n.y}`).sort();
      const shown = places();
      const placeOf = (name: string) => store().data.nodes.find((n) => nameOf(n) === name);
      /** The graph's text with each name given by `map`. */
      const rename = (map: (name: string) => string) =>
        writeEdgeList(store().data.nodes.map((n) => ({ ...n, label: map(nameOf(n)) })), store().data.edges);
      if (store().data.nodes.length === 0) continue;

      // One node renamed: it is the same node, in the same place.
      const one = nameOf(store().data.nodes[seed % store().data.nodes.length]);
      const node = placeOf(one)!;
      expect(store().applyEdgeListText(rename((w) => (w === one ? "Zed" : w)), anchor), at).toEqual([]);
      const moved = placeOf("Zed");
      expect([moved?.id, moved?.x, moved?.y], `${at}: ${one} renamed Zed`).toEqual([node.id, node.x, node.y]);
      expect(places(), at).toEqual(shown);

      // Every node renamed at once: every node stays where it was (nodes no edge tells apart may swap names).
      const fresh = new Map(store().data.nodes.map((n, i) => [nameOf(n), `R${i}`]));
      expect(store().applyEdgeListText(rename((w) => fresh.get(w) ?? w), anchor), at).toEqual([]);
      expect(places(), `${at}: all renamed`).toEqual(shown);
      expect(inconsistency(), at).toBeNull();
    }
  });

  it("a canvas bigger than the edge list's limits can still be trimmed in the text, and growing it says how big it is", () => {
    for (let i = 0; i < 45; i++) store().addNode((i % 9) * 130, Math.floor(i / 9) * 130);
    const text = writeEdgeList(store().data.nodes, store().data.edges);
    const problems = store().applyEdgeListText(`${text}\nExtra`, anchor);
    expect(problems.map((p) => p.text)).toEqual(["the edge list holds at most 40 nodes; this graph already has 45, so the text can't add more"]);
    expect(store().data.nodes).toHaveLength(45);
    expect(store().applyEdgeListText(text.split("\n").slice(1).join("\n"), anchor)).toEqual([]);
    expect(store().data.nodes).toHaveLength(44);
    expect(store().applyEdgeListText(`${text}\nMore`, anchor).map((p) => p.text))
      .toEqual(["the edge list holds at most 40 nodes; this graph already has 44, so the text can't add more"]);
  });

  it("a node named 99999, in the text or on the canvas, never pushes later canvas nodes to six-digit names", () => {
    const names = () => store().data.nodes.map(nameOf);
    store().applyEdgeListText("A 99999", anchor);
    for (let i = 0; i < 3; i++) store().addNode(i * 150, 300);
    expect(names().every((n) => n.length <= 5) && new Set(names()).size === names().length, names().join(",")).toBe(true);
    expect(whyNotWritable(store().data.nodes)).toBeNull();
    store().resetGraph();
    store().addNode(0, 0);
    expect(store().updateNodeLabel(store().data.nodes[0].id, "99999")).toBeNull();
    for (let i = 0; i < 3; i++) store().addNode(i * 150, 300);
    expect(names().every((n) => n.length <= 5) && new Set(names()).size === names().length, names().join(",")).toBe(true);
  });

  it("no two nodes ever show the same name, whatever mix of text edits, renames, cleared names, adds, deletes, undo and redo (D68)", () => {
    const LABELS = ["", "", "A", "B", "1", "2", "3", "5", "7", "9", "10", "12", "99999", "99998"];
    for (let seed = 1; seed <= 300; seed++) {
      store().resetGraph();
      useGraphHistoryStore.setState({ past: [], future: [] });
      const rand = random(seed * 31 + 7);
      const int = (n: number) => Math.floor(rand() * n);
      const pick = <T,>(list: T[]): T => list[int(list.length)];
      for (let step = 0; step < 50; step++) {
        const at = `seed ${seed} step ${step}`;
        const { nodes } = store().data;
        const r = rand();
        if (r < 0.2) store().addNode(int(900), int(900));
        else if (r < 0.4 && nodes.length > 0) {
          const node = pick(nodes);
          const label = pick(LABELS);
          const name = label || String(node.id);
          const shownElsewhere = nodes.some((n) => n.id !== node.id && nameOf(n) === name);
          const before = graphState();
          const refused = store().updateNodeLabel(node.id, label);
          expect(refused, `${at}: renaming ${nameOf(node)} to ${name}`).toBe(shownElsewhere ? name : null);
          if (refused !== null) expect(graphState(), `${at}: a refused rename changes nothing`).toBe(before);
        } else if (r < 0.5 && nodes.length > 0) store().deleteNodes([pick(nodes).id]);
        else if (r < 0.6) (rand() < 0.5 ? store().undo : store().redo)();
        else {
          const names = nodes.map(nameOf).map((n) => (rand() < 0.3 ? pick(LABELS.filter(Boolean)) : n));
          const extra = rand() < 0.6 ? [`${pick(LABELS.filter(Boolean))} ${pick(LABELS.filter(Boolean))}`] : [];
          store().applyEdgeListText([...new Set([...names, ...extra])].join("\n"), anchor);
        }
        const shown = store().data.nodes.map(nameOf);
        expect(shown.find((n, i) => shown.indexOf(n) !== i), `${at}: a name shown twice in ${shown.join(",")}`).toBeUndefined();
        expect(shown.find((n) => n.length > 5), `${at}: a name too long to write or share`).toBeUndefined();
        expect(inconsistency(), at).toBeNull();
      }
    }
  });
});
