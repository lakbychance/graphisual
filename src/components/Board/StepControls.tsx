import type { ComponentProps, ReactNode } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui-sdk";

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

/** Icon key with a tooltip. Stays focusable while disabled so focus is not lost at either end of the run. */
function StepKey({ label, children, ...props }: { label: string; children: ReactNode } & ComponentProps<typeof Button>) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost" size="icon-sm" focusableWhenDisabled aria-label={label} {...props} />}>
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Transport keys for step mode, in one toolbar-styled panel.
 *
 * Deliberately a plain group, not a roving-focus Toolbar: in step mode the
 * arrow keys, Home and End are the global transport shortcuts
 * (useGraphActions), so they must not also move focus between these keys.
 */
export const StepControls = ({
  stepIndex, totalSteps, isPlaying, canStepBackward, canStepForward,
  onJumpToStart, onStepBackward, onStepForward, onJumpToEnd, onTogglePlay, onStop,
}: StepControlsProps) => {
  return (
    <div role="group" aria-label="Step controls" data-surface="panel" className="gs-toolbar gs-panel justify-around gap-1 md:gap-2">
      <StepKey label="Jump to start" disabled={!canStepBackward} onClick={onJumpToStart}><SkipBack aria-hidden="true" /></StepKey>
      <StepKey label="Previous step" disabled={!canStepBackward} onClick={onStepBackward}><ChevronLeft aria-hidden="true" /></StepKey>
      <span className="gs-value text-xs md:text-sm px-2 min-w-12 whitespace-nowrap text-center" aria-live="polite">
        {stepIndex + 1} / {totalSteps}
      </span>
      <StepKey label="Next step" disabled={!canStepForward} onClick={onStepForward}><ChevronRight aria-hidden="true" /></StepKey>
      <StepKey label="Jump to end" disabled={!canStepForward} onClick={onJumpToEnd}><SkipForward aria-hidden="true" /></StepKey>
      <StepKey label={isPlaying ? "Pause" : "Play"} disabled={!canStepForward && !isPlaying} onClick={onTogglePlay}>
        {isPlaying ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
      </StepKey>
      <span role="separator" aria-orientation="vertical" className="gs-toolbar-separator" />
      <Tooltip>
        <TooltipTrigger render={<Button variant="ghost" size="sm" tone="danger" onClick={onStop} />}>Done</TooltipTrigger>
        <TooltipContent>End visualization</TooltipContent>
      </Tooltip>
    </div>
  );
};
