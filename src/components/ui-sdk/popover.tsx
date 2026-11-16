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

import { POPUP_CLEARANCE } from "./popup-clearance";

export const Popover = UIPopover;
export { PopoverTrigger, PopoverClose, PopoverDescription };

/**
 * A popover that opens upward (the toolbar is at the bottom on phones) stands
 * on its bottom edge. ui-sdk places it by its top and re-measures a frame or
 * two after its content changes height, so for those frames it would grow
 * downward over its trigger and then jump back up. This moves the top in the
 * same frame the height changes, before anything is painted; ui-sdk then
 * arrives at the same position.
 */
function standOnBottomEdge(el: HTMLElement | null) {
  if (!el || typeof ResizeObserver === "undefined") return;
  let lastHeight = 0;
  let lastBottom = NaN;
  const observer = new ResizeObserver(() => {
    let top = parseFloat(el.style.top);
    const height = el.offsetHeight;
    // Still where it was before its height changed (ui-sdk has not re-placed it yet): keep the bottom edge put.
    const notYetMoved = lastHeight > 0 && height !== lastHeight && Math.abs(top + lastHeight - lastBottom) < 2;
    if (notYetMoved && el.getAttribute("data-side") === "top") {
      top = lastBottom - height;
      el.style.top = `${top}px`;
    }
    lastHeight = height;
    lastBottom = top + height;
  });
  observer.observe(el);
  return () => observer.disconnect();
}

/** PopoverContent — raised panel with the skin's texture; animates via starting/ending styles. */
export function PopoverContent({ className, sideOffset = 10, ...props }: ComponentProps<typeof UIPopoverContent>) {
  // A popover anchored to a point (edge / node popups) has no toolbar plate to clear.
  const clearance = props.anchor ? 0 : POPUP_CLEARANCE;
  return (
    <UIPopoverContent
      ref={standOnBottomEdge}
      sideOffset={Number(sideOffset) + clearance}
      className={cn("gs-popover gs-panel", className as string)}
      {...props}
    />
  );
}

export function PopoverTitle({ className, ...props }: ComponentProps<typeof UIPopoverTitle>) {
  return <UIPopoverTitle className={cn("gs-popover-title", className as string)} {...props} />;
}
