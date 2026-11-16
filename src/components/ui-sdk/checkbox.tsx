import { Checkbox as UICheckbox, CheckboxIndicator } from "@ui-sdk/react/checkbox";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { CheckIcon } from "./check-icon";

/** Checkbox — sunken square; the accent indicator pops in with a scale transition. */
export function Checkbox({ className, ...props }: ComponentProps<typeof UICheckbox>) {
  return (
    <UICheckbox className={cn("gs-checkbox", className as string)} {...props}>
      <CheckboxIndicator className="gs-checkbox-indicator" aria-hidden="true">
        <CheckIcon strokeWidth={2.25} />
      </CheckboxIndicator>
    </UICheckbox>
  );
}
