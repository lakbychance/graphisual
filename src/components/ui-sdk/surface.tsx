import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Panel — raised surface with the skin's texture overlay (grain, scanlines, hatch…). */
export function Panel({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("gs-panel", className)} {...props} />;
}

/** Well — sunken region (where toggles, tabs and inputs sit). */
export function Well({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("gs-well", className)} {...props} />;
}

/** Kbd — key cap used in shortcut lists and menu shortcuts. */
export function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return <kbd className={cn("gs-kbd", className)} {...props} />;
}

/** Label — small muted caption; skins decide its case, tracking and face. */
export function Label({ className, ...props }: ComponentProps<"span">) {
  return <span className={cn("gs-label", className)} {...props} />;
}

/** Divider — hairline between control groups. */
export function Divider({ className, orientation = "vertical", ...props }: ComponentProps<"span"> & { orientation?: "vertical" | "horizontal" }) {
  return <span role="separator" aria-orientation={orientation} data-orientation={orientation} className={cn("gs-divider", className)} {...props} />;
}

export interface CardButtonProps extends ComponentProps<"button"> {
  selected?: boolean;
  icon?: ReactNode;
  title: string;
  subtitle?: string;
}

/** CardButton — selectable tile (algorithm / template cards). */
export function CardButton({ selected, icon, title, subtitle, className, ...props }: CardButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      data-selected={selected || undefined}
      className={cn("gs-card-button gs-panel", className)}
      {...props}
    >
      {icon && <span className="gs-card-icon" aria-hidden="true">{icon}</span>}
      <span className="gs-card-title">{title}</span>
      {subtitle && <span className="gs-card-subtitle">{subtitle}</span>}
    </button>
  );
}
