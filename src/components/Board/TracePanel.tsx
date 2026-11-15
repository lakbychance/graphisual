import { useCallback } from "react";
import { X } from "lucide-react";
import * as m from "motion/react-m";
import { useShallow } from "zustand/shallow";
import { Button, Panel } from "@/components/ui-sdk";
import { DataStructureVis } from "./DataStructureVis";
import type { StepTrace } from "../../algorithms/types";
import { useGraphStore } from "../../store/graphStore";

// Parse **bold** markers and newlines in text and return React nodes.
// Resolves {n:X} node ID placeholders to custom labels before parsing.
const parseTrace = (text: string, getNodeLabel?: (id: number) => string): React.ReactNode => {
  const processed = text.replace(/\{n:(\d+)\}/g, (_, id) =>
    getNodeLabel ? getNodeLabel(parseInt(id, 10)) : id
  );
  const lines = processed.split("\n");

  return lines.map((line, lineIndex) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const parsedLine = parts.map((part, partIndex) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={partIndex} className="font-semibold text-(--color-text)">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
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
  const nodes = useGraphStore(useShallow((state) => state.data.nodes));

  const getNodeLabel = useCallback(
    (id: number) => nodes.find((n) => n.id === id)?.label || String(id),
    [nodes]
  );

  return (
    <m.div
      layout="preserve-aspect"
      initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: 16, filter: "blur(4px)" }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="hidden md:flex fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40"
    >
      <Panel role="region" aria-label="Algorithm trace" className="flex flex-col gap-2 p-3 pr-10 min-w-[280px] max-w-[500px]">
        <Button
          onClick={onCollapse}
          variant="ghost"
          size="icon-xs"
          tone="muted"
          className="absolute top-2 right-2"
          aria-label="Hide trace panel"
        >
          <X aria-hidden="true" />
        </Button>

        <div className="text-sm text-(--color-text-muted)">
          {trace?.message ? parseTrace(trace.message, getNodeLabel) : "Starting algorithm..."}
        </div>

        {trace?.dataStructure && (
          <div className="pt-1 border-t border-(--color-divider)">
            <DataStructureVis dataStructure={trace.dataStructure} getNodeLabel={getNodeLabel} />
          </div>
        )}
      </Panel>
    </m.div>
  );
};
