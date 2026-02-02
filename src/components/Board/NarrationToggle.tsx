import { BookOpenText } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { GrainTexture } from "../ui/grain-texture";
import * as m from "motion/react-m";

interface NarrationToggleProps {
  onExpand: () => void;
}

export const NarrationToggle = ({ onExpand }: NarrationToggleProps) => {
  return (
    <m.div
      initial={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="hidden md:block"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onExpand}
            aria-label="Show algorithm trace"
            className="relative h-10 w-10 flex items-center justify-center rounded-md bg-[var(--color-surface)] shadow-[var(--shadow-raised),var(--highlight-edge)] focus-ring-animated"
          >
            <GrainTexture baseFrequency={4.2} className="rounded-md overflow-hidden" />
            <BookOpenText size={20} className="text-[var(--color-text-muted)]" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Show trace</TooltipContent>
      </Tooltip>
    </m.div>
  );
};
