import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import {
  SkipBack, ChevronLeft, ChevronRight, SkipForward, Play, Pause,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GrainTexture } from "../ui/grain-texture";

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
    <div
      role="group"
      aria-label="Step controls"
      className="flex justify-around items-center gap-1 md:gap-2 relative p-2 rounded-md bg-[var(--color-surface)] shadow-[var(--shadow-premium)]"
    >
      <GrainTexture baseFrequency={3} className="rounded-md" />

      {/* Jump to start */}
      <Tooltip>
        <TooltipTrigger asChild>
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
        </TooltipTrigger>
        <TooltipContent>Jump to Start</TooltipContent>
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
            aria-label="Previous step"
          >
            <ChevronLeft className={cn("h-4 w-4", canStepBackward ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Previous Step</TooltipContent>
      </Tooltip>

      {/* Step counter */}
      <span className="text-xs md:text-sm px-2 min-w-[60px] whitespace-nowrap text-center text-[var(--color-text)]">
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
            aria-label="Next step"
          >
            <ChevronRight className={cn("h-4 w-4", canStepForward ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Next Step</TooltipContent>
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
            aria-label="Jump to end"
          >
            <SkipForward className={cn("h-4 w-4", canStepForward ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Jump to End</TooltipContent>
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
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 text-[var(--color-text)]" />
            ) : (
              <Play className={cn("h-4 w-4", canStepForward ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{isPlaying ? 'Pause' : 'Play'}</TooltipContent>
      </Tooltip>

      {/* Divider */}
      <div className="w-px h-7 mx-1 bg-[var(--color-divider)]" />

      {/* Stop/Done button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onStop}
            variant="ghost"
            className="h-9 px-3 z-10 !rounded-md text-sm text-[var(--color-error)]"
          >
            Done
          </Button>
        </TooltipTrigger>
        <TooltipContent>End Visualization</TooltipContent>
      </Tooltip>
    </div>
  );
};
