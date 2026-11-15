import {
  Toolbar as UIToolbar,
  ToolbarButton as UIToolbarButton,
  ToolbarGroup as UIToolbarGroup,
  ToolbarSeparator as UIToolbarSeparator,
} from "@ui-sdk/react/toolbar";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { buttonLook, type ButtonLook } from "./button";

export interface ToolbarProps extends ComponentProps<typeof UIToolbar> {
  /** `panel` draws the raised surface + texture; `bare` is just the focus group. */
  surface?: "panel" | "bare";
}

/** Toolbar — one tab stop, arrow keys move between items. */
export function Toolbar({ surface = "panel", className, ...props }: ToolbarProps) {
  return (
    <UIToolbar
      data-surface={surface}
      className={cn("gs-toolbar", surface === "panel" && "gs-panel", className as string)}
      {...props}
    />
  );
}

export type ToolbarButtonProps = ComponentProps<typeof UIToolbarButton> & ButtonLook;

/**
 * ToolbarButton — joins the toolbar's roving focus. Pass `render` to make it a
 * Menu/Select/Popover trigger at the same time (ui-sdk merges the props).
 */
export function ToolbarButton({
  variant = "ghost",
  size = "icon-sm",
  tone,
  className,
  ...props
}: ToolbarButtonProps) {
  return <UIToolbarButton {...buttonLook({ variant, size, tone }, className)} {...props} />;
}

export function ToolbarGroup({ className, ...props }: ComponentProps<typeof UIToolbarGroup>) {
  return <UIToolbarGroup className={cn("gs-toolbar-group", className as string)} {...props} />;
}

export function ToolbarSeparator({ className, ...props }: ComponentProps<typeof UIToolbarSeparator>) {
  return <UIToolbarSeparator className={cn("gs-toolbar-separator", className as string)} {...props} />;
}
