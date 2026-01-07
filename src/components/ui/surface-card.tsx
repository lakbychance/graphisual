import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const surfaceCardVariants = cva(
  "relative overflow-hidden",
  {
    variants: {
      elevation: {
        raised: "bg-[var(--color-surface)] shadow-[var(--shadow-raised),var(--highlight-edge)]",
        "raised-lg": "bg-[var(--color-surface)] shadow-[var(--shadow-raised-lg),var(--highlight-edge)]",
        pressed: "bg-[var(--color-paper)] shadow-[var(--shadow-pressed)]",
        etched: "bg-[var(--color-paper)] shadow-[var(--shadow-etched)]",
      },
      rounded: {
        none: "rounded-none",
        sm: "rounded-[var(--radius-sm)]",
        md: "rounded-[var(--radius-md)]",
        lg: "rounded-[var(--radius-lg)]",
        full: "rounded-full",
      },
    },
    defaultVariants: {
      elevation: "raised",
      rounded: "md",
    },
  }
)

export interface SurfaceCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof surfaceCardVariants> {}

const SurfaceCard = React.forwardRef<HTMLDivElement, SurfaceCardProps>(
  ({ className, elevation, rounded, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(surfaceCardVariants({ elevation, rounded, className }))}
        {...props}
      />
    )
  }
)
SurfaceCard.displayName = "SurfaceCard"

export { SurfaceCard, surfaceCardVariants }
