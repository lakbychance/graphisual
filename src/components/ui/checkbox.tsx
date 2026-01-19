import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"
import { cn } from "../../lib/utils"

interface CheckboxProps extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  ref?: React.Ref<React.ElementRef<typeof CheckboxPrimitive.Root>>
}

function Checkbox({ className, ref, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        "peer h-[18px] w-[18px] shrink-0 rounded-md cursor-pointer",
        " duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring-contrast)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "bg-[var(--color-paper)] shadow-[var(--shadow-etched)]",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className={cn(
          "flex items-center justify-center h-full w-full rounded-md",
          "bg-[var(--color-accent-form)] shadow-[2px_2px_4px_rgba(0,0,0,0.2),1px_1px_2px_rgba(0,0,0,0.12),inset_1px_1px_1px_rgba(255,255,255,0.35)]"
        )}
      >
        <Check className="h-3 w-3 text-white" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
