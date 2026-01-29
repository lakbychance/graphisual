import { useState, useEffect, useRef } from "react";
import { GraphEdge } from "./types";
import { MoveRight, Minus, ArrowLeftRight, Trash2 } from "lucide-react";
import { GrainTexture } from "../ui/grain-texture";
import { Stepper, StepperDecrement, StepperField, StepperIncrement } from "../ui/stepper-input";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverAnchor } from "../ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { EDGE_TYPE, type EdgeType } from "../../constants/graph";
import { useGraphStore, selectHasReverseEdge } from "../../store/graphStore";
import { useHasHover } from "../../hooks/useMediaQuery";
import { cn } from "../../lib/utils";

interface EdgePopupProps {
  edge: GraphEdge;
  anchorPosition: { x: number; y: number };
  onClose: () => void;
  onUpdateType: (type: EdgeType) => void;
  onUpdateWeight: (weight: number) => void;
  onReverse: () => void;
  onDelete: () => void;
}

export const EdgePopup = ({
  edge,
  anchorPosition,
  onClose,
  onUpdateType,
  onUpdateWeight,
  onReverse,
  onDelete,
}: EdgePopupProps) => {
  const [weight, setWeight] = useState(edge.weight || 0);
  const [type, setType] = useState<EdgeType>(edge.type as EdgeType);
  const [isOpen, setIsOpen] = useState(true);
  const weightInputRef = useRef<HTMLInputElement>(null);

  // Check if a reverse edge exists (only matters for directed edges)
  const fromNodeId = edge.from;
  const toNodeId = edge.to;
  const hasReverseEdge = useGraphStore(selectHasReverseEdge(fromNodeId, toNodeId));

  // Can only switch to undirected if: already undirected OR no reverse edge exists
  const canSwitchToUndirected = type === EDGE_TYPE.UNDIRECTED || !hasReverseEdge;

  // Only show tooltips on hover-capable devices
  const hasHover = useHasHover();

  // Focus weight input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      weightInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    // Delay unmount to allow exit animation (150ms default from tailwindcss-animate)
    setTimeout(onClose, 150);
  };

  const handleTypeChange = (newType: EdgeType) => {
    setType(newType);
    onUpdateType(newType);
  };

  const handleWeightChange = (newWeight: number) => {
    setWeight(newWeight);
    onUpdateWeight(newWeight);
  };

  const handleReverse = () => {
    onReverse();
    handleClose();
  };

  const toggleButtonClass = (isActive: boolean, isDisabled?: boolean) => cn(
    "w-8 h-8 flex items-center justify-center rounded-md cursor-pointer focus-ring-animated",
    isActive
      ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--shadow-raised),var(--highlight-edge)]"
      : "bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
    isDisabled && "opacity-50 cursor-not-allowed"
  );

  const DirectedButton = (
    <button
      onClick={() => handleTypeChange(EDGE_TYPE.DIRECTED)}
      className={toggleButtonClass(type === EDGE_TYPE.DIRECTED)}
      aria-pressed={type === EDGE_TYPE.DIRECTED}
      aria-label="Directed edge"
    >
      <MoveRight className="w-4 h-4" />
    </button>
  );

  const UndirectedButton = (
    <button
      onClick={() => canSwitchToUndirected && handleTypeChange(EDGE_TYPE.UNDIRECTED)}
      disabled={!canSwitchToUndirected}
      className={toggleButtonClass(type === EDGE_TYPE.UNDIRECTED, !canSwitchToUndirected)}
      aria-pressed={type === EDGE_TYPE.UNDIRECTED}
      aria-label="Undirected edge"
    >
      <Minus className="w-4 h-4" />
    </button>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <Popover modal open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        {/* Virtual anchor positioned at click location */}
        <PopoverAnchor asChild>
          <div
            style={{
              position: "fixed",
              left: anchorPosition.x,
              top: anchorPosition.y,
              width: 1,
              height: 1,
              pointerEvents: "none",
            }}
          />
        </PopoverAnchor>

        <PopoverContent
          side="top"
          sideOffset={8}
          className="p-2"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <GrainTexture className="rounded-lg" />

          <div role="group" aria-label="Edge controls" className="flex items-center gap-2">
            {/* Type toggle section */}
            <div
              role="group"
              aria-label="Edge type"
              className="flex p-0.5 gap-2 bg-[var(--color-paper)] shadow-[var(--shadow-etched)] rounded-lg"
            >
              {hasHover ? (
                <Tooltip>
                  <TooltipTrigger asChild>{DirectedButton}</TooltipTrigger>
                  <TooltipContent side="bottom">Directed</TooltipContent>
                </Tooltip>
              ) : (
                DirectedButton
              )}
              {hasHover ? (
                <Tooltip>
                  <TooltipTrigger asChild>{UndirectedButton}</TooltipTrigger>
                  <TooltipContent side="bottom">
                    {canSwitchToUndirected ? "Undirected" : "Delete reverse edge first"}
                  </TooltipContent>
                </Tooltip>
              ) : (
                UndirectedButton
              )}
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-[var(--color-divider)]" />

            {/* Weight section */}
            <Stepper
              value={weight}
              onChange={handleWeightChange}
              min={-999}
              max={999}
              onEnter={handleClose}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <StepperDecrement />
                </TooltipTrigger>
                <TooltipContent side="bottom">Decrease weight</TooltipContent>
              </Tooltip>
              <StepperField ref={weightInputRef} aria-label="Edge weight" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <StepperIncrement />
                </TooltipTrigger>
                <TooltipContent side="bottom">Increase weight</TooltipContent>
              </Tooltip>
            </Stepper>

            {/* Divider */}
            <div className="w-px h-6 bg-[var(--color-divider)]" />

            {/* Actions section */}
            {type === EDGE_TYPE.DIRECTED && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleReverse}
                    variant="default"
                    size="icon-sm"
                    aria-label="Reverse direction"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Reverse direction</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onDelete}
                  variant="default"
                  size="icon-sm"
                  className="text-[var(--color-error)]"
                  aria-label="Delete edge"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Delete edge</TooltipContent>
            </Tooltip>
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
};
