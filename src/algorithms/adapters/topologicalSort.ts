/**
 * Topological Sort Adapter (Kahn's algorithm)
 *
 * Puts the nodes of a DAG in an order where every edge points forwards: count the edges pointing into
 * each node; a node with none left is ready; take any ready node, put it next in the order, and let
 * its edges go, which leaves one edge fewer pointing into each node they lead to.
 *
 * It works on the whole graph, so the node tapped to start it changes nothing. The app runs it only on
 * a DAG (`needs`); on any other graph the ready list runs dry while nodes on a cycle still wait, and
 * the answer names them (`SortAnswer.stuck`).
 */

import { TopologicalSortIcon } from "../icons";
import { decide, firstOption, type AlgorithmEvent, type ChoicePolicy } from "../engine";
import { AlgorithmAdapter, AlgorithmInput, AlgorithmType } from "../types";
import { nameOrder } from "./nameOrder";

const PSEUDOCODE = [
  "indeg[v] ← edges into v, for every v",
  "ready ← every node with indeg 0",
  "while ready is not empty:",
  "    move any u from ready to order",
  "    for each edge (u, v):",
  "        indeg[v] ← indeg[v] − 1",
  "        if indeg[v] = 0: ready.add(v)",
  "return order",
];

/** Pseudocode line of each kind of event. An edge that leaves its end with none points at the line that makes it ready. */
const LINE = { count: 0, ready: 1, take: 3, drop: 5, freed: 6, done: 7 } as const;

/**
 * Everything Kahn's algorithm does on this input, as events. Nodes are scanned in the order the graph
 * lists them, and each node's edges in the order it lists them. Which ready node goes next is a
 * decision: every node on the ready list is valid, and `choose` picks one (by default the one that
 * has waited longest).
 */
function topologicalSortEvents(input: AlgorithmInput, choose: ChoicePolicy = firstOption): AlgorithmEvent[] {
  const { adjacencyList } = input;
  const ids = [...adjacencyList.keys()];
  for (const { id } of input.nodes) if (!adjacencyList.has(id)) ids.push(id);
  const known = new Set(ids);

  const indeg = new Map<number, number>(ids.map((id) => [id, 0]));
  for (const edges of adjacencyList.values()) {
    for (const { to } of edges) if (known.has(to)) indeg.set(to, indeg.get(to)! + 1);
  }

  let group = 0;
  const events: AlgorithmEvent[] = [{ type: "count", counts: ids.map((node) => ({ node, value: indeg.get(node)! })), line: LINE.count, group }];
  const ready: number[] = [];
  for (const id of ids) {
    if (indeg.get(id) !== 0) continue;
    ready.push(id);
    events.push({ type: "enqueue", node: id, value: 0, line: LINE.ready, group });
  }

  const order: number[] = [];
  while (ready.length > 0) {
    group += 1;
    const options = [...ready];
    const node = decide(events, choose, "next", options, { line: LINE.take, group });
    ready.splice(ready.indexOf(node), 1);
    order.push(node);
    events.push({ type: "settle", node, line: LINE.take, group, ...(options.length > 1 && { ties: options }) });

    for (const { to, weight } of adjacencyList.get(node) ?? []) {
      if (!known.has(to)) continue;
      const old = indeg.get(to)!;
      const next = old - 1;
      indeg.set(to, next);
      if (next === 0) ready.push(to);
      events.push({ type: "relax", from: node, to, weight, old, next, line: next === 0 ? LINE.freed : LINE.drop, group, ...(next === 0 && { queue: true }) });
    }
  }

  const placed = new Set(order);
  const stuck = nameOrder(input).filter((id) => known.has(id) && !placed.has(id));
  events.push({ type: "answer", kind: "sort", order, stuck, line: LINE.done, group: group + 1 });
  return events;
}

const topologicalSortAdapter: AlgorithmAdapter = {
  metadata: {
    id: "topological-sort",
    name: "Topological Sort",
    type: AlgorithmType.TRAVERSAL,
    tagline: "Order nodes along the arrows",
    icon: TopologicalSortIcon,
    inputStepHints: ["Select any node to start"],
    landing: false,
  },

  pseudocode: PSEUDOCODE,
  events: topologicalSortEvents,

  needs: ["dag"],
};

export default topologicalSortAdapter;
