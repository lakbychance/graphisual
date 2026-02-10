import * as React from "react";
import * as ToolbarPrimitive from "@radix-ui/react-toolbar";
import { cn } from "../../lib/utils";

const Toolbar = React.forwardRef<
  React.ElementRef<typeof ToolbarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToolbarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <ToolbarPrimitive.Root
    ref={ref}
    className={cn("flex items-center", className)}
    {...props}
  />
));
Toolbar.displayName = "Toolbar";

const ToolbarButton = React.forwardRef<
  React.ElementRef<typeof ToolbarPrimitive.Button>,
  React.ComponentPropsWithoutRef<typeof ToolbarPrimitive.Button>
>(({ className, ...props }, ref) => (
  <ToolbarPrimitive.Button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-[background-color,box-shadow,transform,opacity] duration-100 focus-ring-animated disabled:pointer-events-none disabled:opacity-40",
      className
    )}
    {...props}
  />
));
ToolbarButton.displayName = "ToolbarButton";

const ToolbarSeparator = React.forwardRef<
  React.ElementRef<typeof ToolbarPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ToolbarPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <ToolbarPrimitive.Separator
    ref={ref}
    className={cn("w-px h-6 mx-1 md:mx-2 bg-[var(--color-divider)]", className)}
    {...props}
  />
));
ToolbarSeparator.displayName = "ToolbarSeparator";

const ToolbarToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToolbarPrimitive.ToggleGroup>,
  React.ComponentPropsWithoutRef<typeof ToolbarPrimitive.ToggleGroup>
>(({ className, ...props }, ref) => (
  <ToolbarPrimitive.ToggleGroup
    ref={ref}
    className={cn(
      "flex p-0.5 h-8 items-center gap-2 bg-[var(--color-paper)] shadow-[var(--shadow-pressed)] rounded-lg",
      className
    )}
    {...props}
  />
));
ToolbarToggleGroup.displayName = "ToolbarToggleGroup";

const ToolbarToggleItem = React.forwardRef<
  React.ElementRef<typeof ToolbarPrimitive.ToggleItem>,
  React.ComponentPropsWithoutRef<typeof ToolbarPrimitive.ToggleItem>
>(({ className, ...props }, ref) => (
  <ToolbarPrimitive.ToggleItem
    ref={ref}
    className={cn(
      "flex-1 h-7 flex items-center justify-center cursor-pointer rounded-md",
      "focus-ring-animated",
      "bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
      "data-[state=on]:bg-[var(--color-surface)] data-[state=on]:text-[var(--color-text)] data-[state=on]:shadow-[var(--shadow-raised),var(--highlight-edge)]",
      "data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed data-[disabled]:pointer-events-none",
      className
    )}
    {...props}
  />
));
ToolbarToggleItem.displayName = "ToolbarToggleItem";

export { Toolbar, ToolbarButton, ToolbarSeparator, ToolbarToggleGroup, ToolbarToggleItem };
