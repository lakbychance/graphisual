import {
  Toggle as UIToggle,
  ToggleGroup as UIToggleGroup,
  ToggleIcon as UIToggleIcon,
} from "@ui-sdk/react/toggle";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export interface ToggleGroupProps extends ComponentProps<typeof UIToggleGroup> {
  /** `well` sinks the group into the surface (the graphisual default); `flat` is borderless. */
  surface?: "well" | "flat";
  size?: "sm" | "md";
}

/**
 * ToggleGroup — a sunken well holding raised toggles. Inside a Toolbar it
 * joins the toolbar's arrow-key navigation instead of adding a tab stop.
 */
export function ToggleGroup({ surface = "well", size = "sm", className, ...props }: ToggleGroupProps) {
  return (
    <UIToggleGroup
      data-surface={surface}
      data-size={size}
      className={cn("gs-toggle-group", className as string)}
      {...props}
    />
  );
}

export function Toggle({ className, ...props }: ComponentProps<typeof UIToggle>) {
  return <UIToggle className={cn("gs-toggle", className as string)} {...props} />;
}

export function ToggleIcon({ className, ...props }: ComponentProps<typeof UIToggleIcon>) {
  return <UIToggleIcon className={cn("gs-toggle-icon", className as string)} {...props} />;
}
