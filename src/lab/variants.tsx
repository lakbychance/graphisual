/**
 * The three run UIs the lab compares. Each answers the same questions (where the state lives,
 * how a step reads, how the learner moves through the run) differently:
 *
 * - Caption: the graph carries everything; one caption under it says the step and shows its line
 *   of code; the scrubber sits in the caption.
 * - Notebook: a side notebook says the step, then shows the code or the state (one at a time);
 *   the graph carries roles, changes and the depth-first branch, the notebook the full table.
 * - Score: the run laid out as a score, code lines down and steps across, one dot per step;
 *   the learner reads the shape of the run and scrubs it directly; state stays on the graph.
 */
import { useEffect, useRef } from "react";
import { Code2 } from "lucide-react";
import {
  Button, Panel, Popover, PopoverContent, PopoverTrigger, SegmentedControl, SegmentedControlItem,
} from "@/components/ui-sdk";
import { Notebook as AppNotebook } from "@/components/Board/Notebook";
import type { GraphEdge, GraphNode } from "@/components/Graph/types";
import type { Run } from "@/utils/visualization/runView";
import { CodeLine, CodeList, Narration, Scrubber, Transport, type TransportProps } from "./parts";
import type { CanvasOptions } from "./CanvasState";
import type { RunSummary, StepKind, StepView, VariantId } from "./model";

export interface VariantProps {
  run: Run;
  view: StepView;
  summary: RunSummary;
  nodes: GraphNode[];
  edges: Map<number, GraphEdge[]>;
  code: string[];
  name: string;
  desktop: boolean;
  transport: TransportProps;
  onScrub: (index: number) => void;
}

/** What each variant draws on the graph. */
export const CANVAS: Record<VariantId, CanvasOptions> = {
  caption: { values: "all" },
  notebook: { values: "reached" },
  score: { values: "reached" },
};

/**
 * Room each variant's panels take at the screen's edges (px), so the graph is fitted into what
 * is left. Phones also lose the lab bar and the step bar along the top.
 */
export function occlusion(variant: VariantId, desktop: boolean, height: number) {
  const top = desktop ? 72 : 128;
  if (variant === "notebook") return desktop ? { top, right: 392, bottom: 16, left: 16 } : { top, right: 8, bottom: Math.round(height * 0.36) + 16, left: 8 };
  if (variant === "score") return desktop ? { top, right: 16, bottom: 300, left: 16 } : { top, right: 8, bottom: 262, left: 8 };
  return desktop ? { top, right: 16, bottom: 176, left: 16 } : { top, right: 8, bottom: 200, left: 8 };
}

/* ------------------------------------------------------------------ Caption */

export function Caption({ view, summary, code, desktop, transport, onScrub }: VariantProps) {
  const lit = summary.lines[view.index] ?? null;
  return (
    <Panel className="lab-caption" role="region" aria-label="Step">
      <Narration text={summary.narration[view.index] ?? ""} />
      <div className="lab-caption-code">
        <CodeLine lines={code} lit={lit} />
        <Popover>
          <PopoverTrigger render={<Button variant="ghost" size="sm" tone="muted" aria-label="Show all the code" />}>
            <Code2 aria-hidden="true" /> {desktop ? "All code" : null}
          </PopoverTrigger>
          <PopoverContent side="top" sideOffset={10} className="lab-code-pop">
            <CodeList lines={code} lit={lit} />
          </PopoverContent>
        </Popover>
      </div>
      <div className="lab-caption-foot">
        <Scrubber index={view.index} total={transport.total} markers={summary.markers} onScrub={onScrub} />
        {desktop && <Transport {...transport} compact />}
      </div>
    </Panel>
  );
}

/* ----------------------------------------------------------------- Notebook */

/** The app's notebook (`Board/Notebook.tsx`), with the lab's transport. */
export function Notebook({ run, view, desktop, transport, onScrub }: VariantProps) {
  return (
    <div className="lab-notebook">
      <AppNotebook
        run={run}
        index={view.index}
        desktop={desktop}
        controls={<Transport {...transport} />}
        onScrub={onScrub}
      />
    </div>
  );
}

/* -------------------------------------------------------------------- Score */

const KIND: Record<StepKind, { color: string; word: string }> = {
  start: { color: "var(--color-node-stroke)", word: "start" },
  take: { color: "var(--color-edge-traversal)", word: "take a node" },
  add: { color: "var(--color-tint-start)", word: "add" },
  improve: { color: "var(--color-state-change)", word: "improve" },
  "back-up": { color: "var(--color-text-muted)", word: "back up" },
  loop: { color: "var(--color-edge-cycle)", word: "edge back" },
  answer: { color: "var(--color-edge-path)", word: "answer" },
  check: { color: "var(--color-node-stroke)", word: "check" },
};

export function Score({ view, summary, code, desktop, transport, onScrub }: VariantProps) {
  const total = summary.lines.length;
  const index = view.index;
  const lit = summary.lines[index] ?? null;
  const rowH = desktop ? 18 : 15;
  const colMin = desktop ? 12 : 16;
  const grid = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  // Keep the current step in view when the score is wider than the screen.
  useEffect(() => {
    const box = scroller.current;
    const inner = grid.current;
    if (!box || !inner || inner.scrollWidth <= box.clientWidth) return;
    const x = ((index + 0.5) / total) * inner.scrollWidth;
    if (x < box.scrollLeft + 24 || x > box.scrollLeft + box.clientWidth - 24) box.scrollLeft = x - box.clientWidth / 2;
  }, [index, total]);

  const scrubAt = (clientX: number) => {
    const rect = grid.current?.getBoundingClientRect();
    if (!rect) return;
    onScrub(Math.max(0, Math.min(total - 1, Math.floor(((clientX - rect.left) / rect.width) * total))));
  };

  const used = new Set(summary.lines.filter((l): l is number => l !== null));
  const kinds = [...new Set(summary.kinds)].filter((k) => k !== "start" && k !== "check");
  const points = summary.lines
    .map((line, i) => (line === null ? null : `${((i + 0.5) / total) * 100},${(line + 0.5) * rowH}`))
    .filter(Boolean)
    .join(" ");

  return (
    <Panel className="lab-score" role="region" aria-label="Score">
      <div className="lab-score-head">
        <Narration text={summary.narration[index] ?? ""} />
        {desktop && <Transport {...transport} />}
      </div>
      <div className="lab-score-body" style={{ "--row": `${rowH}px` } as React.CSSProperties}>
        <ol className="lab-score-lines" data-numbers={!desktop || undefined} aria-label="Code">
          {code.map((line, i) => (
            <li key={i} data-lit={i === lit || undefined} data-unused={!used.has(i) || undefined}>
              {desktop ? <code>{line}</code> : <span>{i + 1}</span>}
            </li>
          ))}
        </ol>
        <div className="lab-score-scroll" ref={scroller}>
          <div className="lab-score-pins" style={{ minWidth: total * colMin }}>
            {summary.markers.map((m) => (
              <button
                key={`${m.kind}-${m.index}`}
                type="button"
                className="lab-score-pin"
                data-kind={m.kind}
                style={{ left: `${((m.index + 0.5) / total) * 100}%` }}
                onClick={() => onScrub(m.index)}
              >
                {desktop ? m.label : ""}
                <span className="sr-only">{desktop ? "" : m.label}</span>
              </button>
            ))}
          </div>
          <div
            ref={grid}
            className="lab-score-grid"
            style={{ minWidth: total * colMin, height: code.length * rowH }}
            role="slider"
            tabIndex={0}
            aria-label="Step"
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={index + 1}
            onPointerDown={(e) => {
              dragging.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              scrubAt(e.clientX);
            }}
            onPointerMove={(e) => dragging.current && scrubAt(e.clientX)}
            onPointerUp={() => { dragging.current = false; }}
            onPointerCancel={() => { dragging.current = false; }}
          >
            {code.map((_, i) => <span key={i} className="lab-score-rule" data-lit={i === lit || undefined} style={{ top: i * rowH }} />)}
            <span className="lab-score-now" style={{ left: `${(index / total) * 100}%`, width: `${100 / total}%` }} />
            <svg className="lab-score-melody" viewBox={`0 0 100 ${code.length * rowH}`} preserveAspectRatio="none" aria-hidden="true">
              <polyline points={points} fill="none" vectorEffect="non-scaling-stroke" />
            </svg>
            {summary.lines.map((line, i) => line === null ? null : (
              <span
                key={i}
                className="lab-score-dot"
                data-past={i < index || undefined}
                data-now={i === index || undefined}
                data-future={i > index || undefined}
                style={{ left: `${((i + 0.5) / total) * 100}%`, top: (line + 0.5) * rowH, "--dot": KIND[summary.kinds[i]].color } as React.CSSProperties}
              />
            ))}
          </div>
        </div>
      </div>
      {desktop && (
        <ul className="lab-score-key" aria-label="Kinds of step">
          {kinds.map((k) => <li key={k} style={{ "--dot": KIND[k].color } as React.CSSProperties}>{KIND[k].word}</li>)}
        </ul>
      )}
    </Panel>
  );
}

/* ----------------------------------------------------------- variant switch */

export function VariantSwitch({ value, onChange, variants, size }: {
  value: VariantId; onChange: (v: VariantId) => void; variants: ReadonlyArray<{ id: VariantId; name: string }>; size: "sm" | "md";
}) {
  return (
    <SegmentedControl aria-label="Variant" value={value} onValueChange={(v) => v && onChange(v as VariantId)} size={size}>
      {variants.map((v) => <SegmentedControlItem key={v.id} value={v.id}>{v.name}</SegmentedControlItem>)}
    </SegmentedControl>
  );
}
