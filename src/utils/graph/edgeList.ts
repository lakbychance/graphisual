/**
 * The graph as text, one edge per line, kept in step with the canvas (the text panel):
 *
 *   A B 4      a two-way edge between A and B that weighs 4 (no weight: it weighs 1)
 *   A -> B 4   a one-way edge from A to B (`A > B` and `A → B` say the same; `A - B` is two-way)
 *   C          a node with no edges
 *   # a note   ignored, as are blank lines
 *
 * Nodes go by the names the canvas shows (a label, or else the node's number). A node stays on the
 * canvas while some line names it. The text is untrusted: reading it checks every line and says
 * what is wrong with each in plain words, and the graph changes only when every line reads.
 */
import type { GraphEdge, GraphNode } from "../../components/Graph/types";
import { EDGE, EDGE_TYPE, NODE, type EdgeType } from "../../constants/graph";
import { createEdge, type GeneratedGraph } from "./graphGenerator";
import { MAX_EDGES, MAX_NODES } from "./graphLink";

/** One line's edge, between node names. */
export interface ListedEdge { from: string; to: string; weight: number; directed: boolean }

/** A graph read from text: every node name, in the order the text first names it, and the edges in text order. */
export interface EdgeList { names: string[]; edges: ListedEdge[] }

/** What is wrong with a line (`line` counts from 1; 0 is the text as a whole), in plain words. */
export interface LineProblem { line: number; text: string }

/**
 * The text read: the graph, or the problems that keep it off the canvas. `hints` are lines that read
 * but may not say what was meant (`A-B` is one node named A-B); they never keep the graph off.
 */
export type ReadEdgeList = ({ list: EdgeList; problems: [] } | { list: null; problems: LineProblem[] }) & { hints: LineProblem[] };

/** The longest text the panel takes. A graph at the size limits needs far less. */
export const MAX_TEXT = 8000;

/** The canvas's own rule for a node's label. */
const NAME_LENGTH = 5;
const ARROW = "->";
const DASHES = new Set(["-", "--"]);

/** The name the canvas shows for a node. */
export const nameOf = (node: Pick<GraphNode, "id" | "label">) => node.label || String(node.id);

/** A line's words, with arrows split off even where they touch a name (`A->B`). */
const wordsOf = (line: string) => line.replace(/→/g, ARROW).replace(/-?>/g, ` ${ARROW} `).trim().split(/\s+/).filter(Boolean);

const isLink = (word: string) => word === ARROW || DASHES.has(word);

/**
 * Reads the text. Any problem on any line leaves the graph as it is, so they are all reported at once.
 * `canvas` is the size of the graph on the canvas: one already past the limits may be trimmed or
 * renamed here, but the text can't make it bigger.
 */
export function readEdgeList(text: string, canvas = { nodes: 0, edges: 0 }): ReadEdgeList {
  const limits = { nodes: Math.max(MAX_NODES, canvas.nodes), edges: Math.max(MAX_EDGES, canvas.edges) };
  if (text.length > MAX_TEXT) return { list: null, problems: [{ line: 0, text: `the text is too long: at most ${MAX_TEXT} characters` }], hints: [] };
  const problems: LineProblem[] = [];
  const hints: LineProblem[] = [];
  const names: string[] = [];
  const edges: ListedEdge[] = [];
  // Each pair of names joined so far, with the lines that join it.
  const joined = new Map<string, Array<ListedEdge & { line: number }>>();
  // Every name and edge the text holds, read or not, to say how far past a limit it is.
  const allNames = new Set<string>();
  let allEdges = 0;

  text.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    const problem = (words: string) => problems.push({ line, text: words });
    const words = wordsOf(raw.split("#")[0]);
    if (words.length === 0) return;

    // An arrow or dash may only stand once, between the two names.
    const links = words.flatMap((word, i) => (isLink(word) ? [i] : []));
    if (links.length > 1) return problem("one arrow or dash between two names, like `A -> B 4`");
    const at = links.length === 1 ? links[0] : -1;
    if (at === 0 || at === words.length - 1) {
      return problem(words[at] === ARROW ? "an arrow needs a node on each side, like `A -> B`" : "a dash needs a node on each side, like `A - B`");
    }
    const [from, to, ...rest] = at === 1 ? [words[0], ...words.slice(2)] : words;
    if (at > 1 || rest.length > 1) return problem("write one edge per line, like `A B 4` or `A -> B 4`");

    for (const name of to === undefined ? [from] : [from, to]) {
      if (name.length > NAME_LENGTH) return problem(`${name} is too long: names have at most ${NAME_LENGTH} characters`);
      if (name.includes("*")) return problem("names can't contain *");
    }
    const fresh = [from, to].filter((name, i, all): name is string => name !== undefined && !names.includes(name) && all.indexOf(name) === i);
    for (const name of fresh) allNames.add(name);
    if (to !== undefined) allEdges++;
    if (names.length + fresh.length > limits.nodes) return;
    // A dash inside a name keeps it one name, as the canvas allows; the line says so, in case an edge was meant.
    const joinedUp = [from, to].find((name) => name !== undefined && /[^-]-+[^-]/.test(name));
    const hint = () => {
      if (joinedUp) hints.push({ line, text: `read as one node named ${joinedUp} — write \`${joinedUp.replace(/-+/, " - ")}\` for an edge` });
    };
    if (to === undefined) {
      names.push(...fresh);
      return hint();
    }

    const written = rest[0]?.replace(/^−/, "-");
    const weight = written === undefined ? EDGE.DEFAULT_WEIGHT : Number(written);
    if (written !== undefined && (!/^-?\d+$/.test(written) || weight < EDGE.MIN_WEIGHT || weight > EDGE.MAX_WEIGHT)) {
      return problem(`the weight must be a whole number from −${-EDGE.MIN_WEIGHT} to ${EDGE.MAX_WEIGHT}`);
    }
    if (from === to) return problem("an edge needs two different nodes");
    const directed = at === 1 && words[1] === ARROW;
    const pair = [from, to].sort().join("\n");
    for (const other of joined.get(pair) ?? []) {
      // Only one-way edges in opposite directions can share a pair of nodes.
      if (directed && other.directed && other.from !== from) continue;
      return problem(directed && other.directed ? `${from} -> ${to} is already on line ${other.line}` : `${from} and ${to} are already joined on line ${other.line}`);
    }
    if (edges.length >= limits.edges) return;
    const edge = { from, to, weight, directed };
    names.push(...fresh);
    edges.push(edge);
    joined.set(pair, [...(joined.get(pair) ?? []), { ...edge, line }]);
    hint();
  });
  const tooBig = (count: number, limit: number, already: number, what: string) => ({
    line: 0,
    text: already > limit
      ? `the edge list holds at most ${limit} ${what}; this graph already has ${already}, so the text can't add more`
      : `the edge list holds at most ${limit} ${what}; this one has ${count}`,
  });
  if (allNames.size > limits.nodes) problems.push(tooBig(allNames.size, MAX_NODES, canvas.nodes, "nodes"));
  if (allEdges > limits.edges) problems.push(tooBig(allEdges, MAX_EDGES, canvas.edges, "edges"));

  return problems.length > 0 ? { list: null, problems, hints } : { list: { names, edges }, problems: [], hints };
}

/**
 * The text for a graph: nodes in the canvas's order, each with its edges (a two-way edge once, at
 * whichever end comes first), and a node with no edges on a line of its own. Weights are written
 * unless every edge weighs 1.
 */
export function writeEdgeList(nodes: readonly GraphNode[], edges: Map<number, GraphEdge[]>): string {
  const name = new Map(nodes.map((n) => [n.id, nameOf(n)]));
  const all = [...edges.values()].flat();
  const weighted = all.some((e) => e.weight !== EDGE.DEFAULT_WEIGHT);
  const joined = new Set(all.flatMap((e) => [e.from, e.to]));
  const written = new Set<string>();
  const lines: string[] = [];
  for (const node of nodes) {
    if (!joined.has(node.id)) lines.push(name.get(node.id)!);
    for (const e of edges.get(node.id) ?? []) {
      const undirected = e.type === EDGE_TYPE.UNDIRECTED;
      if (undirected && written.has(`${e.to}-${e.from}`)) continue;
      written.add(`${e.from}-${e.to}`);
      lines.push([name.get(e.from), ...(undirected ? [] : [ARROW]), name.get(e.to), ...(weighted ? [e.weight] : [])].join(" "));
    }
  }
  return lines.join("\n");
}

/**
 * Why the text cannot stand for this graph, in plain words, or null when it can: two nodes share a
 * name, or a name has characters the text reads as something else (a space, #, >).
 */
export function whyNotWritable(nodes: readonly GraphNode[]): string | null {
  const names = nodes.map(nameOf);
  const odd = names.find((n) => n.length > NAME_LENGTH || n.includes("#") || isLink(n) || wordsOf(n).length !== 1 || wordsOf(n)[0] !== n);
  if (odd !== undefined) return `the name “${odd}” can't be written as text — rename it on the canvas to edit here`;
  const twice = names.find((n, i) => names.indexOf(n) !== i);
  if (twice !== undefined) return `two nodes are named ${twice}, so the text can't tell them apart — rename one on the canvas to edit here`;
  return null;
}

/** What a graph is, by name: its nodes and edges, whatever order they are kept or written in. */
function meaning(names: string[], edges: ListedEdge[]): string {
  const lines = edges.map(({ from, to, weight, directed }) =>
    (directed ? [from, ">", to] : [[from, to].sort().join(" - ")]).concat(String(weight)).join(" "));
  return JSON.stringify([[...names].sort(), [...new Set(lines)].sort()]);
}

export const meaningOfList = (list: EdgeList) => meaning(list.names, list.edges);

export function meaningOf(nodes: readonly GraphNode[], edges: Map<number, GraphEdge[]>): string {
  const name = new Map(nodes.map((n) => [n.id, nameOf(n)]));
  const listed = [...edges.values()].flat().map((e) =>
    ({ from: name.get(e.from) ?? "", to: name.get(e.to) ?? "", weight: e.weight, directed: e.type !== EDGE_TYPE.UNDIRECTED }));
  return meaning([...name.values()], listed);
}

/** The text in the panel, and what the canvas was when the text last stood for it. */
export interface TextState { text: string; meaning: string }

export const textOf = (nodes: readonly GraphNode[], edges: Map<number, GraphEdge[]>): TextState =>
  ({ text: writeEdgeList(nodes, edges), meaning: meaningOf(nodes, edges) });

/**
 * The text once the canvas is as given: kept as the learner wrote it (notes, order, spacing) while it
 * still says what the canvas shows, and written afresh from the canvas when the canvas says something
 * else (an edit on the canvas, undo, redo, a generated graph).
 */
export function followCanvas(state: TextState, nodes: readonly GraphNode[], edges: Map<number, GraphEdge[]>): TextState {
  const now = meaningOf(nodes, edges);
  if (now === state.meaning) return state;
  const read = readEdgeList(state.text);
  if (read.list && meaningOfList(read.list) === now) return { ...state, meaning: now };
  return textOf(nodes, edges);
}

/**
 * The text just handed to the canvas, standing for the canvas as it now is (redrawn, or left alone
 * when a line did not read): so a change that comes straight after (Undo in the text) is seen as one.
 */
export const textAfterCommit = (text: string, nodes: readonly GraphNode[], edges: Map<number, GraphEdge[]>): TextState =>
  ({ text, meaning: meaningOf(nodes, edges) });

/* ------------------------------------------------------------ text to canvas */

type Point = { x: number; y: number };

/** Room between nodes placed from text. */
const GAP = 120;

/** `count` places on a circle around `centre`, neighbours GAP and a bit apart (side by side for two). */
function circle(count: number, centre: Point): Point[] {
  if (count === 1) return [centre];
  const radius = (1.2 * GAP) / (2 * Math.sin(Math.PI / count));
  const start = count === 2 ? Math.PI : -Math.PI / 2;
  return Array.from({ length: count }, (_, i) => ({
    x: Math.round(centre.x + radius * Math.cos(start + (2 * Math.PI * i) / count)),
    y: Math.round(centre.y + radius * Math.sin(start + (2 * Math.PI * i) / count)),
  }));
}

/** The free place nearest `target` (rings of places around it), nearest `anchor` among equals. */
function freePlace(target: Point, taken: Point[], anchor: Point): Point {
  const clear = (p: Point) => taken.every((q) => Math.hypot(p.x - q.x, p.y - q.y) >= GAP * 0.9);
  for (let ring = 0; ; ring++) {
    const count = Math.max(1, ring * 6);
    const options = Array.from({ length: count }, (_, i) => ({
      x: Math.round(target.x + ring * GAP * Math.cos((2 * Math.PI * i) / count)),
      y: Math.round(target.y + ring * GAP * Math.sin((2 * Math.PI * i) / count)),
    })).filter(clear);
    if (options.length > 0) {
      const far = (p: Point) => Math.hypot(p.x - anchor.x, p.y - anchor.y);
      return options.reduce((best, p) => (far(p) < far(best) ? p : best));
    }
  }
}

/** A whole number the canvas could show as a node's number ("7", not "07" or "-7"), or 0. */
const numberIn = (name: string) => (/^[1-9]\d*$/.test(name) ? Number(name) : 0);

/** The highest number a node can show as its name (names have at most five characters). */
const MAX_SHOWN = 10 ** NAME_LENGTH - 1;

/**
 * The id for a new node: the next one after `from` that no node has and whose number no node shows
 * as its name, so a new node never shows a name already showing, nor one longer than five
 * characters (past 99999 it takes the lowest such id).
 */
export function freeId(used: ReadonlySet<number>, shown: ReadonlySet<string>, from: number): number {
  const free = (id: number) => !used.has(id) && !shown.has(String(id));
  for (let id = from + 1; id <= MAX_SHOWN; id++) if (free(id)) return id;
  for (let id = 1; ; id++) if (free(id)) return id;
}

/**
 * The canvas graph `list` describes, made from `graph` with as little change as possible: nodes the
 * text still names keep their ids and places, and their edges keep their order (the order the
 * algorithms check them in). A node renamed in the text (it went, and a new name came with the very
 * same edges) is the same node under its new name, in its place; so is every node when all are
 * renamed at once. Any other new node takes the place of one the text no longer names, or else a free
 * place by the nodes it joins, or by `anchor` (the middle of what the learner sees). Text that keeps
 * none of the canvas's nodes (text typed on an empty canvas) is laid out in a circle around `anchor`.
 * The node counter moves past every name that is a whole number, so a node added on the canvas later
 * is never numbered with a name already showing. Null when two nodes share a name (see `whyNotWritable`).
 */
export function applyEdgeList(
  graph: { nodes: readonly GraphNode[]; edges: Map<number, GraphEdge[]>; nodeCounter: number }, list: EdgeList, anchor: Point,
): GeneratedGraph | null {
  const byName = new Map(graph.nodes.map((n) => [nameOf(n), n]));
  if (byName.size !== graph.nodes.length) return null;
  const named = new Set(list.names);

  // Renames: a node that went and a name that came with the same edges. Neighbours renamed too are
  // matched as they are found; nodes no edge tells apart are matched in the order the text names them.
  const stays = (name: string) => byName.has(name) && named.has(name);
  const nameById = new Map(graph.nodes.map((n) => [n.id, nameOf(n)]));
  const renamed = new Map<number, string>();
  const renamedTo = new Map<string, string>();
  const was = (name: string) => (stays(name) ? name : renamedTo.get(name) ?? "?");
  const now = (name: string) => (stays(name) || [...renamed.values()].includes(name) ? name : "?");
  const marks = (list: string[]) => list.sort().join(" ");
  const before = (node: GraphNode) => marks([...graph.edges.values()].flat().flatMap((e) => {
    const directed = e.type !== EDGE_TYPE.UNDIRECTED;
    if (e.from === node.id) return [`${directed ? "out" : "u"}:${was(nameById.get(e.to)!)}:${e.weight}`];
    if (e.to === node.id && directed) return [`in:${was(nameById.get(e.from)!)}:${e.weight}`];
    return [];
  }));
  const after = (name: string) => marks(list.edges.flatMap((e) =>
    e.from === name ? [`${e.directed ? "out" : "u"}:${now(e.to)}:${e.weight}`]
      : e.to === name ? [`${e.directed ? "in" : "u"}:${now(e.from)}:${e.weight}`] : []));
  const textOrder = readEdgeList(writeEdgeList(graph.nodes, graph.edges)).list?.names ?? [];
  let unmatched = graph.nodes.filter((n) => !named.has(nameOf(n)))
    .sort((a, b) => textOrder.indexOf(nameOf(a)) - textOrder.indexOf(nameOf(b)));
  let added = list.names.filter((name) => !byName.has(name));
  const pair = (node: GraphNode, name: string) => {
    renamed.set(node.id, name);
    renamedTo.set(nameOf(node), name);
    unmatched = unmatched.filter((n) => n !== node);
    added = added.filter((a) => a !== name);
  };
  for (let found = true; found;) {
    found = false;
    const gone = unmatched.map((node) => ({ node, marks: before(node) }));
    const comes = added.map((name) => ({ name, marks: after(name) }));
    for (const { name, marks: m } of comes) {
      const matches = gone.filter((g) => g.marks === m);
      if (matches.length === 1 && comes.filter((c) => c.marks === m).length === 1) {
        pair(matches[0].node, name);
        found = true;
      }
    }
  }
  for (const name of [...added]) {
    const m = after(name);
    const node = unmatched.find((g) => before(g) === m);
    if (node) pair(node, name);
  }
  const kept = graph.nodes
    .filter((n) => named.has(nameOf(n)) || renamed.has(n.id))
    .map((n) => (renamed.has(n.id) ? { ...n, label: renamed.get(n.id) } : n));
  const place = new Map<string, Point>(kept.map((n) => [nameOf(n), { x: n.x, y: n.y }]));

  if (kept.length === 0) {
    circle(added.length, anchor).forEach((p, i) => place.set(added[i], p));
  } else {
    const freed = unmatched.map(({ x, y }) => ({ x, y }));
    for (const name of added) {
      const near = list.edges
        .flatMap((e) => (e.from === name ? [e.to] : e.to === name ? [e.from] : []))
        .flatMap((other) => place.get(other) ?? []);
      const target = near.length === 0 ? anchor
        : { x: near.reduce((s, p) => s + p.x, 0) / near.length, y: near.reduce((s, p) => s + p.y, 0) / near.length };
      place.set(name, freed.shift() ?? freePlace(target, [...place.values()], anchor));
    }
  }

  // A new node named with a whole number gets that number as its id when no node has it (so its name
  // is its number); the others take free ids from the counter on (see `freeId`).
  const taken = new Set(graph.nodes.map((n) => n.id));
  const shown = new Set([...kept.map(nameOf), ...added]);
  const idFor = new Map<string, number>();
  for (const name of added) {
    const id = numberIn(name);
    if (id > 0 && !taken.has(id)) {
      idFor.set(name, id);
      taken.add(id);
    }
  }
  let next = graph.nodeCounter;
  for (const name of added) {
    if (idFor.has(name)) continue;
    next = freeId(taken, shown, next);
    taken.add(next);
    idFor.set(name, next);
  }
  const nodes: GraphNode[] = [
    ...kept,
    ...added.map((name) => ({ id: idFor.get(name)!, ...place.get(name)!, r: NODE.RADIUS, label: name })),
  ];
  const nodeCounter = Math.max(graph.nodeCounter, ...nodes.map((n) => n.id));
  const idOf = new Map(nodes.map((n) => [nameOf(n), n.id]));
  const byId = new Map(nodes.map((n) => [n.id, n]));

  // Every edge wanted, keyed `from>to` by id; a two-way edge both ways.
  const wanted = new Map<string, { from: number; to: number; weight: number; type: EdgeType }>();
  for (const { from, to, weight, directed } of list.edges) {
    const [a, b] = [idOf.get(from)!, idOf.get(to)!];
    const type = directed ? EDGE_TYPE.DIRECTED : EDGE_TYPE.UNDIRECTED;
    wanted.set(`${a}>${b}`, { from: a, to: b, weight, type });
    if (!directed) wanted.set(`${b}>${a}`, { from: b, to: a, weight, type });
  }
  const edges = new Map<number, GraphEdge[]>();
  for (const node of nodes) {
    const order = (graph.edges.get(node.id) ?? []).map((e) => e.to).filter((to) => wanted.has(`${node.id}>${to}`));
    for (const { from, to } of wanted.values()) if (from === node.id && !order.includes(to)) order.push(to);
    edges.set(node.id, order.map((to) => {
      const { weight, type } = wanted.get(`${node.id}>${to}`)!;
      return createEdge(node, byId.get(to)!, type, weight);
    }));
  }
  return { nodes, edges, nodeCounter };
}
