import {
  SegmentedControl as UISegmentedControl,
  SegmentedControlIndicator as UISegmentedControlIndicator,
  SegmentedControlItem as UISegmentedControlItem,
} from "@ui-sdk/react/segmented-control";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedControlProps extends Omit<ComponentProps<typeof UISegmentedControl>, "children"> {
  size?: "sm" | "md";
  children?: ReactNode;
}

/**
 * SegmentedControl — radio semantics with a sliding raised indicator.
 * The indicator part measures the checked item and exposes
 * `--segmented-control-indicator-*` variables; `ui-sdk.css` turns those into
 * the moving "key cap".
 */
export function SegmentedControl({ size = "sm", className, children, ...props }: SegmentedControlProps) {
  return (
    <UISegmentedControl
      data-size={size}
      className={cn("gs-segmented", className as string)}
      {...props}
    >
      <UISegmentedControlIndicator className="gs-segmented-indicator" />
      {children}
    </UISegmentedControl>
  );
}

export function SegmentedControlItem({ className, ...props }: ComponentProps<typeof UISegmentedControlItem>) {
  return <UISegmentedControlItem className={cn("gs-segmented-item", className as string)} {...props} />;
}
