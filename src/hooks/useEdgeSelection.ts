import { useCallback } from "react";
import { GraphEdge } from "../components/Graph/types";
import { EdgeType } from "../constants";
import { useGraphStore } from "../store/graphStore";

interface UseEdgeSelectionProps {
  isVisualizing: boolean;
}

export function useEdgeSelection({ isVisualizing }: UseEdgeSelectionProps) {
  // Subscribe to store actions
  const selectEdgeAction = useGraphStore((state) => state.selectEdge);
  const clearEdgeSelection = useGraphStore((state) => state.clearEdgeSelection);
  const updateEdgeTypeAction = useGraphStore((state) => state.updateEdgeType);
  const updateEdgeWeightAction = useGraphStore((state) => state.updateEdgeWeight);
  const reverseEdgeAction = useGraphStore((state) => state.reverseEdge);
  const deleteEdgeAction = useGraphStore((state) => state.deleteEdge);

  // Subscribe to selectedEdge for the action callbacks
  const selectedEdge = useGraphStore((state) => state.selection.edge);

  const handleEdge = useCallback(
    (edge: GraphEdge, fromNodeId: number, clickPosition: { x: number; y: number }) => {
      if (isVisualizing) return;
      const { data } = useGraphStore.getState();
      const fromNode = data.nodes.find(n => n.id === fromNodeId);
      if (!fromNode) return;
      selectEdgeAction(edge, fromNode, clickPosition);
    },
    [isVisualizing, selectEdgeAction]
  );

  const closeEdgePopup = useCallback(() => {
    clearEdgeSelection();
  }, [clearEdgeSelection]);

  const updateEdgeType = useCallback((newType: EdgeType) => {
    if (!selectedEdge) return;
    updateEdgeTypeAction(selectedEdge.sourceNode.id, selectedEdge.edge.to, newType);
  }, [selectedEdge, updateEdgeTypeAction]);

  const updateEdgeWeight = useCallback((newWeight: number) => {
    if (!selectedEdge) return;
    updateEdgeWeightAction(selectedEdge.sourceNode.id, selectedEdge.edge.to, newWeight);
  }, [selectedEdge, updateEdgeWeightAction]);

  const reverseEdge = useCallback(() => {
    if (!selectedEdge) return;
    reverseEdgeAction(selectedEdge.sourceNode.id, selectedEdge.edge.to);
  }, [selectedEdge, reverseEdgeAction]);

  const deleteEdge = useCallback(() => {
    if (!selectedEdge) return;
    deleteEdgeAction(selectedEdge.sourceNode.id, selectedEdge.edge.to);
  }, [selectedEdge, deleteEdgeAction]);

  return {
    handleEdge,
    closeEdgePopup,
    updateEdgeType,
    updateEdgeWeight,
    reverseEdge,
    deleteEdge,
  };
}
