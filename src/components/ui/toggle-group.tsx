import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const toggleGroupVariants = cva(
  "flex p-0.5 gap-1",
  {
    variants: {
      variant: {
        pressed: "bg-[var(--color-paper)] shadow-[var(--shadow-pressed)] rounded-[var(--radius-md)]",
        etched: "bg-[var(--color-paper)] shadow-[var(--shadow-etched)] rounded-[var(--radius-md)]",
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
        sm: "rounded-[var(--radius-sm)]",
        md: "rounded-[var(--radius-md)]",
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

export { ToggleGroup, ToggleItem, toggleGroupVariants, toggleItemVariants }
