/**
 * Prim's Minimum Spanning Tree Algorithm Adapter
 *
 * Finds a minimum spanning tree for a weighted undirected graph.
 * Starts from a node and greedily adds the minimum weight edge
 * that connects the tree to a new vertex.
 */

import { PrimsIcon } from "../icons";
import { decide, firstOption, type AlgorithmEvent, type ChoicePolicy, type WeightedEdge } from "../engine";
import { AlgorithmAdapter, AlgorithmInput, AlgorithmType } from "../types";
import { EDGE_TYPE } from "../../constants/graph";

/** Each node keeps one cost, the cheapest edge joining it to the tree so far, and it only ever shrinks. */
const PSEUDOCODE = [
  "cost[·] ← ∞, cost[source] ← 0",
  "queue ← { source }",
  "while queue is not empty:",
  "    u ← queue.extractMin(), tree.add(u)",
  "    for each edge (u, v, w):",
  "        if v is in tree: skip",
  "        if w < cost[v]:",
  "            cost[v] ← w, parent[v] ← u",
  "            v joins or moves up the queue",
];

/**
 * Pseudocode line of each kind of event. A lowered cost is one event, so it points at the cost it
 * changes; the queue update under it runs in the same step.
 */
const LINE = { start: 0, loop: 2, add: 3, inTree: 5, check: 6, lower: 7 } as const;

const hasDirectedEdge = ({ adjacencyList }: AlgorithmInput) =>
  [...adjacencyList.values()].some((edges) => edges.some((edge) => edge.type === EDGE_TYPE.DIRECTED));

/**
 * Everything Prim's does on this input, as events. Empty for a graph with directed edges.
 * Each node keeps the cost of the cheapest edge joining it to the tree; the cheapest node joins next.
 * The tree spans what the start can reach. Which node joins next is a decision: every node at the
 * least cost is valid, and `choose` picks one (by default the first in key order).
 */
function primsEvents(input: AlgorithmInput, choose: ChoicePolicy = firstOption): AlgorithmEvent[] {
  const { adjacencyList, nodes, startNodeId: start } = input;
  if (hasDirectedEdge(input)) return [];

  const key = new Map<number, number>([...adjacencyList.keys()].map((id) => [id, Infinity]));
  key.set(start, 0);
  const parent = new Map<number, number>();
  const tree = new Set<number>();
  const edges: WeightedEdge[] = [];
  let total = 0;
  let group = 0;
  const events: AlgorithmEvent[] = [{ type: "enqueue", node: start, value: 0, line: LINE.start, group }];

  for (let i = 0; i < nodes.length; i++) {
    // The cheapest nodes not yet in the tree, in key order.
    let min = Infinity;
    for (const [id, k] of key) if (!tree.has(id)) min = Math.min(min, k);
    if (min === Infinity) break;

    group += 1;
    const cheapest = [...key].flatMap(([id, k]) => (!tree.has(id) && k === min ? [id] : []));
    const node = decide(events, choose, "next", cheapest, { line: LINE.add, group });
    const via = parent.get(node);
    tree.add(node);
    if (via !== undefined) {
      total += min;
      edges.push({ from: via, to: node, weight: min });
    }
    events.push({
      type: "settle", node, value: min, via, line: LINE.add, group,
      ...(cheapest.length > 1 && { ties: cheapest }),
    });

    for (const { to, weight } of adjacencyList.get(node) ?? []) {
      const edge = { from: node, to, weight, group };
      if (tree.has(to)) {
        events.push({ type: "skip", ...edge, reason: "settled", line: LINE.inTree });
        continue;
      }
      const old = key.get(to) ?? Infinity;
      if (weight < old) {
        key.set(to, weight);
        parent.set(to, node);
        events.push({ type: "relax", ...edge, old, next: weight, queue: true, line: LINE.lower });
      } else {
        events.push({ type: "skip", ...edge, reason: "not-shorter", value: weight, current: old, line: LINE.check });
      }
    }
  }

  const unreached = nodes.map((n) => n.id).filter((id) => !tree.has(id));
  events.push({ type: "answer", kind: "tree", start, edges, total, unreached, line: LINE.loop, group: group + 1 });
  return events;
}

const primsAdapter: AlgorithmAdapter = {
  metadata: {
    id: "prims",
    name: "Prim's MST",
    type: AlgorithmType.TREE,
    tagline: "Build minimum spanning tree",
    icon: PrimsIcon,
    inputStepHints: ["Select a node"],
  },

  pseudocode: PSEUDOCODE,
  events: primsEvents,

  /** A graph in pieces still runs: the tree spans the start's piece and the answer names the rest. */
  refusal: (_events, input) =>
    hasDirectedEdge(input) ? "MST requires an undirected graph. Found directed edges." : undefined,
};

export default primsAdapter;
