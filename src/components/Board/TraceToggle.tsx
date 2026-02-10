import { Waypoints } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Button } from "../ui/button";
import { GrainTexture } from "../ui/grain-texture";
import * as m from "motion/react-m";

interface TraceToggleProps {
  onExpand: () => void;
}

export const TraceToggle = ({ onExpand }: TraceToggleProps) => {
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
          <Button
            onClick={onExpand}
            size="icon"
            aria-label="Show algorithm trace"
            className="relative"
          >
            <GrainTexture baseFrequency={4.2} className="rounded-lg overflow-hidden" />
            <Waypoints size={20} className="text-[var(--color-text-muted)]" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Show trace</TooltipContent>
      </Tooltip>
    </m.div>
  );
};
