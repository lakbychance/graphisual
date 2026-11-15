import { Button as UIButton } from "@ui-sdk/react/button";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "default"
  | "primary"
  | "secondary"
  | "destructive"
  | "outline"
  | "ghost"
  | "link"
  | "skipLink";

export type ButtonSize = "md" | "sm" | "lg" | "icon" | "icon-sm" | "icon-xs";

/** Tints the icon/label (used for destructive ghost actions like Reset). */
export type ButtonTone = "default" | "danger" | "muted";

export interface ButtonLook {
  variant?: ButtonVariant;
  size?: ButtonSize;
  tone?: ButtonTone;
}

/** The attributes `ui-sdk.css` styles a `.gs-button` by; shared with ToolbarButton. */
export function buttonLook({ variant, size, tone }: ButtonLook, className?: unknown) {
  return {
    "data-variant": variant,
    "data-size": size,
    "data-tone": tone,
    className: cn("gs-button", className as string),
  };
}

export interface ButtonProps extends ComponentProps<typeof UIButton>, ButtonLook {}

/**
 * Button — ui-sdk `Button` with graphisual's physical-surface variants.
 *
 * ui-sdk gives us press handling, `data-pending` while an async `onClick`
 * runs, `data-disabled`, and `focusableWhenDisabled` so disabled actions can
 * still host a tooltip. Everything visual comes from `ui-sdk.css` and the
 * active skin's tokens.
 */
export function Button({
  variant = "default",
  size = "md",
  tone,
  className,
  ...props
}: ButtonProps) {
  return <UIButton {...buttonLook({ variant, size, tone }, className)} {...props} />;
}
