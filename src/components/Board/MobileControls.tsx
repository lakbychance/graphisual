import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Undo2, Redo2, Trash2 } from "lucide-react";
import { useGraphStore, selectCanUndo, selectCanRedo, selectCanDeleteSelectedNodes } from "../../store/graphStore";
import { Toolbar, ToolbarButton, ToolbarSeparator } from "../ui/toolbar";
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
      <div className="z-40 gap-2">
        <Toolbar aria-label="Zoom controls" className="relative flex items-center gap-2 p-2 rounded-md backdrop-blur-sm">
          <ZoomControls onZoomIn={onZoomIn} onZoomOut={onZoomOut} onZoomReset={onZoomReset} />
        </Toolbar>
      </div>
      <Toolbar aria-label="Edit controls" className="flex items-center gap-2 p-2 rounded-md backdrop-blur-sm">
        <ToolbarButton asChild>
          <Button onClick={onUndo} disabled={!canUndo} variant="ghost" size="icon-sm" aria-label="Undo">
            <Undo2 size={16} className={cn(canUndo ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
          </Button>
        </ToolbarButton>
        <ToolbarButton asChild>
          <Button onClick={onRedo} disabled={!canRedo} variant="ghost" size="icon-sm" aria-label="Redo">
            <Redo2 size={16} className={cn(canRedo ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
          </Button>
        </ToolbarButton>
        <ToolbarSeparator className="h-5 mx-0.5" />
        <ToolbarButton asChild>
          <Button onClick={onDeleteSelectedNodes} disabled={!canDeleteSelectedNodes} variant="ghost" size="icon-sm" aria-label="Delete selected nodes">
            <Trash2 size={16} className={cn(canDeleteSelectedNodes ? "text-[var(--color-error)]" : "text-[var(--color-text-muted)]")} />
          </Button>
        </ToolbarButton>
      </Toolbar>
    </div>
  );
}
