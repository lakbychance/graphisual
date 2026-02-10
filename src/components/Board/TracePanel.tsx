import { X } from "lucide-react";
import { Button } from "../ui/button";
import { GrainTexture } from "../ui/grain-texture";
import { DataStructureVis } from "./DataStructureVis";
import type { StepTrace } from "../../algorithms/types";
import * as m from "motion/react-m";

// Parse **bold** markers and newlines in text and return React nodes
const parseTrace = (text: string): React.ReactNode => {
  // Split by newlines first
  const lines = text.split("\n");

  return lines.map((line, lineIndex) => {
    // Parse bold markers within each line
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const parsedLine = parts.map((part, partIndex) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={partIndex} className="font-semibold text-[var(--color-text)]">{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    // Add line break between lines (but not after the last one)
    if (lineIndex < lines.length - 1) {
      return <span key={lineIndex}>{parsedLine}<br /></span>;
    }
    return <span key={lineIndex}>{parsedLine}</span>;
  });
};

interface TracePanelProps {
  trace: StepTrace | undefined;
  onCollapse: () => void;
}

export const TracePanel = ({ trace, onCollapse }: TracePanelProps) => {
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
          size="icon-xs"
          className="absolute top-2 right-2 z-10"
          aria-label="Hide trace panel"
        >
          <X size={14} className="text-[var(--color-text-muted)]" />
        </Button>

        {/* Trace message */}
        <div className="text-sm text-[var(--color-text-muted)] relative z-10">
          {trace?.message ? parseTrace(trace.message) : "Starting algorithm..."}
        </div>

        {/* Data structure visualization */}
        {trace?.dataStructure && (
          <div className="relative z-10 pt-1 border-t border-[var(--color-divider)]">
            <DataStructureVis dataStructure={trace.dataStructure} />
          </div>
        )}
      </div>
    </m.div>
  );
};
