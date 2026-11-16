import {
  NumberInput as UINumberInput,
  NumberInputControl,
  NumberInputDecrement,
  NumberInputGroup,
  NumberInputIncrement,
  NumberInputScrubArea,
  NumberInputScrubAreaCursor,
} from "@ui-sdk/react/number-input";
import { Minus, Plus } from "lucide-react";
import { useRef, type ComponentProps, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { playPressSound } from "./press-sound";

export interface StepperProps extends ComponentProps<typeof UINumberInput> {
  label: string;
  /** Visible label that also acts as a scrub area (drag it to change the value). */
  scrubLabel?: ReactNode;
  controlClassName?: string;
}

/** Held this long (ms), each repeat moves by this many steps: a jog key that picks up speed. */
const HOLD_GEARS: [number, number][] = [[3400, 10], [2200, 5], [1200, 2]];

/**
 * Stepper — ui-sdk NumberInput: typed values clamp and snap on commit, the
 * step buttons repeat while held, arrow keys / Page keys step, and the
 * optional label is a scrub area you can drag.
 *
 * ui-sdk repeats a held step key at a steady pace. Here the longer the key is
 * held the further each repeat moves (2, 5, then 10 steps), and each repeat
 * ticks in the theme's sound kit, a little higher as it speeds up.
 */
export function Stepper({ label, scrubLabel, className, controlClassName, value, onValueChange, ...props }: StepperProps) {
  const hold = useRef<{ since: number; key: HTMLElement } | null>(null);

  const startHold = (event: PointerEvent<HTMLElement>) => {
    hold.current = { since: performance.now(), key: event.currentTarget };
  };
  const endHold = () => {
    hold.current = null;
  };

  const handleValueChange: NonNullable<StepperProps["onValueChange"]> = (next, ...rest) => {
    const held = hold.current;
    if (!held || typeof next !== "number" || typeof value !== "number") {
      onValueChange?.(next, ...rest);
      return;
    }
    const heldFor = performance.now() - held.since;
    const gear = HOLD_GEARS.find(([after]) => heldFor >= after)?.[1] ?? 1;
    const min = typeof props.min === "number" ? props.min : -Infinity;
    const max = typeof props.max === "number" ? props.max : Infinity;
    const geared = Math.max(min, Math.min(max, value + (next - value) * gear));
    // The first step is voiced by the key press itself; every repeat after it ticks.
    if (heldFor > 200) playPressSound(held.key, "tick", 1.05 - 0.07 * gear);
    onValueChange?.(geared as typeof next, ...rest);
  };

  return (
    <UINumberInput className={cn("gs-stepper", className as string)} value={value} onValueChange={handleValueChange} {...props}>
      {scrubLabel && (
        <NumberInputScrubArea className="gs-scrub" aria-label={`${label} (drag to adjust)`}>
          {scrubLabel}
          <NumberInputScrubAreaCursor className="gs-scrub-cursor">
            <svg width="22" height="12" viewBox="0 0 22 12" fill="currentColor" aria-hidden="true">
              <path d="M0 6l6-5v10L0 6zm22 0l-6-5v10l6-5z" />
            </svg>
          </NumberInputScrubAreaCursor>
        </NumberInputScrubArea>
      )}
      <NumberInputGroup className="gs-stepper-group">
        <NumberInputDecrement className="gs-stepper-button" aria-label={`Decrease ${label}`} onPointerDown={startHold} onPointerUp={endHold} onPointerCancel={endHold} onPointerLeave={endHold}>
          <Minus aria-hidden="true" />
        </NumberInputDecrement>
        <NumberInputControl className={cn("gs-stepper-control", controlClassName)} aria-label={label} />
        <NumberInputIncrement className="gs-stepper-button" aria-label={`Increase ${label}`} onPointerDown={startHold} onPointerUp={endHold} onPointerCancel={endHold} onPointerLeave={endHold}>
          <Plus aria-hidden="true" />
        </NumberInputIncrement>
      </NumberInputGroup>
    </UINumberInput>
  );
}
