import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { FocusScope } from "@radix-ui/react-focus-scope";
import { IEdge } from "./IGraph";
import { MoveRight, Minus, ArrowLeftRight, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "../ui/tooltip";
import { GrainTexture } from "../ui/grain-texture";
import { ToggleGroup, ToggleItem } from "../ui/toggle-group";
import { StepperInput } from "../ui/stepper-input";
import { Button } from "../ui/button";

interface EdgePopupProps {
  edge: IEdge;
  onClose: () => void;
  onUpdateType: (type: "directed" | "undirected") => void;
  onUpdateWeight: (weight: number) => void;
  onReverse: () => void;
  onDelete: () => void;
}

export const EdgePopup = ({
  edge,
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
  const popupRef = useRef<HTMLDivElement>(null);
  const weightInputRef = useRef<HTMLInputElement>(null);

  // Calculate popup position at edge midpoint
  const midX = (edge.x1 + edge.x2) / 2;
  const midY = (edge.y1 + edge.y2) / 2;

  // Focus weight input on mount
  useEffect(() => {
    weightInputRef.current?.focus();
  }, []);

  // Close popup when clicking outside
  useEffect(() => {
    let closingPopup = false;

    const handleMouseDown = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        closingPopup = true;
        onClose();
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (closingPopup) {
        e.stopPropagation();
        closingPopup = false;
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleMouseDown, true);
    document.addEventListener("click", handleClick, true);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown, true);
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

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
    <foreignObject
      x={midX - 100}
      y={midY - 70}
      width={200}
      height={140}
      className="overflow-visible"
    >
      <FocusScope trapped loop>
        <TooltipProvider delayDuration={200}>
          <motion.div
            ref={popupRef}
            className="w-[200px] p-3 rounded-[var(--radius-lg)] font-['Outfit'] bg-[var(--color-surface)] shadow-[var(--shadow-raised-lg),var(--highlight-edge)]"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 30,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <GrainTexture className="rounded-[var(--radius-lg)]" />

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
          </motion.div>
        </TooltipProvider>
      </FocusScope>
    </foreignObject>
  );
};
