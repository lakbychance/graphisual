import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpeedControlProps {
  speedMultiplier: string;
  disabled: boolean;
  canDecrease: boolean;
  canIncrease: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
}

export const SpeedControl = ({
  speedMultiplier,
  disabled,
  canDecrease,
  canIncrease,
  onDecrease,
  onIncrease,
}: SpeedControlProps) => {
  return (
    <>
      {/* Divider */}
      <div className="w-px h-7 mx-1 md:mx-2 bg-[var(--color-divider)]" />

      {/* Speed stepper */}
      <div className="flex items-center gap-2 px-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onDecrease}
              disabled={disabled || !canDecrease}
              variant="ghost"
              size="icon-xs"
              className="z-10"
              aria-label="Decrease speed"
            >
              <Minus className={cn("h-3.5 w-3.5", canDecrease && !disabled ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Slower</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-xs min-w-[32px] text-center cursor-help text-[var(--color-text)]">
              {speedMultiplier}
            </span>
          </TooltipTrigger>
          <TooltipContent>Visualization Speed</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onIncrease}
              disabled={disabled || !canIncrease}
              variant="ghost"
              size="icon-xs"
              className="z-10"
              aria-label="Increase speed"
            >
              <Plus className={cn("h-3.5 w-3.5", canIncrease && !disabled ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Faster</TooltipContent>
        </Tooltip>
      </div>
    </>
  );
};
