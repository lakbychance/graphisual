/**
 * Prim's Minimum Spanning Tree Algorithm Adapter
 *
 * Finds a minimum spanning tree for a weighted undirected graph.
 * Starts from a node and greedily adds the minimum weight edge
 * that connects the tree to a new vertex.
 */

import { PrimsIcon } from "../icons";
import { nid } from "../traceHelpers";
import type { AlgorithmEvent, WeightedEdge } from "../engine";
import {
  AlgorithmAdapter,
  AlgorithmInput,
  AlgorithmResult,
  AlgorithmType,
  AlgorithmGenerator,
  StepType,
} from "../types";
import { EDGE_TYPE } from "../../constants/graph";

const PSEUDOCODE = [
  "tree ← { source }",
  "queue ← edges leaving source",
  "while queue is not empty:",
  "    (u, v, w) ← queue.extractMin()",
  "    if v is already in tree: continue",
  "    tree.add(v), keep edge (u, v)",
  "    for each edge (v, x, w) leaving v:",
  "        if x is not in tree:",
  "            queue.insert((v, x, w))",
];

/** Pseudocode line of each kind of event. */
const LINE = { start: 0, loop: 2, add: 5, check: 7, insert: 8 } as const;

const hasDirectedEdge = ({ adjacencyList }: AlgorithmInput) =>
  [...adjacencyList.values()].some((edges) => edges.some((edge) => edge.type === EDGE_TYPE.DIRECTED));

/**
 * Everything Prim's does on this input, as events. Empty for a graph with directed edges.
 * Each node keeps the cost of the cheapest edge joining it to the tree; the cheapest node joins next.
 * The tree spans what the start can reach.
 */
function primsEvents(input: AlgorithmInput): AlgorithmEvent[] {
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
    // The cheapest node not yet in the tree; on a tie the first one in key order.
    let node: number | null = null;
    let min = Infinity;
    for (const [id, k] of key) if (!tree.has(id) && k < min) { min = k; node = id; }
    if (node === null) break;

    group += 1;
    const ties = [...key].flatMap(([id, k]) => (id !== node && !tree.has(id) && k === min ? [id] : []));
    const via = parent.get(node);
    tree.add(node);
    if (via !== undefined) {
      total += min;
      edges.push({ from: via, to: node, weight: min });
    }
    events.push({
      type: "settle", node, value: min, via, line: via === undefined ? LINE.start : LINE.add, group,
      ...(ties.length > 0 && { ties }),
    });

    for (const { to, weight } of adjacencyList.get(node) ?? []) {
      const edge = { from: node, to, weight, group };
      if (tree.has(to)) {
        events.push({ type: "skip", ...edge, reason: "settled", line: LINE.check });
        continue;
      }
      const old = key.get(to) ?? Infinity;
      if (weight < old) {
        key.set(to, weight);
        parent.set(to, node);
        events.push({ type: "relax", ...edge, old, next: weight, queue: true, line: LINE.insert });
      } else {
        events.push({ type: "skip", ...edge, reason: "not-shorter", value: weight, current: old, line: LINE.insert });
      }
    }
  }

  const unreached = nodes.map((n) => n.id).filter((id) => !tree.has(id));
  events.push({ type: "answer", kind: "tree", start, edges, total, unreached, line: LINE.loop, group: group + 1 });
  return events;
}

/**
 * Today's app steps, derived from the events: one VISIT step per node added to the tree, with
 * the queue after its edges are checked. Replaced by frames in task 0.4.
 */
function* legacySteps(events: AlgorithmEvent[], input: AlgorithmInput): AlgorithmGenerator {
  // The order the app scans keys in: the graph's nodes, then any node first given a key later.
  const order = [...input.adjacencyList.keys()];
  if (!order.includes(input.startNodeId)) order.push(input.startNodeId);
  const key = new Map<number, number>();
  const tree = new Set<number>();
  let total = 0;

  for (let i = 0; i < events.length; i++) {
    const settle = events[i];
    if (settle.type !== "settle") continue;
    const node = settle.node;
    const weight = settle.via === undefined ? 0 : (settle.value as number);
    tree.add(node);
    total += weight;
    const updated: number[] = [];
    for (let j = i + 1; j < events.length && events[j].group === settle.group; j++) {
      const e = events[j];
      if (e.type !== "relax") continue;
      if (!order.includes(e.to)) order.push(e.to);
      key.set(e.to, e.next);
      updated.push(e.to);
    }

    let message = settle.via === undefined
      ? `**Starting at node ${nid(node)}**`
      : `**Adding edge ${nid(settle.via)}→${nid(node)}** (weight: ${weight})`;
    if (updated.length > 0) message += `, updated **${updated.map(nid).join(", ")}**`;
    message += `\nMST: **${tree.size}** nodes, total weight: **${total}**`;

    yield {
      type: StepType.VISIT,
      edge: { from: settle.via ?? -1, to: node },
      trace: {
        message,
        dataStructure: {
          type: "priority-queue",
          items: order
            .filter((id) => !tree.has(id) && key.has(id))
            .map((id) => ({ id, value: key.get(id) as number }))
            .sort((a, b) => a.value - b.value),
          processing: { id: node, value: weight },
          justAdded: updated.length > 0 ? updated : undefined,
        },
      },
    };
  }
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

  /**
   * Generator for step-through mode.
   */
  generator: (input) => legacySteps(primsEvents(input), input),

  /**
   * Synchronous execution using generator internally.
   */
  execute: (input: AlgorithmInput): AlgorithmResult => {
    if (hasDirectedEdge(input)) {
      return { steps: [], error: "MST requires an undirected graph. Found directed edges." };
    }

    const steps = [...primsAdapter.generator(input)];
    const visitedCount = steps.filter((s) => s.type === StepType.VISIT).length;

    // Check if all nodes are included (graph is connected)
    if (visitedCount !== input.nodes.length) {
      return { steps, error: "Graph is not connected. MST requires a connected graph." };
    }

    return { steps };
  },
};

export default primsAdapter;
