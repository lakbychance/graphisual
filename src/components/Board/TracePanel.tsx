import { X } from "lucide-react";
import { Button } from "../ui/button";
import { GrainTexture } from "../ui/grain-texture";
import { DataStructureVis } from "./DataStructureVis";
import type { StepNarration } from "../../algorithms/types";
import * as m from "motion/react-m";

// Parse **bold** markers in text and return React nodes
const parseNarration = (text: string): React.ReactNode => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-[var(--color-text)]">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

interface TracePanelProps {
  narration: StepNarration | undefined;
  onCollapse: () => void;
}

export const TracePanel = ({ narration, onCollapse }: TracePanelProps) => {
  return (
    <m.div
      layout='preserve-aspect'
      initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: 16, filter: "blur(4px)" }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="hidden md:flex fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40"
    >
      <div
        role="region"
        aria-label="Algorithm trace"
        className="relative flex flex-col gap-2 p-3 pr-10 rounded-md bg-[var(--color-surface)] shadow-[var(--shadow-premium)] min-w-[280px] max-w-[500px]"
      >
        <GrainTexture baseFrequency={4.2} className="rounded-md" />

        {/* Collapse button */}
        <Button
          onClick={onCollapse}
          variant="ghost"
          size="icon-sm"
          className="absolute top-2 right-2 z-10 h-6 w-6"
          aria-label="Hide trace panel"
        >
          <X size={14} className="text-[var(--color-text-muted)]" />
        </Button>

        {/* Narration message */}
        <div className="text-sm text-[var(--color-text-muted)] relative z-10">
          {narration?.message ? parseNarration(narration.message) : "Starting algorithm..."}
        </div>

        {/* Data structure visualization */}
        {narration?.dataStructure && (
          <div className="relative z-10 pt-1 border-t border-[var(--color-divider)]">
            <DataStructureVis dataStructure={narration.dataStructure} />
          </div>
        )}
      </div>
    </m.div>
  );
};
