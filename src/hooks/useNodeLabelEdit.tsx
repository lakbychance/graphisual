/**
 * Shared hook for node label editing across SVG and Canvas renderers.
 * Manages editing state, confirmation, and portal rendering of NodeLabelPopup.
 *
 * The anchor position is computed dynamically at render time (not stored in state),
 * so the popup correctly follows the node when the viewport is panned or zoomed.
 */

import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useGraphStore } from "../store/graphStore";
import { NodeLabelPopup } from "../components/Graph/NodeLabelPopup";
import type { GraphNode } from "../components/Graph/types";

interface UseNodeLabelEditOptions {
  nodes: GraphNode[];
  /** Convert a node's world/SVG coordinates to screen coordinates for popup positioning. */
  nodeToScreenCoords: (x: number, y: number) => { x: number; y: number };
  selectNode: (id: number | null) => void;
  /** Called after the popup closes to restore keyboard focus to the graph element. */
  onCloseFocus: () => void;
}

export function useNodeLabelEdit({
  nodes,
  nodeToScreenCoords,
  selectNode,
  onCloseFocus,
}: UseNodeLabelEditOptions) {
  const [editingNodeId, setEditingNodeId] = useState<number | null>(null);
  const updateNodeLabel = useGraphStore((state) => state.updateNodeLabel);

  const handleLabelEdit = useCallback(
    (nodeId: number) => {
      selectNode(null);
      setEditingNodeId(nodeId);
    },
    [selectNode]
  );

  const confirmLabel = useCallback(
    (nodeId: number, label: string) => {
      updateNodeLabel(nodeId, label);
      selectNode(nodeId);
    },
    [updateNodeLabel, selectNode]
  );

  const closeLabelPopup = useCallback(() => {
    setEditingNodeId(null);
    onCloseFocus();
  }, [onCloseFocus]);

  // Anchor is computed at render time so it stays in sync with zoom/pan changes.
  const labelPopupElement =
    editingNodeId !== null
      ? (() => {
          const node = nodes.find((n) => n.id === editingNodeId);
          if (!node) return null;
          const anchor = nodeToScreenCoords(node.x, node.y);
          return createPortal(
            <NodeLabelPopup
              anchorPosition={anchor}
              nodeId={editingNodeId}
              currentLabel={node.label}
              onConfirm={(label) => confirmLabel(editingNodeId, label)}
              onClose={closeLabelPopup}
            />,
            document.body
          );
        })()
      : null;

  return { handleLabelEdit, labelPopupElement };
}
