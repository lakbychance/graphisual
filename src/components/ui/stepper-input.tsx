import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

export interface StepperInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  onEnter?: () => void
  className?: string
  inputRef?: React.RefObject<HTMLInputElement | null>
}

const stepperButtonVariants = cva(
  "w-8 h-8 flex items-center justify-center text-base transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-form)]/50 text-[var(--color-text-muted)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] shadow-[var(--shadow-raised),var(--highlight-edge)]",
  {
    variants: {
      rounded: {
        left: "rounded-l-[var(--radius-md)] rounded-r-none",
        right: "rounded-r-[var(--radius-md)] rounded-l-none",
        both: "rounded-[var(--radius-md)]",
        none: "rounded-none",
      },
    },
    defaultVariants: {
      rounded: "both",
    },
  }
)

interface StepperButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof stepperButtonVariants> { }

const StepperButton = React.forwardRef<HTMLButtonElement, StepperButtonProps>(
  ({ className, rounded, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(stepperButtonVariants({ rounded, className }))}
        {...props}
      />
    )
  }
)
StepperButton.displayName = "StepperButton"

const StepperInput = React.forwardRef<HTMLDivElement, StepperInputProps>(
  ({ value, onChange, min = 0, max = 999, step = 1, onEnter, className, inputRef }, ref) => {
    const handleIncrement = () => {
      const newValue = Math.min(value + step, max)
      onChange(newValue)
    }

    const handleDecrement = () => {
      const newValue = Math.max(value - step, min)
      onChange(newValue)
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseInt(e.target.value) || 0
      onChange(Math.max(min, Math.min(newValue, max)))
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && onEnter) {
        onEnter()
      }
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center rounded-md",
          "bg-[var(--color-paper)] shadow-[var(--shadow-etched)]",
          className
        )}
      >
        <StepperButton onClick={handleDecrement} aria-label="Decrease" rounded="left">
          −
        </StepperButton>
        <input
          ref={inputRef}
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex-1 h-8 text-center font-['JetBrains_Mono'] text-xs font-medium",
            "focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-[var(--color-accent-form)]/50 bg-transparent text-[var(--color-text)]",
            "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          )}
        />
        <StepperButton onClick={handleIncrement} aria-label="Increase" rounded="right">
          +
        </StepperButton>
      </div>
    )
  }
)
StepperInput.displayName = "StepperInput"

export { StepperInput, StepperButton }
