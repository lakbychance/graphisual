import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"
import { GrainTexture } from "./grain-texture"

const cardButtonVariants = cva(
  "relative flex flex-col items-center gap-1 p-2.5 transition-all duration-100 overflow-hidden bg-[var(--color-surface)] shadow-[var(--shadow-raised),var(--highlight-edge)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-form)]/50",
  {
    variants: {
      selected: {
        true: "ring-2 ring-[var(--color-accent-form)]",
        false: "hover:ring-2 hover:ring-[var(--color-text-muted)]",
      },
      rounded: {
        sm: "rounded-[var(--radius-sm)]",
        md: "rounded-[var(--radius-md)]",
        lg: "rounded-[var(--radius-lg)]",
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
}

const CardButton = React.forwardRef<HTMLButtonElement, CardButtonProps>(
  ({ className, selected, rounded, showGrain = true, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(cardButtonVariants({ selected, rounded, className }))}
        {...props}
      >
        {showGrain && <GrainTexture baseFrequency={4.2} opacity={40} className="rounded-[var(--radius-md)]" />}
        <div className="relative z-10 flex flex-col items-center gap-1">
          {children}
        </div>
      </button>
    )
  }
)
CardButton.displayName = "CardButton"

export { CardButton, cardButtonVariants }
