import { Checkbox as UICheckbox, CheckboxIndicator } from "@ui-sdk/react/checkbox";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Checkbox — sunken square; the accent indicator pops in with a scale transition. */
export function Checkbox({ className, ...props }: ComponentProps<typeof UICheckbox>) {
  return (
    <UICheckbox className={cn("gs-checkbox", className as string)} {...props}>
      <CheckboxIndicator className="gs-checkbox-indicator" aria-hidden="true">
        <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 6.5 5 9l4.5-6" />
        </svg>
      </CheckboxIndicator>
    </UICheckbox>
  );
}
