import type { ComponentProps, ReactNode } from "react";
import { ToolbarButton, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui-sdk";

interface IconActionProps extends Omit<ComponentProps<typeof ToolbarButton>, "children"> {
  /** Tooltip text; also the accessible name of the icon-only button. */
  label: string;
  /** Tooltip text when it should differ from the accessible name (e.g. "Pause" vs "Play"). */
  tip?: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}

/**
 * Toolbar icon button with a tooltip. A disabled toolbar button stays focusable
 * (aria-disabled) so the tooltip can still say what it does.
 */
export function IconAction({ label, tip, children, side = "bottom", ...props }: IconActionProps) {
  return (
    <Tooltip>
      <TooltipTrigger render={<ToolbarButton aria-label={label} {...props} />}>{children}</TooltipTrigger>
      <TooltipContent side={side}>{tip ?? label}</TooltipContent>
    </Tooltip>
  );
}
