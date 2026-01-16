import { useState, useEffect, useRef, memo } from "react";
import { IEdge } from "./IGraph";
import { MoveRight, Minus, ArrowLeftRight, Trash2 } from "lucide-react";
import { GrainTexture } from "../ui/grain-texture";
import { RadixToggleGroup, RadixToggleGroupItem } from "../ui/toggle-group";
import { Stepper, StepperDecrement, StepperField, StepperIncrement } from "../ui/stepper-input";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverAnchor } from "../ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

interface EdgePopupProps {
  edge: IEdge;
  anchorPosition: { x: number; y: number };
  onClose: () => void;
  onUpdateType: (type: "directed" | "undirected") => void;
  onUpdateWeight: (weight: number) => void;
  onReverse: () => void;
  onDelete: () => void;
}

export const EdgePopup = memo(function EdgePopup({
  edge,
  anchorPosition,
  onClose,
  onUpdateType,
  onUpdateWeight,
  onReverse,
  onDelete,
}: EdgePopupProps) {
  const [weight, setWeight] = useState(edge.weight || 0);
  const [type, setType] = useState<"directed" | "undirected">(
    edge.type as "directed" | "undirected"
  );
  const [isOpen, setIsOpen] = useState(true);
  const weightInputRef = useRef<HTMLInputElement>(null);

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

  const handleTypeChange = (newType: "directed" | "undirected") => {
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
          className="p-1.5 font-['Outfit']"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <GrainTexture className="rounded-lg" />

          <div className="flex items-center gap-1.5">
            {/* Type toggle section */}
            <RadixToggleGroup
              type="single"
              value={type}
              onValueChange={(value) => value && handleTypeChange(value as "directed" | "undirected")}
              variant="etched"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex-1">
                    <RadixToggleGroupItem

                      value="directed"
                      className="w-8 h-8 flex-none px-1.5"
                    >
                      <MoveRight className="w-4 h-4" />
                    </RadixToggleGroupItem>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">Directed</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex-1">
                    <RadixToggleGroupItem

                      value="undirected"
                      className="w-8 h-8 flex-none px-1.5"
                    >
                      <Minus className="w-4 h-4" />
                    </RadixToggleGroupItem>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">Undirected</TooltipContent>
              </Tooltip>
            </RadixToggleGroup>

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
              <StepperField ref={weightInputRef} />
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
            <div className="flex gap-1">
              {type === "directed" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleReverse}

                      variant="default"
                      size="icon-sm"
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
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Delete edge</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
});
