/**
 * Runs an algorithm on the app's graph and cuts its events into a run, or says why the app will
 * not play it. Tapping nodes and opening a step link both start runs through here.
 */
import { algorithmRegistry, type EdgeInfo } from "../../algorithms";
import { graphFacts, unmetNeed, type Evidence } from "../../algorithms/facts";
import type { GraphEdge, GraphNode } from "../../components/Graph/types";
import type { EdgeType } from "../../constants/graph";
import { createRun, type Run } from "./runView";

/**
 * A run to play, or the message the app shows instead (`warning` before running, when the graph
 * lacks a fact the algorithm needs, with the `evidence` to light on the canvas; `error` after).
 */
export type BuiltRun = { run: Run } | { problem: string; severity: "warning" | "error"; evidence?: Evidence };

/**
 * Why a graph of `nodeCount` nodes can't run here, or null: past `nodeLimit` (a phone's, D71) the
 * graph opens and can be edited, but its run would not fit, so it points to a bigger screen.
 */
export function tooBigToRun(nodeCount: number, nodeLimit?: number): Extract<BuiltRun, { problem: string }> | null {
  if (nodeLimit === undefined || nodeCount <= nodeLimit) return null;
  return { problem: `This graph has ${nodeCount} nodes; phones run up to ${nodeLimit} — open it on a bigger screen`, severity: "warning" };
}

/**
 * `stepMode`: the run is for Step mode, where the notebook says its answer in words. There a cycle
 * detection that finds no cycle plays to its end ("…so the graph has no cycle") instead of showing
 * the message; Auto mode, with no notebook, keeps the message. `nodeLimit`: see `tooBigToRun`.
 */
export function buildRun(
  algorithmId: string,
  nodes: GraphNode[],
  edges: Map<number, GraphEdge[]>,
  startNodeId: number,
  endNodeId?: number,
  { stepMode = false, nodeLimit }: { stepMode?: boolean; nodeLimit?: number } = {},
): BuiltRun | null {
  const algorithm = algorithmRegistry.get(algorithmId);
  if (!algorithm) return null;
  const tooBig = tooBigToRun(nodes.length, nodeLimit);
  if (tooBig) return tooBig;
  const { id, name } = algorithm.metadata;

  // Node ids are marked `{n:id}`; show each node's label.
  const named = (message: string) => message.replace(/\{n:(\d+)\}/g, (_, nodeId) => nodes.find((n) => n.id === Number(nodeId))?.label || nodeId);

  const unmet = unmetNeed(name, algorithm.needs ?? [], graphFacts({ nodes, adjacencyList: edges }));
  if (unmet) return { problem: named(unmet.message), severity: "warning", evidence: unmet.evidence };

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
  if (refusal) return { problem: named(refusal), severity: "error" };
  return { run: createRun(id, events, [...adjacencyList.keys()], input) };
}
