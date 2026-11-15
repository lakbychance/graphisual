import { ChevronLeft, ChevronRight, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { Toolbar, ToolbarButton, ToolbarSeparator, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui-sdk";
import { IconAction } from "../ui/icon-action";

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

/** Transport keys for step mode, in one toolbar panel. */
export const StepControls = ({
  stepIndex, totalSteps, isPlaying, canStepBackward, canStepForward,
  onJumpToStart, onStepBackward, onStepForward, onJumpToEnd, onTogglePlay, onStop,
}: StepControlsProps) => {
  return (
    <Toolbar aria-label="Step controls" className="justify-around gap-1 md:gap-2">
      <IconAction label="Jump to start" disabled={!canStepBackward} onClick={onJumpToStart}><SkipBack aria-hidden="true" /></IconAction>
      <IconAction label="Previous step" disabled={!canStepBackward} onClick={onStepBackward}><ChevronLeft aria-hidden="true" /></IconAction>
      <span className="gs-value text-xs md:text-sm px-2 min-w-12 whitespace-nowrap text-center" aria-live="polite">
        {stepIndex + 1} / {totalSteps}
      </span>
      <IconAction label="Next step" disabled={!canStepForward} onClick={onStepForward}><ChevronRight aria-hidden="true" /></IconAction>
      <IconAction label="Jump to end" disabled={!canStepForward} onClick={onJumpToEnd}><SkipForward aria-hidden="true" /></IconAction>
      <IconAction label={isPlaying ? "Pause" : "Play"} disabled={!canStepForward && !isPlaying} onClick={onTogglePlay}>
        {isPlaying ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
      </IconAction>
      <ToolbarSeparator />
      <Tooltip>
        <TooltipTrigger render={<ToolbarButton size="sm" tone="danger" onClick={onStop} />}>Done</TooltipTrigger>
        <TooltipContent>End visualization</TooltipContent>
      </Tooltip>
    </Toolbar>
  );
};
