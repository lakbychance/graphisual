import { useEffect, useState } from "react";
import { ArrowLeftRight, Minus, MoveRight, Trash2 } from "lucide-react";
import {
  Button, Divider, Popover, PopoverContent, Stepper, Toggle, ToggleGroup, ToggleIcon, Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui-sdk";
import { GraphEdge } from "./types";
import { EDGE, EDGE_TYPE, type EdgeType } from "../../constants/graph";
import { useGraphStore, selectHasReverseEdge } from "../../store/graphStore";

interface EdgePopupProps {
  edge: GraphEdge;
  anchorPosition: { x: number; y: number };
  onClose: () => void;
  onUpdateType: (type: EdgeType) => void;
  onUpdateWeight: (weight: number) => void;
  onReverse: () => void;
  onDelete: () => void;
}

/**
 * Edge editor, anchored at the click point. ui-sdk Popover takes a point as
 * `anchor`, keeps the content mounted through its exit transition and reports
 * `onOpenChangeComplete` when it has gone, which is when we unmount.
 */
export const EdgePopup = ({
  edge,
  anchorPosition,
  onClose,
  onUpdateType,
  onUpdateWeight,
  onReverse,
  onDelete,
}: EdgePopupProps) => {
  const [weight, setWeight] = useState<number | null>(edge.weight ?? EDGE.DEFAULT_WEIGHT);
  const [type, setType] = useState<EdgeType>(edge.type as EdgeType);
  // Content rendered already-open gets no initial focus from ui-sdk, so mount
  // closed and open on the next tick: it then focuses like a user-opened popup.
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    setIsOpen(true);
  }, []);

  const hasReverseEdge = useGraphStore(selectHasReverseEdge(edge.from, edge.to));
  // Can only switch to undirected if: already undirected OR no reverse edge exists
  const canSwitchToUndirected = type === EDGE_TYPE.UNDIRECTED || !hasReverseEdge;

  const handleClose = () => setIsOpen(false);

  const handleTypeChange = (newType: EdgeType) => {
    setType(newType);
    onUpdateType(newType);
  };

  const handleWeightChange = (newWeight: number | null) => {
    setWeight(newWeight);
    if (newWeight !== null) onUpdateWeight(newWeight);
  };

  const handleReverse = () => {
    onReverse();
    handleClose();
  };

  const handleDelete = () => {
    onDelete();
    handleClose();
  };

  return (
    <Popover
      modal
      open={isOpen}
      onOpenChange={(open) => !open && handleClose()}
      onOpenChangeComplete={(open) => !open && onClose()}
    >
      <PopoverContent
        side="top"
        sideOffset={8}
        anchor={anchorPosition}
        initialFocus=".gs-stepper-control"
        className="p-2"
        aria-label="Edge controls"
        onKeyDown={(e) => {
          // Keep Escape/Enter from reaching the graph's own keyboard handlers.
          if (e.key === "Escape" || e.key === "Enter") {
            e.stopPropagation();
            handleClose();
          }
        }}
      >
        <div role="group" aria-label="Edge controls" className="flex items-center gap-2">
          <ToggleGroup
            aria-label="Edge type"
            value={[type]}
            deselectable={false}
            onValueChange={([value]) => value && handleTypeChange(value as EdgeType)}
          >
            <Tooltip>
              <TooltipTrigger render={<Toggle value={EDGE_TYPE.DIRECTED} aria-label="Directed edge" />}>
                <ToggleIcon><MoveRight /></ToggleIcon>
              </TooltipTrigger>
              <TooltipContent side="bottom">Directed</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<Toggle value={EDGE_TYPE.UNDIRECTED} aria-label="Undirected edge" disabled={!canSwitchToUndirected} />}>
                <ToggleIcon><Minus /></ToggleIcon>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {canSwitchToUndirected ? "Undirected" : "Delete reverse edge first"}
              </TooltipContent>
            </Tooltip>
          </ToggleGroup>

          <Divider />

          <Stepper
            label="Edge weight"
            value={weight}
            onValueChange={handleWeightChange}
            min={EDGE.MIN_WEIGHT}
            max={EDGE.MAX_WEIGHT}
            controlClassName="w-12"
          />

          <Divider />

          {/* Reversing is impossible if the opposite edge already exists */}
          {type === EDGE_TYPE.DIRECTED && !hasReverseEdge && (
            <Tooltip>
              <TooltipTrigger render={<Button size="icon-sm" aria-label="Reverse direction" onClick={handleReverse} />}>
                <ArrowLeftRight aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent side="bottom">Reverse direction</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger render={<Button size="icon-sm" tone="danger" aria-label="Delete edge" onClick={handleDelete} />}>
              <Trash2 aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent side="bottom">Delete edge</TooltipContent>
          </Tooltip>
        </div>
      </PopoverContent>
    </Popover>
  );
};
