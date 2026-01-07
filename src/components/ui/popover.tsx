import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { motion, AnimatePresence } from "motion/react"
import { cn } from "../../lib/utils"

// Create a context to pass open state to content
const PopoverContext = React.createContext<{ open: boolean }>({ open: false })

const Popover = ({ children, ...props }: React.ComponentProps<typeof PopoverPrimitive.Root>) => {
  const [open, setOpen] = React.useState(props.defaultOpen ?? false)
  const isControlled = props.open !== undefined
  const isOpen = isControlled ? props.open : open

  return (
    <PopoverContext.Provider value={{ open: isOpen ?? false }}>
      <PopoverPrimitive.Root
        modal
        {...props}
        open={isOpen}
        onOpenChange={(newOpen) => {
          if (!isControlled) setOpen(newOpen)
          props.onOpenChange?.(newOpen)
        }}
      >
        {children}
      </PopoverPrimitive.Root>
    </PopoverContext.Provider>
  )
}

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverAnchor = PopoverPrimitive.Anchor

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, children, style, ...props }, ref) => {
  const { open } = React.useContext(PopoverContext)

  return (
    <AnimatePresence>
      {open && (
        <PopoverPrimitive.Portal forceMount>
          <PopoverPrimitive.Content
            ref={ref}
            align={align}
            sideOffset={sideOffset}
            forceMount
            className="z-50!"
            {...props}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{
                type: 'spring',
                stiffness: 500,
                damping: 30,
              }}
              className={cn(
                "z-50 overflow-hidden",
                "rounded-[var(--radius-md)]",
                "bg-[var(--color-paper)]",
                "shadow-[var(--shadow-raised-lg),var(--highlight-edge)]",
                "outline-none",
                className
              )}
              style={style}
            >
              {children}
            </motion.div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      )}
    </AnimatePresence>
  )
})
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
