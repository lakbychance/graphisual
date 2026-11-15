import { Redo2, Trash2, Undo2 } from "lucide-react";
import { Toolbar, ToolbarSeparator } from "@/components/ui-sdk";
import { IconAction } from "../ui/icon-action";
import { useGraphStore, selectCanUndo, selectCanRedo, selectCanDeleteSelectedNodes } from "../../store/graphStore";
import { ZoomControls } from "./ZoomControls";

interface MobileControlsProps {
  onUndo: () => void;
  onRedo: () => void;
  onDeleteSelectedNodes: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
}

export function MobileControls({ onUndo, onRedo, onDeleteSelectedNodes, onZoomIn, onZoomOut, onZoomReset }: MobileControlsProps) {
  const canUndo = useGraphStore(selectCanUndo);
  const canRedo = useGraphStore(selectCanRedo);
  const canDeleteSelectedNodes = useGraphStore(selectCanDeleteSelectedNodes);

  return (
    <div className="flex justify-between">
      <Toolbar surface="bare" aria-label="Zoom controls" className="z-40 gap-2 p-2 rounded-md backdrop-blur-sm">
        <ZoomControls onZoomIn={onZoomIn} onZoomOut={onZoomOut} onZoomReset={onZoomReset} />
      </Toolbar>
      <Toolbar surface="bare" aria-label="Edit controls" className="gap-2 p-2 rounded-md backdrop-blur-sm">
        <IconAction label="Undo" side="top" disabled={!canUndo} onClick={onUndo}><Undo2 aria-hidden="true" /></IconAction>
        <IconAction label="Redo" side="top" disabled={!canRedo} onClick={onRedo}><Redo2 aria-hidden="true" /></IconAction>
        <ToolbarSeparator className="h-5 mx-0.5" />
        <IconAction label="Delete selected nodes" side="top" tone="danger" disabled={!canDeleteSelectedNodes} onClick={onDeleteSelectedNodes}>
          <Trash2 aria-hidden="true" />
        </IconAction>
      </Toolbar>
    </div>
  );
}
