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

export interface ButtonProps extends ComponentProps<typeof UIButton> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Tints the icon/label (used for destructive ghost actions like Reset). */
  tone?: "default" | "danger" | "muted";
}

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
  return (
    <UIButton
      data-variant={variant}
      data-size={size}
      data-tone={tone}
      className={cn("gs-button", className as string)}
      {...props}
    />
  );
}
