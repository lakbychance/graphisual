import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "../../lib/utils"

interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
    variant?: "default" | "accent"
}

// Physical slider - etched groove with raised puck thumb
const Slider = React.forwardRef<
    React.ElementRef<typeof SliderPrimitive.Root>,
    SliderProps
>(({ className, variant = "default", ...props }, ref) => {
    const isAccent = variant === "accent"

    return (
        <SliderPrimitive.Root
            ref={ref}
            className={cn(
                "relative flex w-full touch-none select-none items-center",
                className
            )}
            {...props}
        >
            {/* Etched groove track */}
            <SliderPrimitive.Track
                className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-[var(--color-paper)] shadow-[var(--shadow-etched)]"
            >
                <SliderPrimitive.Range
                    className="absolute h-full rounded-full bg-[var(--color-slider-range)]"
                />
            </SliderPrimitive.Track>
            {/* Raised puck thumb */}
            <SliderPrimitive.Thumb
                className={cn(
                    "block rounded-full transition-transform duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring-contrast)] disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing",
                    "shadow-[2px_2px_4px_rgba(0,0,0,0.2),1px_1px_2px_rgba(0,0,0,0.12),inset_1px_1px_1px_rgba(255,255,255,0.35)]",
                    isAccent
                        ? "h-[18px] w-[18px] hover:scale-110 active:scale-95 bg-[linear-gradient(135deg,var(--color-accent-form)_0%,color-mix(in_srgb,var(--color-accent-form)_80%,#000)_100%)]"
                        : "h-5 w-5 bg-[var(--color-surface)]"
                )}
            />
        </SliderPrimitive.Root>
    )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
