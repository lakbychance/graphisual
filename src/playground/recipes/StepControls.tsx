import { ChevronLeft, ChevronRight, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { Toolbar, ToolbarButton, ToolbarSeparator, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui-sdk";
import { IconAction } from "./IconAction";

export interface StepControlsProps {
  index: number;
  total: number;
  playing: boolean;
  onJumpStart: () => void;
  onPrev: () => void;
  onNext: () => void;
  onJumpEnd: () => void;
  onTogglePlay: () => void;
  onDone: () => void;
}

/** Step controls: a toolbar of transport keys with a tabular step counter. */
export function StepControls({ index, total, playing, onJumpStart, onPrev, onNext, onJumpEnd, onTogglePlay, onDone }: StepControlsProps) {
  const canBack = index > 0;
  const canFwd = index < total - 1;
  return (
    <Toolbar aria-label="Step controls" className="gap-1 md:gap-2">
      <IconAction label="Jump to start" disabled={!canBack} onClick={onJumpStart}><SkipBack aria-hidden="true" /></IconAction>
      <IconAction label="Previous step" disabled={!canBack} onClick={onPrev}><ChevronLeft aria-hidden="true" /></IconAction>
      <span className="gs-value text-xs md:text-sm px-2 min-w-14 text-center whitespace-nowrap" aria-live="polite">
        {index + 1} / {total}
      </span>
      <IconAction label="Next step" disabled={!canFwd} onClick={onNext}><ChevronRight aria-hidden="true" /></IconAction>
      <IconAction label="Jump to end" disabled={!canFwd} onClick={onJumpEnd}><SkipForward aria-hidden="true" /></IconAction>
      <IconAction label={playing ? "Pause" : "Play"} disabled={!canFwd && !playing} onClick={onTogglePlay}>
        {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
      </IconAction>
      <ToolbarSeparator />
      <Tooltip>
        <TooltipTrigger render={<ToolbarButton size="sm" tone="danger" onClick={onDone} />}>Done</TooltipTrigger>
        <TooltipContent>End visualization</TooltipContent>
      </Tooltip>
    </Toolbar>
  );
}
