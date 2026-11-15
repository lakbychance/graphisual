import {
  Tooltip as UITooltip,
  TooltipArrow,
  TooltipContent as UITooltipContent,
  TooltipTrigger,
} from "@ui-sdk/react/tooltip";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TIMING } from "@/constants/ui";

/** Tooltip root with the app-wide hover delay (ui-sdk opens later ones instantly while one is showing). */
export function Tooltip({ delay = TIMING.TOOLTIP_DELAY, ...props }: ComponentProps<typeof UITooltip>) {
  return <UITooltip delay={delay} {...props} />;
}
export { TooltipTrigger };

export interface TooltipContentProps extends Omit<ComponentProps<typeof UITooltipContent>, "children"> {
  arrow?: boolean;
  children?: ReactNode;
}

/** TooltipContent — inverted chip that scales from `--transform-origin`. */
export function TooltipContent({ arrow = true, className, children, sideOffset = 12, ...props }: TooltipContentProps) {
  return (
    <UITooltipContent sideOffset={sideOffset} className={cn("gs-tooltip", className as string)} {...props}>
      {children}
      {arrow && <TooltipArrow className="gs-tooltip-arrow" />}
    </UITooltipContent>
  );
}
