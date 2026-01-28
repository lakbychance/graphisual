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
        " duration-150 focus-ring-animated",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "bg-[var(--color-paper)] shadow-[var(--shadow-etched)]",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className={cn(
          "flex items-center justify-center h-full w-full rounded-md shadow-control",
          "bg-[var(--color-accent-form)]"
        )}
      >
        <Check className="h-3 w-3 text-white" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
