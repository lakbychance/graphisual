import * as React from "react"
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

// === Variants ===

const toggleGroupVariants = cva(
  "flex p-0.5 gap-1",
  {
    variants: {
      variant: {
        pressed: "bg-[var(--color-paper)] shadow-[var(--shadow-pressed)] rounded-lg",
        etched: "bg-[var(--color-paper)] shadow-[var(--shadow-etched)] rounded-lg",
      },
    },
    defaultVariants: {
      variant: "pressed",
    },
  }
)

const toggleItemVariants = cva(
  "flex-1 py-1.5 flex items-center justify-center transition-all duration-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-form)]/50",
  {
    variants: {
      active: {
        true: "bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--shadow-raised),var(--highlight-edge)]",
        false: "bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
      },
      disabled: {
        true: "opacity-50 cursor-not-allowed",
        false: "",
      },
      rounded: {
        sm: "rounded-md",
        md: "rounded-lg",
        full: "rounded-full",
      },
    },
    defaultVariants: {
      active: false,
      disabled: false,
      rounded: "sm",
    },
  }
)

// === Custom Toggle Group (for manual active state control) ===

export interface ToggleGroupProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toggleGroupVariants> {}

const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(toggleGroupVariants({ variant, className }))}
        {...props}
      />
    )
  }
)
ToggleGroup.displayName = "ToggleGroup"

export interface ToggleItemProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'>,
    VariantProps<typeof toggleItemVariants> {}

const ToggleItem = React.forwardRef<HTMLButtonElement, ToggleItemProps>(
  ({ className, active, disabled, rounded, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled === true}
        className={cn(toggleItemVariants({ active, disabled, rounded, className }))}
        {...props}
      />
    )
  }
)
ToggleItem.displayName = "ToggleItem"

// === Radix Toggle Group (for proper single/multiple selection) ===

const RadixToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> &
    VariantProps<typeof toggleGroupVariants>
>(({ className, variant, children, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn(toggleGroupVariants({ variant, className }))}
    {...props}
  >
    {children}
  </ToggleGroupPrimitive.Root>
))
RadixToggleGroup.displayName = "RadixToggleGroup"

const RadixToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> & {
    rounded?: "sm" | "md" | "full"
  }
>(({ className, rounded = "sm", children, ...props }, ref) => {
  const roundedClass = rounded === "full" ? "rounded-full" : rounded === "md" ? "rounded-lg" : "rounded-md"

  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      {...props}
      className={cn(
        "flex-1 py-1.5 flex items-center justify-center transition-all duration-100 cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-form)]/50",
        "bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
        "data-[state=on]:bg-[var(--color-surface)] data-[state=on]:text-[var(--color-text)] data-[state=on]:shadow-[var(--shadow-raised),var(--highlight-edge)]",
        "data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed data-[disabled]:pointer-events-none",
        roundedClass,
        className
      )}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  )
})
RadixToggleGroupItem.displayName = "RadixToggleGroupItem"

export {
  ToggleGroup,
  ToggleItem,
  RadixToggleGroup,
  RadixToggleGroupItem,
  toggleGroupVariants,
  toggleItemVariants,
}
