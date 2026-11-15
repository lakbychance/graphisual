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
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface StepperProps extends ComponentProps<typeof UINumberInput> {
  label: string;
  /** Visible label that also acts as a scrub area (drag it to change the value). */
  scrubLabel?: ReactNode;
  controlClassName?: string;
}

/**
 * Stepper — ui-sdk NumberInput: typed values clamp and snap on commit, the
 * step buttons repeat while held, arrow keys / Page keys step, and the
 * optional label is a scrub area you can drag.
 */
export function Stepper({ label, scrubLabel, className, controlClassName, ...props }: StepperProps) {
  return (
    <UINumberInput className={cn("gs-stepper", className as string)} {...props}>
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
        <NumberInputDecrement className="gs-stepper-button" aria-label={`Decrease ${label}`}>
          <Minus aria-hidden="true" />
        </NumberInputDecrement>
        <NumberInputControl className={cn("gs-stepper-control", controlClassName)} aria-label={label} />
        <NumberInputIncrement className="gs-stepper-button" aria-label={`Increase ${label}`}>
          <Plus aria-hidden="true" />
        </NumberInputIncrement>
      </NumberInputGroup>
    </UINumberInput>
  );
}
