import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

interface AlgorithmHintProps {
  text: string;
}

export const AlgorithmHint = ({ text }: AlgorithmHintProps) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { scale: 0, opacity: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={prefersReducedMotion ? { duration: 0 } : undefined}
      className={cn(
        "fixed z-40 left-1/2 -translate-x-1/2 max-w-[calc(100vw-2rem)]",
        // Mobile: center top
        "top-4",
        // Desktop: center bottom
        "md:top-auto md:bottom-5",
      )}
    >
      <div className="relative px-4 py-2.5 rounded-md text-sm text-center overflow-hidden bg-[var(--color-surface)] shadow-[var(--shadow-raised),var(--highlight-edge)] text-[var(--color-text-muted)]">
        <span className="relative z-10">{text}</span>
      </div>
    </motion.div>
  );
};
