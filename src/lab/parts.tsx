/**
 * Pieces the lab's variants share: the step in words, the pseudocode with its lit line, the
 * state (table, queue or stack), the scrubber with its markers and the transport keys.
 */
import { useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { Button, Slider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui-sdk";
import { DataStructureVis } from "@/components/Board/DataStructureVis";
import type { GraphNode } from "@/components/Graph/types";
import { cn } from "@/lib/utils";
import { traceAt, type Run } from "@/utils/visualization/runView";
import { keepsValues, num, type Marker, type StepView } from "./model";

/* ---------------------------------------------------------------- words */

export function Narration({ text, className }: { text: string; className?: string }) {
  return <p className={cn("lab-narration", className)} aria-live="polite">{text}</p>;
}

/** The pseudocode, the step's line lit (and scrolled into view when the list scrolls). */
export function CodeList({ lines, lit }: { lines: string[]; lit: number | null }) {
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const row = lit === null ? null : list.current?.children[lit];
    row?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [lit]);
  return (
    <ol className="lab-code" ref={list}>
      {lines.map((line, i) => (
        <li key={i} data-lit={i === lit || undefined} aria-current={i === lit ? "step" : undefined}>
          <span className="lab-code-no">{i + 1}</span>
          <code>{line}</code>
        </li>
      ))}
    </ol>
  );
}

/** Only the lit line, with its number. */
export function CodeLine({ lines, lit }: { lines: string[]; lit: number | null }) {
  if (lit === null) return null;
  return (
    <div className="lab-code-line">
      <span className="lab-code-no">{lit + 1}</span>
      <code>{lines[lit].trim()}</code>
    </div>
  );
}

/* ---------------------------------------------------------------- state */

/**
 * The run's state at this step: a table of values (Dijkstra's, Prim's, Bellman-Ford), or the
 * queue / stack the app's trace panel shows.
 */
export function StateView({ run, view, nodes }: { run: Run; view: StepView; nodes: GraphNode[] }) {
  const label = (id: number) => nodes.find((n) => n.id === id)?.label || String(id);
  if (keepsValues(run.algorithmId)) {
    const rows = [...nodes].sort((a, b) => label(a.id).localeCompare(label(b.id), undefined, { numeric: true }));
    const status: Record<string, string> = {
      unseen: "unreached", waiting: "waiting", current: "now", final: "final", reached: "may improve", open: "", done: "",
    };
    return (
      <table className="lab-table">
        <thead>
          <tr><th>Node</th><th>{run.algorithmId === "prims" ? "Cost" : "Distance"}</th><th>Via</th><th></th></tr>
        </thead>
        <tbody>
          {rows.map((node) => {
            const state = view.nodes.get(node.id);
            const via = view.frame.prev.get(node.id);
            return (
              <tr key={node.id} data-changed={state?.changed || undefined} data-role={state?.role}>
                <td>{label(node.id)}</td>
                <td className="gs-value">
                  {state?.old !== undefined && <s>{num(state.old)}</s>} {num(state?.value)}
                </td>
                <td>{via === undefined ? "–" : label(via)}</td>
                <td className="lab-table-status">{status[state?.role ?? "unseen"]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }
  const trace = traceAt(run, view.index);
  if (!trace?.dataStructure) return <p className="lab-muted">Nothing waiting</p>;
  return <DataStructureVis dataStructure={trace.dataStructure} getNodeLabel={label} />;
}

/* ------------------------------------------------------------- timeline */

const MARKER_COLOR: Record<Marker["kind"], string> = {
  found: "var(--color-edge-path)",
  negative: "var(--color-error)",
  back: "var(--color-edge-back)",
  round: "var(--color-text-muted)",
};

/** A scrubber over the run's steps, with its key moments marked above the track. */
export function Scrubber({ index, total, markers, onScrub, className }: {
  index: number; total: number; markers: Marker[]; onScrub: (index: number) => void; className?: string;
}) {
  const last = Math.max(1, total - 1);
  return (
    <div className={cn("lab-scrub", className)}>
      <div className="lab-scrub-marks">
        {markers.map((m) => (
          <Tooltip key={`${m.kind}-${m.index}`}>
            <TooltipTrigger
              render={<button type="button" className="lab-pin" aria-label={`${m.label}, step ${m.index + 1}`} onClick={() => onScrub(m.index)} />}
              style={{ left: `${(m.index / last) * 100}%`, "--pin": MARKER_COLOR[m.kind] } as React.CSSProperties}
              data-here={m.index === index || undefined}
            />
            <TooltipContent>{m.label}</TooltipContent>
          </Tooltip>
        ))}
      </div>
      <Slider
        min={0}
        max={last}
        step={1}
        value={Math.max(0, index)}
        onValueChange={(v) => onScrub(typeof v === "number" ? v : v[0])}
        thumbLabel="Step"
      />
    </div>
  );
}

/* ------------------------------------------------------------ transport */

export interface TransportProps {
  index: number;
  total: number;
  playing: boolean;
  onStart: () => void;
  onPrev: () => void;
  onNext: () => void;
  onEnd: () => void;
  onPlay: () => void;
}

function Key({ label, children, ...props }: { label: string; children: ReactNode } & ComponentProps<typeof Button>) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost" size="icon-sm" focusableWhenDisabled aria-label={label} {...props} />}>
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** Step keys and the counter. `compact` drops the jump keys. */
export function Transport({ index, total, playing, onStart, onPrev, onNext, onEnd, onPlay, compact = false }: TransportProps & { compact?: boolean }) {
  const canBack = index > 0;
  const canForward = index < total - 1;
  return (
    <div role="group" aria-label="Step controls" className="lab-transport">
      {!compact && <Key label="Jump to start" disabled={!canBack} onClick={onStart}><SkipBack aria-hidden="true" /></Key>}
      <Key label="Previous step" disabled={!canBack} onClick={onPrev}><ChevronLeft aria-hidden="true" /></Key>
      <span className="gs-value lab-counter">{index + 1} / {total}</span>
      <Key label="Next step" disabled={!canForward} onClick={onNext}><ChevronRight aria-hidden="true" /></Key>
      {!compact && <Key label="Jump to end" disabled={!canForward} onClick={onEnd}><SkipForward aria-hidden="true" /></Key>}
      <Key label={playing ? "Pause" : "Play"} disabled={!canForward && !playing} onClick={onPlay}>
        {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
      </Key>
    </div>
  );
}
