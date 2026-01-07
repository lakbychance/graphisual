import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"
import { cn } from "../../lib/utils"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-[18px] w-[18px] shrink-0 rounded-[var(--radius-sm)] cursor-pointer",
      "transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring-contrast)]",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "bg-[var(--color-paper)] shadow-[var(--shadow-etched)]",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn(
        "flex items-center justify-center h-full w-full rounded-[var(--radius-sm)]",
        "bg-[var(--color-accent-form)] shadow-[2px_2px_4px_rgba(0,0,0,0.2),1px_1px_2px_rgba(0,0,0,0.12),inset_1px_1px_1px_rgba(255,255,255,0.35)]"
      )}
    >
      <Check className="h-3 w-3 text-white" strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
