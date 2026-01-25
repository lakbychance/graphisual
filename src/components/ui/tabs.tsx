import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "../../lib/utils"

const Tabs = TabsPrimitive.Root

interface TabsListProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  ref?: React.Ref<React.ElementRef<typeof TabsPrimitive.List>>
}

function TabsList({ className, ref, ...props }: TabsListProps) {
  return (
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
  )
}

interface TabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  ref?: React.Ref<React.ElementRef<typeof TabsPrimitive.Trigger>>
}

function TabsTrigger({ className, ref, ...props }: TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex-1 px-3 py-1.5 text-[13px] rounded-full",
        " duration-150",
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
  )
}

interface TabsContentProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content> {
  ref?: React.Ref<React.ElementRef<typeof TabsPrimitive.Content>>
}

function TabsContent({ className, tabIndex, ref, ...props }: TabsContentProps) {
  return (
    <TabsPrimitive.Content
      ref={ref}
      tabIndex={tabIndex ?? -1}
      className={cn(
        "focus-visible:outline-none",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
