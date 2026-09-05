import { StepType } from "../../constants/visualization";
import { EDGE_TYPE } from "../../constants/graph";
import type { AlgorithmStep } from "../../algorithms/types";
import type {
  GraphEdge,
  VisualizationTrace,
  NodeVisualizationFlags,
  EdgeVisualizationFlags,
} from "../../components/Graph/types";

const NODE_FLAGS: Record<StepType, NodeVisualizationFlags> = {
  [StepType.VISIT]: { isVisited: true },
  [StepType.RESULT]: { isInShortestPath: true },
  [StepType.CYCLE]: { isInCycle: true },
};

const EDGE_FLAGS: Record<StepType, EdgeVisualizationFlags> = {
  [StepType.VISIT]: { isUsedInTraversal: true },
  [StepType.RESULT]: { isUsedInShortestPath: true },
  [StepType.CYCLE]: { isUsedInCycle: true },
};

export const emptyTrace = (): VisualizationTrace => ({ nodes: new Map(), edges: new Map() });

/**
 * Builds the highlight state of a graph after applying `steps` in order.
 * The root step (from -1) marks only its node. Undirected edges are marked in both directions.
 */
export function buildTrace(steps: AlgorithmStep[], edges: Map<number, GraphEdge[]>): VisualizationTrace {
  const trace = emptyTrace();

  const markEdge = (from: number, to: number, flags: EdgeVisualizationFlags) => {
    const key = `${from}-${to}`;
    trace.edges.set(key, { ...trace.edges.get(key), ...flags });
  };

  for (const { type, edge: { from, to } } of steps) {
    trace.nodes.set(to, { ...trace.nodes.get(to), ...NODE_FLAGS[type] });
    if (from === -1) continue;

    markEdge(from, to, EDGE_FLAGS[type]);
    const isUndirected = edges.get(from)?.some((e) => e.to === to && e.type === EDGE_TYPE.UNDIRECTED);
    if (isUndirected) markEdge(to, from, EDGE_FLAGS[type]);
  }

  return trace;
}
