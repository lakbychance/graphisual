import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { ToolbarButton, ToolbarSeparator } from "../ui/toolbar";
import {
  SkipBack, ChevronLeft, ChevronRight, SkipForward, Play, Pause,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StepControlsProps {
  stepIndex: number;
  totalSteps: number;
  isPlaying: boolean;
  canStepBackward: boolean;
  canStepForward: boolean;
  onJumpToStart: () => void;
  onStepBackward: () => void;
  onStepForward: () => void;
  onJumpToEnd: () => void;
  onTogglePlay: () => void;
  onStop: () => void;
}

export const StepControls = ({
  stepIndex,
  totalSteps,
  isPlaying,
  canStepBackward,
  canStepForward,
  onJumpToStart,
  onStepBackward,
  onStepForward,
  onJumpToEnd,
  onTogglePlay,
  onStop,
}: StepControlsProps) => {
  return (
    <>
      {/* Divider - hidden on mobile since algorithm dropdown is also hidden */}
      <ToolbarSeparator className="hidden md:block" />

      {/* Jump to start */}
      <Tooltip>
        <TooltipTrigger asChild>
          <ToolbarButton asChild>
            <Button
              onClick={onJumpToStart}
              disabled={!canStepBackward}
              variant="ghost"
              size="icon-sm"
              className="z-10"
              aria-label="Jump to start"
            >
              <SkipBack className={cn("h-4 w-4", canStepBackward ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
            </Button>
          </ToolbarButton>
        </TooltipTrigger>
        <TooltipContent>Jump to Start (Home)</TooltipContent>
      </Tooltip>

      {/* Step backward */}
      <Tooltip>
        <TooltipTrigger asChild>
          <ToolbarButton asChild>
            <Button
              onClick={onStepBackward}
              disabled={!canStepBackward}
              variant="ghost"
              size="icon-sm"
              className="z-10"
              aria-label="Previous step"
            >
              <ChevronLeft className={cn("h-4 w-4", canStepBackward ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
            </Button>
          </ToolbarButton>
        </TooltipTrigger>
        <TooltipContent>Previous Step (←)</TooltipContent>
      </Tooltip>

      {/* Step counter */}
      <span className="text-xs md:text-sm px-2 min-w-[60px] whitespace-nowrap text-center text-[var(--color-text)]">
        {stepIndex + 1} / {totalSteps}
      </span>

      {/* Step forward */}
      <Tooltip>
        <TooltipTrigger asChild>
          <ToolbarButton asChild>
            <Button
              onClick={onStepForward}
              disabled={!canStepForward}
              variant="ghost"
              size="icon-sm"
              className="z-10"
              aria-label="Next step"
            >
              <ChevronRight className={cn("h-4 w-4", canStepForward ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
            </Button>
          </ToolbarButton>
        </TooltipTrigger>
        <TooltipContent>Next Step (→)</TooltipContent>
      </Tooltip>

      {/* Jump to end */}
      <Tooltip>
        <TooltipTrigger asChild>
          <ToolbarButton asChild>
            <Button
              onClick={onJumpToEnd}
              disabled={!canStepForward}
              variant="ghost"
              size="icon-sm"
              className="z-10"
              aria-label="Jump to end"
            >
              <SkipForward className={cn("h-4 w-4", canStepForward ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
            </Button>
          </ToolbarButton>
        </TooltipTrigger>
        <TooltipContent>Jump to End (End)</TooltipContent>
      </Tooltip>

      {/* Play/Pause */}
      <Tooltip>
        <TooltipTrigger asChild>
          <ToolbarButton asChild>
            <Button
              onClick={onTogglePlay}
              disabled={!canStepForward && !isPlaying}
              variant="ghost"
              size="icon-sm"
              className="z-10"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 text-[var(--color-text)]" />
              ) : (
                <Play className={cn("h-4 w-4", canStepForward ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
              )}
            </Button>
          </ToolbarButton>
        </TooltipTrigger>
        <TooltipContent>{isPlaying ? 'Pause (Space)' : 'Play (Space)'}</TooltipContent>
      </Tooltip>

      {/* Stop/Done button */}
      <ToolbarSeparator />
      <Tooltip>
        <TooltipTrigger asChild>
          <ToolbarButton asChild>
            <Button
              onClick={onStop}
              variant="ghost"
              className="h-9 px-3 z-10 !rounded-md text-sm text-[var(--color-error)]"
            >
              Done
            </Button>
          </ToolbarButton>
        </TooltipTrigger>
        <TooltipContent>End Visualization</TooltipContent>
      </Tooltip>
    </>
  );
};
