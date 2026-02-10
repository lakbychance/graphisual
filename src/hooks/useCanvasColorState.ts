import { useCallback } from "react";
import type { NodeColorState, EdgeColorState } from "../utils/cssVariables";
import type { NodeVisualizationFlags, EdgeVisualizationFlags, GraphEdge } from "../components/Graph/types";

interface UseCanvasColorStateProps {
  visualizationInput: { startNodeId: number; endNodeId: number } | null;
  visualizationTrace: {
    nodes: Map<number, NodeVisualizationFlags>;
    edges: Map<string, EdgeVisualizationFlags>;
  };
  focusedEdge: { from: number; to: number } | null;
  edges: Map<number, GraphEdge[]>;
}

export function useCanvasColorState({
  visualizationInput,
  visualizationTrace,
  focusedEdge,
  edges,
}: UseCanvasColorStateProps) {
  const getNodeColorState = useCallback((nodeId: number): NodeColorState => {
    if (visualizationInput?.startNodeId === nodeId) return 'start';
    if (visualizationInput?.endNodeId === nodeId) return 'end';
    const flags = visualizationTrace.nodes.get(nodeId);
    if (flags?.isInCycle) return 'cycle';
    if (flags?.isInShortestPath) return 'path';
    if (flags?.isVisited) return 'visited';
    return 'default';
  }, [visualizationInput, visualizationTrace.nodes]);

  const getEdgeColorState = useCallback((fromId: number, toId: number): EdgeColorState => {
    const flags = visualizationTrace.edges.get(`${fromId}-${toId}`);
    if (flags?.isUsedInCycle) return 'cycle';
    if (flags?.isUsedInShortestPath) return 'path';
    if (flags?.isUsedInTraversal) return 'traversal';
    return 'default';
  }, [visualizationTrace.edges]);

  const isEdgeFocused = useCallback((fromId: number, toId: number): boolean => {
    if (!focusedEdge) return false;
    if (focusedEdge.from === fromId && focusedEdge.to === toId) return true;
    // Check reverse for undirected
    if (focusedEdge.from === toId && focusedEdge.to === fromId) {
      const edge = edges.get(fromId)?.find(e => e.to === toId);
      if (edge?.type === 'undirected') return true;
    }
    return false;
  }, [focusedEdge, edges]);

  return { getNodeColorState, getEdgeColorState, isEdgeFocused };
}
