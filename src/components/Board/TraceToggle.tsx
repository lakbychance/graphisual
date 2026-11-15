import { Waypoints } from "lucide-react";
import * as m from "motion/react-m";
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui-sdk";

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
        <TooltipTrigger render={<Button size="icon" aria-label="Show algorithm trace" onClick={onExpand} />}>
          <Waypoints size={20} className="text-(--color-text-muted)" />
        </TooltipTrigger>
        <TooltipContent side="top">Show trace</TooltipContent>
      </Tooltip>
    </m.div>
  );
};
