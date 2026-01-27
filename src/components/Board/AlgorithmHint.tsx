import { useReducedMotion, AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { cn } from "@/lib/utils";

interface AlgorithmHintProps {
  text: string;
}

export const AlgorithmHint = ({ text }: AlgorithmHintProps) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      className={cn(
        "fixed z-40 left-1/2 -translate-x-1/2 max-w-[calc(100vw-2rem)]",
        // Mobile: center top
        "top-4",
        // Desktop: center bottom
        "md:top-auto md:bottom-5",
      )}
    >
      <AnimatePresence mode="wait">
        <m.div
          key={text}
          initial={prefersReducedMotion ? false : { scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={prefersReducedMotion ? undefined : { scale: 0.95, opacity: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.15 }}
          className="relative px-4 py-2.5 rounded-md text-sm text-center overflow-hidden bg-[var(--color-text)] shadow-[var(--shadow-raised)] text-[var(--color-surface)] whitespace-nowrap"
        >
          <span className="relative z-10">{text}</span>
        </m.div>
      </AnimatePresence>
    </div>
  );
};
