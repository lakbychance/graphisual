/**
 * Runs an algorithm on the app's graph and cuts its events into a run, or says why the app will
 * not play it. Tapping nodes and opening a step link both start runs through here.
 */
import { algorithmRegistry, type EdgeInfo } from "../../algorithms";
import type { GraphEdge, GraphNode } from "../../components/Graph/types";
import type { EdgeType } from "../../constants/graph";
import { ALGORITHMS_NO_NEGATIVE_WEIGHTS, hasNegativeWeights } from "../graph/graphUtils";
import { createRun, type Run } from "./runView";

/** A run to play, or the message the app shows instead (`warning` before running, `error` after). */
export type BuiltRun = { run: Run } | { problem: string; severity: "warning" | "error" };

/**
 * `stepMode`: the run is for Step mode, where the notebook says its answer in words. There a cycle
 * detection that finds no cycle plays to its end ("…so the graph has no cycle") instead of showing
 * the message; Auto mode, with no notebook, keeps the message.
 */
export function buildRun(
  algorithmId: string,
  nodes: GraphNode[],
  edges: Map<number, GraphEdge[]>,
  startNodeId: number,
  endNodeId?: number,
  { stepMode = false }: { stepMode?: boolean } = {},
): BuiltRun | null {
  const algorithm = algorithmRegistry.get(algorithmId);
  if (!algorithm) return null;
  const { id, name } = algorithm.metadata;

  if (ALGORITHMS_NO_NEGATIVE_WEIGHTS.has(id) && hasNegativeWeights(edges)) {
    return { problem: `${name} doesn't support negative edge weights. Use Bellman-Ford instead.`, severity: "warning" };
  }

  const adjacencyList = new Map<number, EdgeInfo[]>();
  edges.forEach((edgeList, nodeId) => {
    adjacencyList.set(nodeId, (edgeList || []).map((e) => ({
      from: e.from,
      to: e.to,
      weight: e.weight,
      type: e.type as EdgeType,
    })));
  });
  const input = { adjacencyList, nodes: nodes.map((n) => ({ id: n.id, label: n.label })), startNodeId, endNodeId };

  const events = algorithm.events(input);
  const noCycle = events.some((e) => e.type === "answer" && e.kind === "cycle" && e.cycle === null);
  const refusal = stepMode && noCycle ? undefined : algorithm.refusal?.(events, input);
  if (refusal) {
    // Node ids are marked `{n:id}`; show each node's label.
    const problem = refusal.replace(/\{n:(\d+)\}/g, (_, nodeId) => nodes.find((n) => n.id === Number(nodeId))?.label || nodeId);
    return { problem, severity: "error" };
  }
  return { run: createRun(id, events, [...adjacencyList.keys()], input) };
}
