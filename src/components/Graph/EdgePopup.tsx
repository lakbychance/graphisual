import { useState, useEffect, useRef } from "react";
import { IEdge } from "./IGraph";
import { MoveRight, Minus, ArrowLeftRight, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "../ui/tooltip";
import { GrainTexture } from "../ui/grain-texture";
import { ToggleGroup, ToggleItem } from "../ui/toggle-group";
import { StepperInput } from "../ui/stepper-input";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverAnchor } from "../ui/popover";

interface EdgePopupProps {
  edge: IEdge;
  anchorPosition: { x: number; y: number };
  onClose: () => void;
  onUpdateType: (type: "directed" | "undirected") => void;
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
  const [type, setType] = useState<"directed" | "undirected">(
    edge.type as "directed" | "undirected"
  );
  const weightInputRef = useRef<HTMLInputElement>(null);

  // Focus weight input on mount
  useEffect(() => {
    // Small delay to ensure popover is mounted
    const timer = setTimeout(() => {
      weightInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

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
    onClose();
  };

  return (
    <Popover open={true} onOpenChange={(open) => !open && onClose()}>
      {/* Virtual anchor positioned at edge midpoint */}
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
        className="w-[200px] p-3 font-['Outfit']"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <GrainTexture className="rounded-[var(--radius-md)]" />

        <TooltipProvider delayDuration={200}>
          {/* Edge Type toggle */}
          <div className="mb-2.5">
            <ToggleGroup variant="etched">
              <Tooltip>
                <TooltipTrigger asChild>
                  <ToggleItem
                    active={type === "directed"}
                    onClick={() => handleTypeChange("directed")}
                  >
                    <MoveRight className="w-4 h-4" />
                  </ToggleItem>
                </TooltipTrigger>
                <TooltipContent>Directed</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <ToggleItem
                    active={type === "undirected"}
                    onClick={() => handleTypeChange("undirected")}
                  >
                    <Minus className="w-4 h-4" />
                  </ToggleItem>
                </TooltipTrigger>
                <TooltipContent>Undirected</TooltipContent>
              </Tooltip>
            </ToggleGroup>
          </div>

          {/* Weight stepper */}
          <div className="mb-2.5">
            <StepperInput
              value={weight}
              onChange={handleWeightChange}
              min={0}
              max={999}
              onEnter={onClose}
              inputRef={weightInputRef}
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-1.5">
            {type === "directed" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleReverse}
                    variant="default"
                    size="icon-sm"
                    className="flex-1"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reverse Direction</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onDelete}
                  variant="default"
                  size="icon-sm"
                  className="flex-1 text-[var(--color-error)]"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete Edge</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </PopoverContent>
    </Popover>
  );
};
