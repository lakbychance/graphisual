import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "../../lib/utils"

interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
    variant?: "default" | "accent"
    ref?: React.Ref<React.ElementRef<typeof SliderPrimitive.Root>>
}

// Physical slider - etched groove with raised puck thumb
function Slider({ className, variant = "default", ref, ...props }: SliderProps) {
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
            {/* Raised grip thumb - vintage rectangular slider with grip lines */}
            <SliderPrimitive.Thumb
                className={cn(
                    "relative flex items-center justify-center gap-1 rounded-md transition-transform duration-100 focus-ring-animated disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing shadow-control",
                    isAccent
                        ? "h-4 w-6 hover:scale-110 active:scale-95 bg-accent-control"
                        : "h-4 w-6 bg-[var(--color-surface)]"
                )}
            >
                {/* Grip lines */}
                <span className="flex items-center justify-center gap-1">
                    <span className="w-[1.5px] h-[10px] rounded-full bg-white/70" />
                    <span className="w-[1.5px] h-[10px] rounded-full bg-white/70" />
                    <span className="w-[1.5px] h-[10px] rounded-full bg-white/70" />
                </span>
            </SliderPrimitive.Thumb>
        </SliderPrimitive.Root>
    )
}

export { Slider }
