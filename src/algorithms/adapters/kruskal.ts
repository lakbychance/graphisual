/**
 * Kruskal's Minimum Spanning Tree Algorithm Adapter
 *
 * Builds a minimum spanning tree of a weighted undirected graph edge by edge: every node starts in a
 * group of its own; take the edges cheapest first, and add one to the tree when its ends are in two
 * different groups (which then become one), skipping it when they are already in one group, as it
 * would close a loop. On a graph in pieces this builds a tree for each piece: a spanning forest.
 *
 * It works on the whole graph, so the node tapped to start it changes nothing. The app runs it only
 * on an undirected graph (`needs`).
 */

import { KruskalIcon } from "../icons";
import { decide, firstOption, type AlgorithmEvent, type ChoicePolicy, type WeightedEdge } from "../engine";
import { AlgorithmAdapter, AlgorithmInput, AlgorithmType } from "../types";
import { EDGE_TYPE } from "../../constants/graph";
import { nameOrder } from "./nameOrder";

const PSEUDOCODE = [
  "sort the edges, cheapest first",
  "put each node in a group of its own",
  "for each edge (u, v) in that order:",
  "    if find(u) ≠ find(v):",
  "        union(u, v), tree.add(u, v)",
  "    else: skip (it closes a loop)",
  "return tree",
];

/** Pseudocode line of each kind of event. A decision belongs to the edge it adds. */
const LINE = { sort: 0, groups: 1, add: 4, skip: 5, done: 6 } as const;

const hasDirectedEdge = ({ adjacencyList }: AlgorithmInput) =>
  [...adjacencyList.values()].some((edges) => edges.some((edge) => edge.type === EDGE_TYPE.DIRECTED));

/** The path from `from` to `to` along `links` (each node's tree neighbours), both ends included. */
function pathIn(links: ReadonlyMap<number, number[]>, from: number, to: number): number[] {
  const back = new Map<number, number>([[from, from]]);
  const queue = [from];
  while (queue.length > 0 && !back.has(to)) {
    const at = queue.shift()!;
    for (const next of links.get(at) ?? []) {
      if (back.has(next)) continue;
      back.set(next, at);
      queue.push(next);
    }
  }
  const path = [to];
  while (path[0] !== from) path.unshift(back.get(path[0])!);
  return path;
}

/**
 * Everything Kruskal's does on this input, as events. Empty for a graph with directed edges.
 * Each undirected edge is listed once (a two-way edge sits in both its ends' lists), cheapest first,
 * edges that cost the same in name order. The run takes the first edge left in the list: one that
 * would close a loop is skipped; otherwise which edge goes in next is a decision, as every edge left
 * at the same weight that joins two groups is as good, and `choose` picks one (by default the first).
 */
function kruskalEvents(input: AlgorithmInput, choose: ChoicePolicy = firstOption): AlgorithmEvent[] {
  if (hasDirectedEdge(input)) return [];
  const ids = nameOrder(input);
  for (const id of input.adjacencyList.keys()) if (!ids.includes(id)) ids.push(id);
  const rank = new Map(ids.map((id, i) => [id, i]));
  const at = (id: number) => rank.get(id)!;

  // Every edge once: a two-way edge from the end first by name (a self-loop has one end), cheapest first.
  const edges: WeightedEdge[] = [...input.adjacencyList.values()].flat()
    .filter(({ from, to }) => rank.has(from) && rank.has(to) && at(from) <= at(to))
    .map(({ from, to, weight }) => ({ from, to, weight }))
    .sort((a, b) => a.weight - b.weight || at(a.from) - at(b.from) || at(a.to) - at(b.to));

  let group = 0;
  const events: AlgorithmEvent[] = [
    { type: "edges", edges, line: LINE.sort, group },
    { type: "groups", nodes: ids, line: LINE.groups, group },
  ];
  const groupOf = new Map(ids.map((id) => [id, id]));
  const members = (g: number) => ids.filter((id) => groupOf.get(id) === g);
  const links = new Map<number, number[]>();
  const looked = new Set<number>();
  const tree: WeightedEdge[] = [];
  let total = 0;

  for (let first = 0; first < edges.length;) {
    group += 1;
    const edge = edges[first];
    if (groupOf.get(edge.from) === groupOf.get(edge.to)) {
      looked.add(first);
      const path = edge.from === edge.to ? [edge.from] : pathIn(links, edge.from, edge.to);
      events.push({ type: "closes", edge: first, ...edge, path, line: LINE.skip, group });
    } else {
      // Every edge left at this weight that joins two groups, in list order (so `first` leads).
      const options = edges.flatMap((e, i) =>
        !looked.has(i) && e.weight === edge.weight && groupOf.get(e.from) !== groupOf.get(e.to) ? [i] : []);
      const pick = decide(events, choose, "edge", options, { line: LINE.add, group });
      const { from, to, weight } = edges[pick];
      const [keep, join] = [groupOf.get(from)!, groupOf.get(to)!];
      const groups: [number[], number[]] = [members(keep), members(join)];
      for (const id of groups[1]) groupOf.set(id, keep);
      looked.add(pick);
      links.set(from, [...(links.get(from) ?? []), to]);
      links.set(to, [...(links.get(to) ?? []), from]);
      tree.push({ from, to, weight });
      total += weight;
      events.push({ type: "union", edge: pick, from, to, weight, groups, line: LINE.add, group, ...(options.length > 1 && { tied: options }) });
    }
    while (looked.has(first)) first += 1;
  }

  const pieces = new Set(groupOf.values()).size;
  const alone = ids.filter((id) => !links.has(id));
  events.push({ type: "answer", kind: "forest", edges: tree, total, pieces, alone, line: LINE.done, group: group + 1 });
  return events;
}

const kruskalAdapter: AlgorithmAdapter = {
  metadata: {
    id: "kruskal",
    name: "Kruskal's MST",
    type: AlgorithmType.TREE,
    tagline: "Cheapest edges first, skipping loops",
    icon: KruskalIcon,
    inputStepHints: ["Select any node to start"],
    landing: false,
  },

  pseudocode: PSEUDOCODE,
  events: kruskalEvents,

  /** A graph in pieces still runs: the answer is a forest, a tree for each piece. */
  needs: ["undirected"],
};

export default kruskalAdapter;
