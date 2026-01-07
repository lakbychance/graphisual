import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "../../lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "flex items-center gap-1 p-1 rounded-full",
      "bg-[var(--color-paper)]",
      "shadow-[var(--shadow-pressed)]",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex-1 px-3 py-1.5 text-[13px] font-['Outfit'] rounded-full",
      "transition-all duration-150",
      "text-[var(--color-text-muted)]",
      "hover:text-[var(--color-text)]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-form)]/50",
      "disabled:pointer-events-none disabled:opacity-50",
      "data-[state=active]:bg-[var(--color-surface)]",
      "data-[state=active]:text-[var(--color-text)]",
      "data-[state=active]:shadow-[var(--shadow-raised),var(--highlight-edge)]",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, tabIndex, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    tabIndex={tabIndex ?? -1}
    className={cn(
      "focus-visible:outline-none",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
