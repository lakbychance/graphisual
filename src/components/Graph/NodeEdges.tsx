import { memo } from "react";
import { GraphEdge } from "./types";
import { Edge } from "./Edge/Edge";
import { useGraphStore } from "../../store/graphStore";
import { useShallow } from "zustand/shallow";

interface NodeEdgesProps {
  nodeId: number;
  isVisualizing: boolean;
  onEdgeClick: (edge: GraphEdge, nodeId: number, clickPosition: { x: number; y: number }) => void;
}

export const NodeEdges = memo(function NodeEdges({
  nodeId,
  isVisualizing,
  onEdgeClick,
}: NodeEdgesProps) {
  // Subscribe to THIS node's edges only
  const nodeEdges = useGraphStore(useShallow((state) => state.data.edges.get(nodeId)));

  if (!nodeEdges?.length) return null;

  return (
    <>
      {nodeEdges.map((edge: GraphEdge) => (
        <Edge
          key={`${nodeId}-${edge.to}`}
          edge={edge}
          sourceNodeId={nodeId}
          isVisualizing={isVisualizing}
          onEdgeClick={onEdgeClick}
        />
      ))}
    </>
  );
});
