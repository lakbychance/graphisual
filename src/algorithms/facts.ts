/**
 * Graph facts: what kind of graph this is, worked out once, here, for everyone who asks. The edge
 * list panel shows them; an algorithm that needs one (`AlgorithmAdapter.needs`) refuses a graph
 * without it, naming the fact and the edge or nodes that show it.
 *
 * Each fact comes with its evidence (a node that cannot be reached, a cycle, an odd loop, a negative
 * edge), so the app can point at it on the canvas. All of it reads the graph only.
 *
 * - **Direction**: every edge one-way (directed), every edge two-way (undirected), or some of each (mixed).
 * - **Connected**: in one piece with the arrows ignored (weakly connected, for a directed graph): from
 *   any node, every other can be reached when edges may be walked either way.
 * - **Cycle**: as cycle detection has it (see `adapters/cycleDetection.ts`): a closed walk that never
 *   uses an edge twice, directed edges only their way. Two-way edges between the same two nodes are
 *   one edge, so out and back along them is no cycle; a directed edge makes two nodes enough; a
 *   self-loop is a cycle on its own.
 * - **DAG**: no two-way edge and no cycle.
 * - **Bipartite**: the nodes split into two sides with every edge crossing between them (two
 *   colours, neighbours never the same), arrows ignored. A graph is bipartite exactly when it has no
 *   loop of an odd number of edges, so an odd loop is the evidence that it is not.
 * - **Negative edges**: any edge weighing less than 0.
 */
import { nameOrder } from "./adapters/nameOrder";
import { nid, signed } from "./traceHelpers";

/** An edge as the facts read it (the app's edges and an algorithm's input both fit). */
export interface FactEdge {
  from: number;
  to: number;
  weight: number;
  type: string;
}

/** The graph the facts are about: an undirected edge is listed from each end, as the app keeps it. */
export interface FactGraph {
  nodes: readonly { id: number; label?: string }[];
  adjacencyList: ReadonlyMap<number, readonly FactEdge[]>;
}

export interface GraphFacts {
  /** Null when the graph has no edges. */
  direction: "directed" | "undirected" | "mixed" | null;
  /** The first one-way edge (in name order), when there is one. */
  oneWay: FactEdge | null;
  /** Null when the graph is in one piece; otherwise a node (`to`) that the first node (`from`) has no way to, arrows ignored. */
  apart: { from: number; to: number; pieces: number } | null;
  /** A cycle, its nodes in walking order (the last leads back to the first); null when there is none. */
  cycle: number[] | null;
  /** Directed (or without edges) and acyclic. */
  dag: boolean;
  /** When bipartite, the two sides (every node on one); otherwise null. */
  sides: [number[], number[]] | null;
  /** When not bipartite, a loop of an odd number of edges, arrows ignored, in walking order; otherwise null. */
  oddCycle: number[] | null;
  /** The negative edges, an undirected one listed once, in name order. */
  negative: FactEdge[];
}

const isDirected = (edge: FactEdge) => edge.type === "directed";

/** Every edge once (an undirected one from the end that comes first in name order), in name order. */
function edgesOnce({ adjacencyList }: FactGraph, rank: Map<number, number>): FactEdge[] {
  const at = (id: number) => rank.get(id) ?? Infinity;
  const all = [...adjacencyList.values()].flat()
    .filter((e) => isDirected(e) || at(e.from) <= at(e.to));
  return all.sort((a, b) => at(a.from) - at(b.from) || at(a.to) - at(b.to));
}

/** Union–find over node ids. */
function pieces(ids: number[]) {
  const leader = new Map(ids.map((id) => [id, id]));
  const find = (id: number): number => {
    let root = id;
    while (leader.get(root) !== root) root = leader.get(root)!;
    leader.set(id, root);
    return root;
  };
  /** Joins the pieces of `a` and `b`; false when they were one piece already. */
  const join = (a: number, b: number) => {
    const [x, y] = [find(a), find(b)];
    if (x === y) return false;
    leader.set(x, y);
    return true;
  };
  return { find, join };
}

/** The path from `from` to `to` along `links` (a forest), as nodes; both ends included. */
function pathIn(links: Map<number, number[]>, from: number, to: number): number[] {
  const back = new Map<number, number>([[from, from]]);
  const queue = [from];
  while (queue.length > 0 && !back.has(to)) {
    const at = queue.shift()!;
    for (const next of links.get(at) ?? []) {
      if (!back.has(next)) {
        back.set(next, at);
        queue.push(next);
      }
    }
  }
  const path = [to];
  while (path[0] !== from) path.unshift(back.get(path[0])!);
  return path;
}

/**
 * A cycle, or null. Two-way edges alone close one when one joins two nodes already linked by others
 * (the two-way edges then form a forest otherwise). With that forest, a one-way edge closes one when
 * its ends are in the same tree, or when, with each tree taken as one node, the one-way edges go
 * round: then each tree is crossed along its own path from where the walk comes in to where it leaves.
 */
function findCycle(edges: FactEdge[], ids: number[]): number[] | null {
  const loop = edges.find((e) => e.from === e.to);
  if (loop) return [loop.from];

  const trees = pieces(ids);
  const links = new Map<number, number[]>();
  const seen = new Set<string>();
  for (const { from, to } of edges.filter((e) => !isDirected(e))) {
    const pair = `${from}-${to}`;
    if (seen.has(pair)) continue; // two-way edges between the same nodes are one edge
    seen.add(pair);
    if (!trees.join(from, to)) return pathIn(links, to, from);
    links.set(from, [...(links.get(from) ?? []), to]);
    links.set(to, [...(links.get(to) ?? []), from]);
  }

  const oneWay = edges.filter(isDirected);
  const inside = oneWay.find((e) => trees.find(e.from) === trees.find(e.to));
  if (inside) return [inside.from, ...pathIn(links, inside.to, inside.from).slice(0, -1)];

  // A depth-first search over the trees, along one-way edges, for an edge back to a tree still open.
  const out = new Map<number, FactEdge[]>();
  for (const e of oneWay) out.set(trees.find(e.from), [...(out.get(trees.find(e.from)) ?? []), e]);
  const state = new Map<number, "open" | "done">();
  const cameBy = new Map<number, FactEdge>();
  for (const root of ids.map(trees.find)) {
    if (state.has(root)) continue;
    const stack: Array<{ tree: number; next: number }> = [{ tree: root, next: 0 }];
    state.set(root, "open");
    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      const edge = (out.get(top.tree) ?? [])[top.next++];
      if (!edge) {
        state.set(top.tree, "done");
        stack.pop();
        continue;
      }
      const tree = trees.find(edge.to);
      if (state.get(tree) === "open") {
        // The one-way edges round, from `tree` back to it, then each tree crossed between them.
        const round = [edge];
        for (let at = top.tree; at !== tree; at = trees.find(cameBy.get(at)!.from)) round.unshift(cameBy.get(at)!);
        return round.flatMap((e, i) => pathIn(links, e.to, round[(i + 1) % round.length].from));
      }
      if (!state.has(tree)) {
        state.set(tree, "open");
        cameBy.set(tree, edge);
        stack.push({ tree, next: 0 });
      }
    }
  }
  return null;
}

/** The two sides, or a loop of an odd number of edges (arrows ignored), by colouring outward from each node in name order. */
function twoSides(edges: FactEdge[], order: number[]): { sides: [number[], number[]] } | { oddCycle: number[] } {
  const loop = edges.find((e) => e.from === e.to);
  if (loop) return { oddCycle: [loop.from] };
  const near = new Map<number, number[]>();
  for (const { from, to } of edges) {
    near.set(from, [...(near.get(from) ?? []), to]);
    near.set(to, [...(near.get(to) ?? []), from]);
  }
  const depth = new Map<number, number>();
  const parent = new Map<number, number>();
  const upTo = (node: number) => {
    const path = [node];
    while (parent.has(path[path.length - 1])) path.push(parent.get(path[path.length - 1])!);
    return path;
  };
  for (const root of order) {
    if (depth.has(root)) continue;
    depth.set(root, 0);
    const queue = [root];
    while (queue.length > 0) {
      const at = queue.shift()!;
      for (const next of near.get(at) ?? []) {
        if (!depth.has(next)) {
          depth.set(next, depth.get(at)! + 1);
          parent.set(next, at);
          queue.push(next);
        } else if (depth.get(next)! % 2 === depth.get(at)! % 2) {
          // Same side: up from each end to where their paths meet, and the edge between them closes an odd loop.
          const [a, b] = [upTo(at), upTo(next)];
          const meet = a.find((id) => b.includes(id))!;
          return { oddCycle: [...a.slice(0, a.indexOf(meet) + 1), ...b.slice(0, b.indexOf(meet)).reverse()] };
        }
      }
    }
  }
  return { sides: [order.filter((id) => depth.get(id)! % 2 === 0), order.filter((id) => depth.get(id)! % 2 === 1)] };
}

/** Every fact about the graph (see the top of this file). */
export function graphFacts(graph: FactGraph): GraphFacts {
  const order = nameOrder({ nodes: [...graph.nodes] });
  const rank = new Map(order.map((id, i) => [id, i]));
  const edges = edgesOnce(graph, rank).filter((e) => rank.has(e.from) && rank.has(e.to));

  const directed = edges.some(isDirected);
  const undirected = edges.some((e) => !isDirected(e));
  const direction = directed && undirected ? "mixed" : directed ? "directed" : undirected ? "undirected" : null;

  const joined = pieces(order);
  for (const { from, to } of edges) joined.join(from, to);
  const roots = new Set(order.map(joined.find));
  const stray = order.find((id) => joined.find(id) !== joined.find(order[0]));

  // A loop is read from its node first in name order.
  const fromFirst = (loop: number[] | null) => {
    if (!loop) return null;
    const first = loop.reduce((a, b) => (rank.get(b)! < rank.get(a)! ? b : a));
    return [...loop.slice(loop.indexOf(first)), ...loop.slice(0, loop.indexOf(first))];
  };
  const cycle = fromFirst(findCycle(edges, order));
  const split = twoSides(edges, order);
  return {
    direction,
    oneWay: edges.find(isDirected) ?? null,
    apart: stray === undefined ? null : { from: order[0], to: stray, pieces: roots.size },
    cycle,
    dag: !undirected && cycle === null,
    sides: "sides" in split ? split.sides : null,
    oddCycle: "oddCycle" in split ? fromFirst(split.oddCycle) : null,
    negative: edges.filter((e) => e.weight < 0),
  };
}

/** An edge as the facts write it, nodes marked with `nid`: `A → B` one-way, `A – B` two-way. */
export const edgeName = ({ from, to, type }: FactEdge) => `${nid(from)} ${type === "directed" ? "→" : "–"} ${nid(to)}`;

/**
 * A loop of two or more nodes as the facts write it, round to its first node again, each step drawn
 * as its edge goes (`A → B – C → A`). A loop of more than four nodes is shortened to its first two
 * and last (`A → B … K → A`), so a why always fits its box; the canvas lights the whole loop.
 */
export function loopName(cycle: number[], graph: FactGraph, arrowsIgnored = false): string {
  const step = (from: number, to: number) => {
    // A step that can go along a one-way edge shows it, so a two-node loop reads `A → B – A`, never as out and back.
    const oneWay = !arrowsIgnored && (graph.adjacencyList.get(from) ?? []).some((e) => e.to === to && isDirected(e));
    return `${oneWay ? " → " : " – "}${nid(to)}`;
  };
  const last = cycle[cycle.length - 1];
  if (cycle.length > 4) return `${nid(cycle[0])}${step(cycle[0], cycle[1])} … ${nid(last)}${step(last, cycle[0])}`;
  return nid(cycle[0]) + cycle.map((from, i) => step(from, cycle[(i + 1) % cycle.length])).join("");
}

/** Parts of the graph a fact points at, to light on the canvas: `nodes` and `edges` in the cycle colour, `marked` in the route colour. */
export interface Evidence {
  nodes: number[];
  edges: Array<{ from: number; to: number }>;
  marked?: number[];
}

/** The edges round a loop of nodes (one node: its self-loop). */
const loopEdges = (cycle: number[]) => cycle.map((from, i) => ({ from, to: cycle[(i + 1) % cycle.length] }));

/** One fact, as the panel shows it: a short label, why it holds (nodes marked with `nid`), and what to light. */
export interface Fact {
  key: "direction" | "connected" | "cycle" | "dag" | "bipartite" | "negative";
  label: string;
  why: string;
  evidence: Evidence | null;
}

/** Why a graph with edges has no cycle, by the way its edges go. */
export const NO_CYCLE = {
  directed: "No walk along the arrows comes back round",
  mixed: "No walk along the arrows comes back round without retracing an edge",
  undirected: "No walk comes back round without retracing an edge",
} as const;

/** The facts the panel lists, in order. A graph without nodes has none; without edges, only that it has none worth saying beyond. */
export function factList(graph: FactGraph, facts: GraphFacts = graphFacts(graph)): Fact[] {
  if (graph.nodes.length === 0) return [];
  const { direction, oneWay, apart, cycle, dag, sides, oddCycle, negative } = facts;
  const list: Fact[] = [];
  const arrows = direction === "directed" || direction === "mixed";

  list.push(direction === null
    ? { key: "direction", label: "No edges", why: "No node is joined to another yet", evidence: null }
    : direction === "undirected"
      ? { key: "direction", label: "Undirected", why: "Every edge is two-way", evidence: null }
      : direction === "directed"
        ? { key: "direction", label: "Directed", why: "Every edge is one-way", evidence: null }
        : { key: "direction", label: "Mixed", why: `Some edges are one-way, like ${edgeName(oneWay!)}, and some two-way`, evidence: { nodes: [], edges: [oneWay!] } });

  list.push(apart === null
    ? { key: "connected", label: "Connected", why: arrows ? "In one piece if arrows are ignored (weakly connected)" : "In one piece: every node can be reached from every other", evidence: null }
    : {
      key: "connected",
      label: "Not connected",
      why: `In ${apart.pieces} pieces: ${nid(apart.to)} can't be reached from ${nid(apart.from)}${arrows ? ", even ignoring arrows" : ""}`,
      evidence: { nodes: [apart.to], edges: [], marked: [apart.from] },
    });

  if (direction === null) return list;

  // A loop's size, then the loop: the conclusion comes before the walk that shows it.
  const ofEdges = (loop: number[]) => `${loop.length} edges`;
  list.push(cycle === null
    ? { key: "cycle", label: "No cycle", why: NO_CYCLE[direction], evidence: null }
    : {
      key: "cycle",
      label: "Has a cycle",
      why: cycle.length === 1 ? `${nid(cycle[0])} has an edge to itself` : `A cycle of ${ofEdges(cycle)}: ${loopName(cycle, graph)}`,
      evidence: { nodes: cycle, edges: loopEdges(cycle) },
    });

  if (direction === "directed") {
    list.push(dag
      ? { key: "dag", label: "DAG", why: "Directed and acyclic: every edge one-way, and no cycle", evidence: null }
      : {
        key: "dag",
        label: "Not a DAG",
        why: cycle!.length === 1
          ? `A DAG has no cycle, and ${nid(cycle![0])} has an edge to itself`
          : `A DAG has no cycle, and this graph has one of ${ofEdges(cycle!)}: ${loopName(cycle!, graph)}`,
        evidence: { nodes: cycle!, edges: loopEdges(cycle!) },
      });
  }

  const ignored = arrows ? " (arrows ignored)" : "";
  list.push(sides !== null
    ? {
      key: "bipartite",
      label: "Bipartite",
      why: `Every edge runs between two sides${ignored}: ${graph.nodes.length <= 6 ? `${sides[0].map(nid).join(", ")} on one, ${sides[1].map(nid).join(", ")} on the other` : "the lit nodes on one, the rest on the other"}`,
      evidence: { nodes: [], edges: [], marked: sides[0] },
    }
    : {
      key: "bipartite",
      label: "Not bipartite",
      why: oddCycle!.length === 1
        ? `No two sides: ${nid(oddCycle![0])} has an edge to itself, which can't run between them`
        : `Nodes can't alternate between two sides: ${loopName(oddCycle!, graph, true)} is a loop of ${ofEdges(oddCycle!)}${ignored}, an odd number`,
      evidence: { nodes: oddCycle!, edges: loopEdges(oddCycle!) },
    });

  list.push(negative.length === 0
    ? { key: "negative", label: "No negative edges", why: "Every edge weighs 0 or more", evidence: null }
    : {
      key: "negative",
      label: negative.length === 1 ? "Negative edge" : `${negative.length} negative edges`,
      why: `${edgeName(negative[0])} weighs ${signed(negative[0].weight)}${negative.length > 1 ? `, and ${negative.length - 1} more ${negative.length === 2 ? "is" : "are"} below 0` : ""}`,
      evidence: { nodes: [], edges: negative },
    });

  return list;
}

/** A fact an algorithm needs of the graph: no negative edge (Dijkstra's), every edge two-way (Prim's). */
export type Need = "no-negative-edges" | "undirected";

/** Why `name` refuses this graph, naming the fact it needs and the edge that breaks it (nodes marked with `nid`); undefined when every need is met. */
export function unmetNeed(name: string, needs: readonly Need[], facts: GraphFacts): { message: string; evidence: Evidence } | undefined {
  for (const need of needs) {
    if (need === "no-negative-edges" && facts.negative.length > 0) {
      const edge = facts.negative[0];
      return {
        message: `${name} needs no negative edges, but ${edgeName(edge)} weighs ${signed(edge.weight)}; Bellman-Ford handles them`,
        evidence: { nodes: [], edges: [edge] },
      };
    }
    if (need === "undirected" && facts.oneWay !== null) {
      return {
        message: `${name} needs an undirected graph, but ${edgeName(facts.oneWay)} is one-way`,
        // Its ends too: a short one-way edge hides much of itself under its weight.
        evidence: { nodes: [facts.oneWay.from, facts.oneWay.to], edges: [facts.oneWay] },
      };
    }
  }
  return undefined;
}
