import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

// === Context ===

interface StepperContextValue {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step: number
  onEnter?: () => void
}

const StepperContext = React.createContext<StepperContextValue | null>(null)

const useStepper = () => {
  const context = React.useContext(StepperContext)
  if (!context) {
    throw new Error("Stepper primitives must be used within <Stepper>")
  }
  return context
}

// === Variants ===

const stepperButtonVariants = cva(
  "w-8 h-8 flex items-center justify-center text-base  duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-form)]/50 text-[var(--color-text-muted)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] active:shadow-[var(--shadow-pressed)] active:bg-[var(--color-paper)] shadow-[var(--shadow-raised),var(--highlight-edge)]",
  {
    variants: {
      rounded: {
        left: "rounded-l-lg rounded-r-none",
        right: "rounded-r-lg rounded-l-none",
        both: "rounded-lg",
        none: "rounded-none",
      },
    },
    defaultVariants: {
      rounded: "both",
    },
  }
)

// === Stepper Root ===

interface StepperProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  onEnter?: () => void
  ref?: React.Ref<HTMLDivElement>
}

function Stepper({ value, onChange, min = 0, max = 999, step = 1, onEnter, className, children, ref, ...props }: StepperProps) {
  return (
    <StepperContext.Provider value={{ value, onChange, min, max, step, onEnter }}>
      <div
        ref={ref}
        className={cn(
          "flex items-center rounded-lg",
          "bg-[var(--color-paper)] shadow-[var(--shadow-etched)]",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </StepperContext.Provider>
  )
}

// === StepperDecrement ===

interface StepperDecrementProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>,
  VariantProps<typeof stepperButtonVariants> {
  children?: React.ReactNode
  ref?: React.Ref<HTMLButtonElement>
}

function StepperDecrement({ className, rounded = "left", children, ref, ...props }: StepperDecrementProps) {
  const { value, onChange, min, step } = useStepper()

  const handleClick = () => {
    const newValue = Math.max(value - step, min)
    onChange(newValue)
  }

  return (
    <button
      ref={ref}
      type="button"
      aria-label="Decrease"
      {...props}
      onClick={handleClick}
      className={cn(stepperButtonVariants({ rounded, className }))}
    >
      {children ?? "−"}
    </button>
  )
}

// === StepperIncrement ===

interface StepperIncrementProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>,
  VariantProps<typeof stepperButtonVariants> {
  children?: React.ReactNode
  ref?: React.Ref<HTMLButtonElement>
}

function StepperIncrement({ className, rounded = "right", children, ref, ...props }: StepperIncrementProps) {
  const { value, onChange, max, step } = useStepper()

  const handleClick = () => {
    const newValue = Math.min(value + step, max)
    onChange(newValue)
  }

  return (
    <button
      ref={ref}
      type="button"
      aria-label="Increase"
      {...props}
      onClick={handleClick}
      className={cn(stepperButtonVariants({ rounded, className }))}
    >
      {children ?? "+"}
    </button>
  )
}

// === StepperField ===

interface StepperFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  ref?: React.Ref<HTMLInputElement>
}

function StepperField({ className, ref, ...props }: StepperFieldProps) {
  const { value, onChange, min, max, onEnter } = useStepper()

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
    <input
      ref={ref}
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={handleInputChange}
      onKeyDown={handleKeyDown}
      autoComplete="off"
      className={cn(
        "flex-1 h-8 text-center text-xs font-medium",
        "focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-[var(--color-accent-form)]/50 bg-transparent text-[var(--color-text)]",
        "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
        className
      )}
      {...props}
    />
  )
}

// === StepperInput (Backward Compatible Shorthand) ===

export interface StepperInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  onEnter?: () => void
  className?: string
  inputRef?: React.RefObject<HTMLInputElement | null>
  ref?: React.Ref<HTMLDivElement>
}

function StepperInput({ value, onChange, min = 0, max = 999, step = 1, onEnter, className, inputRef, ref }: StepperInputProps) {
  return (
    <Stepper
      ref={ref}
      value={value}
      onChange={onChange}
      min={min}
      max={max}
      step={step}
      onEnter={onEnter}
      className={className}
    >
      <StepperDecrement />
      <StepperField ref={inputRef} />
      <StepperIncrement />
    </Stepper>
  )
}

export {
  Stepper,
  StepperDecrement,
  StepperField,
  StepperIncrement,
  StepperInput,
  stepperButtonVariants,
}
