import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button, Label, Panel } from "@/components/ui-sdk";
import type { BfsStep } from "./mock";

function parseTrace(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") ? <strong key={i} className="font-semibold text-(--color-text)">{part.slice(2, -2)}</strong> : part,
  );
}

export interface TracePanelProps {
  step: BfsStep;
  onCollapse?: () => void;
  className?: string;
}

/** Trace panel: message + a live queue of chips (processing / just added / waiting). */
export function TracePanel({ step, onCollapse, className }: TracePanelProps) {
  return (
    <Panel role="region" aria-label="Algorithm trace" className={`flex flex-col gap-2 p-3 pr-10 min-w-[280px] max-w-[460px] ${className ?? ""}`}>
      {onCollapse && (
        <Button variant="ghost" size="icon-xs" tone="muted" aria-label="Hide trace panel" className="absolute top-2 right-2" onClick={onCollapse}>
          <X aria-hidden="true" />
        </Button>
      )}
      <p className="text-sm text-(--color-text-muted) leading-snug m-0">{parseTrace(step.message)}</p>
      <div className="pt-2 border-t border-(--color-divider) grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 items-center">
        <Label>Processing</Label>
        <div className="flex gap-1.5 min-h-6 items-center">
          {step.current ? <span className="gs-chip" data-state="processing">{step.current}</span> : <span className="text-xs italic text-(--color-text-muted)">—</span>}
        </div>
        <Label>Queue</Label>
        <div className="flex gap-1.5 min-h-6 items-center flex-wrap">
          {step.queue.length === 0 && <span className="text-xs italic text-(--color-text-muted)">empty</span>}
          {step.queue.map((id) => (
            <span key={id} className="gs-chip" data-state={step.justAdded.includes(id) ? "added" : undefined}>{id}</span>
          ))}
        </div>
        <Label>Visited</Label>
        <div className="flex gap-1.5 min-h-6 items-center flex-wrap">
          {step.visited.map((id) => <span key={id} className="gs-chip">{id}</span>)}
        </div>
      </div>
    </Panel>
  );
}
