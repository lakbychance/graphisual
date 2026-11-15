import {
  Popover as UIPopover,
  PopoverClose,
  PopoverContent as UIPopoverContent,
  PopoverDescription,
  PopoverTitle as UIPopoverTitle,
  PopoverTrigger,
} from "@ui-sdk/react/popover";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Popover = UIPopover;
export { PopoverTrigger, PopoverClose, PopoverDescription };

/** PopoverContent — raised panel with the skin's texture; animates via starting/ending styles. */
export function PopoverContent({ className, sideOffset = 10, ...props }: ComponentProps<typeof UIPopoverContent>) {
  return (
    <UIPopoverContent
      sideOffset={sideOffset}
      className={cn("gs-popover gs-panel", className as string)}
      {...props}
    />
  );
}

export function PopoverTitle({ className, ...props }: ComponentProps<typeof UIPopoverTitle>) {
  return <UIPopoverTitle className={cn("gs-popover-title", className as string)} {...props} />;
}
