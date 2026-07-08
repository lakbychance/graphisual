import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

// Physical button - raised surface that presses in
const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium focus-ring-animated disabled:pointer-events-none disabled:opacity-40",
    {
        variants: {
            variant: {
                // Default: raised surface button
                default:
                    "bg-(--color-surface) text-(--color-text) shadow-[var(--shadow-raised),var(--highlight-edge)] hover:bg-(--color-surface-hover) active:shadow-(--shadow-pressed) active:bg-(--color-paper)",
                // Primary/accent: colored raised button
                primary:
                    "bg-(--color-accent) text-white font-semibold shadow-[var(--shadow-raised),var(--highlight-edge)] hover:bg-(--color-accent-pressed) active:shadow-(--shadow-pressed)",
                // Destructive: error colored
                destructive:
                    "bg-(--color-error) text-white font-semibold shadow-[var(--shadow-raised),var(--highlight-edge)] hover:brightness-95 active:shadow-(--shadow-pressed)",
                // Secondary: subtle raised
                secondary:
                    "bg-(--color-surface) text-(--color-text-muted) shadow-[var(--shadow-raised),var(--highlight-edge)] hover:bg-(--color-surface-hover) active:shadow-(--shadow-pressed)",
                // Outline: transparent with accent border, tinted fill on hover
                outline:
                    "bg-transparent text-(--color-accent) font-semibold border border-(--color-accent) hover:bg-(--color-accent)/10 active:bg-(--color-accent)/15",
                // Ghost: no elevation until hover
                ghost:
                    "bg-transparent text-(--color-text-muted) hover:bg-(--color-surface) hover:shadow-[var(--shadow-raised),var(--highlight-edge)] active:shadow-(--shadow-pressed)",
                // Link: text only
                link:
                    "bg-transparent text-(--color-accent) underline-offset-4 hover:underline",
                // Skip link: hidden until focused, for accessibility skip navigation
                skipLink:
                    "sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:h-10 focus:px-5 focus:py-2 focus:rounded-lg focus:bg-(--color-surface) focus:text-(--color-text) focus:shadow-[var(--shadow-raised),var(--highlight-edge)]",
            },
            size: {
                default: "h-10 px-5 py-2 rounded-lg",
                sm: "h-8 px-4 text-xs rounded-md",
                lg: "h-12 px-8 text-base rounded-xl",
                icon: "h-10 w-10 rounded-lg",
                "icon-sm": "h-8 w-8 p-1.5 rounded-lg",
                "icon-xs": "h-6 w-6 p-0 rounded-md",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "primary" | "destructive" | "secondary" | "outline" | "ghost" | "link" | "skipLink";
    size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-xs";
    asChild?: boolean;
    ref?: React.Ref<HTMLButtonElement>;
}

function Button({ className, variant = "default", size = "default", asChild = false, ref, ...props }: ButtonProps) {
    const Comp = asChild ? Slot : "button"
    return (
        <Comp
            className={cn(buttonVariants({ variant, size, className }))}
            ref={ref}
            {...props}
        />
    )
}

export { Button, buttonVariants }
