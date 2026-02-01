import { useGraphStore } from "../../store/graphStore";
import { StepType } from "../../constants/visualization";
import { EDGE_TYPE } from "../../constants/graph";
import type { GraphEdge } from "../../components/Graph/types";

/**
 * Edge reference for visualization - minimal interface with from/to IDs.
 */
export interface EdgeRef {
  from: number;
  to: number;
}

/**
 * Apply a single visualization step to the graph trace state.
 *
 * Marks the target node and edge based on the step type:
 * - VISIT: marks as visited/used in traversal
 * - RESULT: marks as part of shortest path
 * - CYCLE: marks as part of a detected cycle
 *
 * For undirected edges, also marks the reverse direction if edges map is provided.
 *
 * @param edge - Edge reference with from/to node IDs
 * @param stepType - Whether this is a VISIT, RESULT, or CYCLE step
 * @param edges - Optional edges map for undirected edge handling
 */
export function applyVisualizationStep(
  edge: EdgeRef,
  stepType: StepType,
  edges?: Map<number, GraphEdge[]>
): void {
  const { setTraceNode, setTraceEdge } = useGraphStore.getState();
  const fromId = edge.from;
  const toId = edge.to;

  // Mark the target node based on step type
  if (stepType === StepType.VISIT) {
    setTraceNode(toId, { isVisited: true });
  } else if (stepType === StepType.CYCLE) {
    setTraceNode(toId, { isInCycle: true });
  } else {
    setTraceNode(toId, { isInShortestPath: true });
  }

  // Mark the edge (skip root edge from -1)
  if (fromId !== -1) {
    let edgeFlags;
    if (stepType === StepType.VISIT) {
      edgeFlags = { isUsedInTraversal: true };
    } else if (stepType === StepType.CYCLE) {
      edgeFlags = { isUsedInCycle: true };
    } else {
      edgeFlags = { isUsedInShortestPath: true };
    }

    setTraceEdge(fromId, toId, edgeFlags);

    // For undirected edges, also mark the reverse direction
    if (edges) {
      const edgeList = edges.get(fromId);
      const graphEdge = edgeList?.find((e) => e.to === toId);
      if (graphEdge?.type === EDGE_TYPE.UNDIRECTED) {
        setTraceEdge(toId, fromId, edgeFlags);
      }
    }
  }
}
