/**
 * Pieces the lab's variants share: the step in words, the pseudocode with its lit line, the
 * scrubber with its markers and the transport keys. The pseudocode list and the scrubber are the
 * app's notebook parts (`Board/Notebook.tsx`).
 */
import type { ComponentProps, ReactNode } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui-sdk";
import { CodeList, Scrubber as PlainScrubber } from "@/components/Board/Notebook";
import { cn } from "@/lib/utils";
import type { Marker } from "./model";

export { CodeList };

/* ---------------------------------------------------------------- words */

export function Narration({ text, className }: { text: string; className?: string }) {
  return <p className={cn("lab-narration", className)} aria-live="polite">{text}</p>;
}

/** Only the lit line, with its number. */
export function CodeLine({ lines, lit }: { lines: string[]; lit: number | null }) {
  if (lit === null) return null;
  return (
    <div className="lab-code-line">
      <span className="lab-code-no">{lit + 1}</span>
      <code>{lines[lit].trim()}</code>
    </div>
  );
}

/* ------------------------------------------------------------- timeline */

/** The app's scrubber over the run's steps, with its key moments marked above the track. */
export function Scrubber({ index, total, markers, onScrub, className }: {
  index: number; total: number; markers: Marker[]; onScrub: (index: number) => void; className?: string;
}) {
  return (
    <PlainScrubber
      index={index}
      total={total}
      onScrub={onScrub}
      className={cn("lab-scrub", className)}
      moments={markers}
    />
  );
}

/* ------------------------------------------------------------ transport */

export interface TransportProps {
  index: number;
  total: number;
  playing: boolean;
  onStart: () => void;
  onPrev: () => void;
  onNext: () => void;
  onEnd: () => void;
  onPlay: () => void;
}

function Key({ label, children, ...props }: { label: string; children: ReactNode } & ComponentProps<typeof Button>) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost" size="icon-sm" focusableWhenDisabled aria-label={label} {...props} />}>
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** Step keys and the counter. `compact` drops the jump keys. */
export function Transport({ index, total, playing, onStart, onPrev, onNext, onEnd, onPlay, compact = false }: TransportProps & { compact?: boolean }) {
  const canBack = index > 0;
  const canForward = index < total - 1;
  return (
    <div role="group" aria-label="Step controls" className="lab-transport">
      {!compact && <Key label="Jump to start" disabled={!canBack} onClick={onStart}><SkipBack aria-hidden="true" /></Key>}
      <Key label="Previous step" disabled={!canBack} onClick={onPrev}><ChevronLeft aria-hidden="true" /></Key>
      <span className="gs-value lab-counter">{index + 1} / {total}</span>
      <Key label="Next step" disabled={!canForward} onClick={onNext}><ChevronRight aria-hidden="true" /></Key>
      {!compact && <Key label="Jump to end" disabled={!canForward} onClick={onEnd}><SkipForward aria-hidden="true" /></Key>}
      <Key label={playing ? "Pause" : "Play"} disabled={!canForward && !playing} onClick={onPlay}>
        {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
      </Key>
    </div>
  );
}
