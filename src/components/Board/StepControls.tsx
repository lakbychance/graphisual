import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
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
      <div className="hidden md:block w-px h-7 mx-1 md:mx-2 bg-[var(--color-divider)]" />

      <div className="flex items-center gap-0.5">
        {/* Jump to start */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onJumpToStart}
              disabled={!canStepBackward}
              variant="ghost"
              size="icon-sm"
              className="z-10"
            >
              <SkipBack className={cn("h-4 w-4", canStepBackward ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Jump to Start (Home)</TooltipContent>
        </Tooltip>

        {/* Step backward */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onStepBackward}
              disabled={!canStepBackward}
              variant="ghost"
              size="icon-sm"
              className="z-10"
            >
              <ChevronLeft className={cn("h-4 w-4", canStepBackward ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Previous Step (←)</TooltipContent>
        </Tooltip>

        {/* Step counter */}
        <span className="text-[12px] md:text-[13px] px-2 min-w-[60px] whitespace-nowrap text-center text-[var(--color-text)]">
          {stepIndex + 1} / {totalSteps}
        </span>

        {/* Step forward */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onStepForward}
              disabled={!canStepForward}
              variant="ghost"
              size="icon-sm"
              className="z-10"
            >
              <ChevronRight className={cn("h-4 w-4", canStepForward ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Next Step (→)</TooltipContent>
        </Tooltip>

        {/* Jump to end */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onJumpToEnd}
              disabled={!canStepForward}
              variant="ghost"
              size="icon-sm"
              className="z-10"
            >
              <SkipForward className={cn("h-4 w-4", canStepForward ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Jump to End (End)</TooltipContent>
        </Tooltip>

        {/* Play/Pause */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onTogglePlay}
              disabled={!canStepForward && !isPlaying}
              variant="ghost"
              size="icon-sm"
              className="z-10"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 text-[var(--color-text)]" />
              ) : (
                <Play className={cn("h-4 w-4", canStepForward ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isPlaying ? 'Pause (Space)' : 'Play (Space)'}</TooltipContent>
        </Tooltip>
      </div>

      {/* Stop/Done button */}
      <div className="w-px h-7 mx-1 md:mx-2 bg-[var(--color-divider)]" />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onStop}
            variant="ghost"
            className="h-9 px-3 z-10 !rounded-md text-[13px] text-[var(--color-error)]"
          >
            Done
          </Button>
        </TooltipTrigger>
        <TooltipContent>End Visualization</TooltipContent>
      </Tooltip>
    </>
  );
};
