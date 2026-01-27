import * as React from "react"
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

// === Variants ===

const toggleGroupVariants = cva(
  "flex p-0.5 gap-2",
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
  "flex-1 py-1.5 flex items-center justify-center  duration-100 cursor-pointer focus-ring-animated",
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
  VariantProps<typeof toggleGroupVariants> {
  ref?: React.Ref<HTMLDivElement>
}

function ToggleGroup({ className, variant, ref, ...props }: ToggleGroupProps) {
  return (
    <div
      ref={ref}
      className={cn(toggleGroupVariants({ variant, className }))}
      {...props}
    />
  )
}

export interface ToggleItemProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'>,
  VariantProps<typeof toggleItemVariants> {
  ref?: React.Ref<HTMLButtonElement>
}

function ToggleItem({ className, active, disabled, rounded, ref, ...props }: ToggleItemProps) {
  return (
    <button
      ref={ref}
      disabled={disabled === true}
      className={cn(toggleItemVariants({ active, disabled, rounded, className }))}
      {...props}
    />
  )
}

// === Radix Toggle Group (for proper single/multiple selection) ===

type RadixToggleGroupProps =
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> &
  VariantProps<typeof toggleGroupVariants> & {
    ref?: React.Ref<React.ElementRef<typeof ToggleGroupPrimitive.Root>>
  }

function RadixToggleGroup({ className, variant, children, ref, ...props }: RadixToggleGroupProps) {
  return (
    <ToggleGroupPrimitive.Root
      ref={ref}
      className={cn(toggleGroupVariants({ variant, className }))}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Root>
  )
}

interface RadixToggleGroupItemProps extends React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> {
  rounded?: "sm" | "md" | "full"
  ref?: React.Ref<React.ElementRef<typeof ToggleGroupPrimitive.Item>>
}

function RadixToggleGroupItem({ className, rounded = "sm", children, ref, ...props }: RadixToggleGroupItemProps) {
  const roundedClass = rounded === "full" ? "rounded-full" : rounded === "md" ? "rounded-lg" : "rounded-md"

  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      {...props}
      className={cn(
        "flex-1 py-1.5 flex items-center justify-center cursor-pointer",
        "focus-ring-animated",
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
}

export {
  ToggleGroup,
  ToggleItem,
  RadixToggleGroup,
  RadixToggleGroupItem,
  toggleGroupVariants,
  toggleItemVariants,
}
