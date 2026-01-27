import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"
import { GrainTexture } from "./grain-texture"

const cardButtonVariants = cva(
  "relative flex flex-col items-center gap-1 p-2.5  duration-100 overflow-hidden bg-[var(--color-surface)] shadow-[var(--shadow-raised),var(--highlight-edge)] focus-ring-animated",
  {
    variants: {
      selected: {
        true: "ring-2 ring-[var(--color-accent-form)]",
        false: "hover:ring-2 hover:ring-[var(--color-text-muted)]",
      },
      rounded: {
        sm: "rounded-md",
        md: "rounded-lg",
        lg: "rounded-xl",
      },
    },
    defaultVariants: {
      selected: false,
      rounded: "md",
    },
  }
)

export interface CardButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof cardButtonVariants> {
  showGrain?: boolean
  ref?: React.Ref<HTMLButtonElement>
}

function CardButton({ className, selected, rounded, showGrain = true, children, ref, ...props }: CardButtonProps) {
  return (
    <button
      ref={ref}
      className={cn(cardButtonVariants({ selected, rounded, className }))}
      {...props}
    >
      {showGrain && <GrainTexture baseFrequency={4.2} className="rounded-lg" />}
      <div className="relative z-10 flex flex-col items-center gap-1">
        {children}
      </div>
    </button>
  )
}

export { CardButton, cardButtonVariants }
