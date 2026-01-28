import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { cn } from "../../lib/utils"

const DropdownMenu = DropdownMenuPrimitive.Root

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

const DropdownMenuGroup = DropdownMenuPrimitive.Group

const DropdownMenuPortal = DropdownMenuPrimitive.Portal

const DropdownMenuSub = DropdownMenuPrimitive.Sub

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

interface DropdownMenuSubTriggerProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> {
    inset?: boolean
    ref?: React.Ref<React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>>
}

function DropdownMenuSubTrigger({ className, inset, children, ref, ...props }: DropdownMenuSubTriggerProps) {
    return (
        <DropdownMenuPrimitive.SubTrigger
            ref={ref}
            className={cn(
                "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-[var(--color-surface-hover)] data-[state=open]:bg-[var(--color-surface-hover)] text-[var(--color-text)]",
                inset && "pl-8",
                className
            )}
            {...props}
        >
            {children}
        </DropdownMenuPrimitive.SubTrigger>
    )
}

interface DropdownMenuSubContentProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent> {
    ref?: React.Ref<React.ElementRef<typeof DropdownMenuPrimitive.SubContent>>
}

function DropdownMenuSubContent({ className, ref, ...props }: DropdownMenuSubContentProps) {
    return (
        <DropdownMenuPrimitive.SubContent
            ref={ref}
            className={cn(
                "z-50 min-w-[8rem] overflow-hidden rounded-lg border-0 bg-[var(--color-surface)] p-1 text-[var(--color-text)] shadow-[var(--shadow-premium)]",
                "data-[state=open]:animate-in data-[state=closed]:animate-out",
                "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
                className
            )}
            {...props}
        />
    )
}

interface DropdownMenuContentProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content> {
    ref?: React.Ref<React.ElementRef<typeof DropdownMenuPrimitive.Content>>
}

function DropdownMenuContent({ className, sideOffset = 4, ref, ...props }: DropdownMenuContentProps) {
    return (
        <DropdownMenuPrimitive.Portal>
            <DropdownMenuPrimitive.Content
                ref={ref}
                sideOffset={sideOffset}
                className={cn(
                    "z-50 min-w-[8rem] overflow-hidden rounded-lg border-0 bg-[var(--color-surface)] p-1 text-[var(--color-text)] shadow-[var(--shadow-premium)]",
                    "data-[state=open]:animate-in data-[state=closed]:animate-out",
                    "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                    "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                    "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
                    className
                )}
                {...props}
            />
        </DropdownMenuPrimitive.Portal>
    )
}

interface DropdownMenuItemProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> {
    inset?: boolean
    ref?: React.Ref<React.ElementRef<typeof DropdownMenuPrimitive.Item>>
}

function DropdownMenuItem({ className, inset, ref, ...props }: DropdownMenuItemProps) {
    return (
        <DropdownMenuPrimitive.Item
            ref={ref}
            className={cn(
                "relative flex cursor-default select-none items-center rounded-md px-2 py-1.5 text-sm outline-none transition-colors focus:bg-[var(--color-interactive-hover)] focus:text-[var(--color-text)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-[var(--color-text)]",
                inset && "pl-8",
                className
            )}
            {...props}
        />
    )
}

interface DropdownMenuLabelProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> {
    inset?: boolean
    ref?: React.Ref<React.ElementRef<typeof DropdownMenuPrimitive.Label>>
}

function DropdownMenuLabel({ className, inset, ref, ...props }: DropdownMenuLabelProps) {
    return (
        <DropdownMenuPrimitive.Label
            ref={ref}
            className={cn(
                "px-2 py-1.5 text-sm font-semibold text-[var(--color-text-muted)]",
                inset && "pl-8",
                className
            )}
            {...props}
        />
    )
}

interface DropdownMenuSeparatorProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator> {
    ref?: React.Ref<React.ElementRef<typeof DropdownMenuPrimitive.Separator>>
}

function DropdownMenuSeparator({ className, ref, ...props }: DropdownMenuSeparatorProps) {
    return (
        <DropdownMenuPrimitive.Separator
            ref={ref}
            className={cn("-mx-1 my-1 h-px bg-[var(--color-paper)]", className)}
            {...props}
        />
    )
}

export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuGroup,
    DropdownMenuPortal,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuRadioGroup,
}
