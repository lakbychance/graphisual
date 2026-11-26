/**
 * The notebook: what a step-mode run says beside the graph. First the step in words (the engine's
 * narration), then one page at a time, the learner's choice: Code (the algorithm's pseudocode with
 * the step's line lit) or State (the table of distances or costs, or the queue / stack). A plain
 * scrubber moves through the run, its key moments marked above the track (see `keyMoments`). On
 * desktop it is a side panel whose head carries the step keys; on phones a card along the bottom,
 * view-only (the step keys stay along the top).
 *
 * The rework lab's notebook variant is this component too.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useShallow } from "zustand/shallow";
import { Check, Flag, RotateCcw, type LucideIcon } from "lucide-react";
import { Panel, Slider, Tabs, TabsList, TabsPanel, TabsTab, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui-sdk";
import { cn } from "@/lib/utils";
import { algorithmRegistry } from "../../algorithms";
import { frameAt, narrate } from "../../algorithms/engine";
import { num } from "../Graph/runMarkShapes";
import type { GraphNode } from "../Graph/types";
import { useGraphStore } from "../../store/graphStore";
import { useSettingsStore, type NotebookPage } from "../../store/settingsStore";
import {
  keepsValues, keyMoments, lineAt, rolesAt, runMarksAt, traceAt, type KeyMoment, type MomentKind, type NodeRole, type Run,
} from "../../utils/visualization/runView";
import { DataStructureVis } from "./DataStructureVis";
import "./notebook.css";

const nameOf = (nodes: readonly GraphNode[], id: number) => nodes.find((n) => n.id === id)?.label || String(id);

/** Scrolls the notebook page holding `row` just enough to show it whole (below a pinned header), never the screen behind it. */
function keepInView(row: Element | null | undefined) {
  const page = row?.closest(".nb-page");
  if (!row || !page || page.scrollHeight <= page.clientHeight) return;
  const r = row.getBoundingClientRect();
  const p = page.getBoundingClientRect();
  const top = p.top + (page.querySelector("thead")?.getBoundingClientRect().height ?? 0);
  const by = r.top < top ? r.top - top : r.bottom > p.bottom ? Math.min(r.bottom - p.bottom, r.top - top) : 0;
  if (Math.abs(by) < 1) return;
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  page.scrollTo({ top: page.scrollTop + by, behavior: still ? "auto" : "smooth" });
}

/**
 * Keeps `pick()` in view in the page holding `holder` now, and whenever the page changes size (the
 * sentence above it grows or shrinks from step to step). Returns the cleanup.
 */
function keepShowing(holder: Element | null, pick: () => Element | null | undefined) {
  const page = holder?.closest(".nb-page");
  if (!page) return;
  const show = () => keepInView(pick());
  show();
  const watch = new ResizeObserver(show);
  watch.observe(page);
  return () => watch.disconnect();
}

/** The step in words, announced politely when it changes. */
export function Narration({ text, className }: { text: string; className?: string }) {
  return <p className={cn("nb-words", className)} aria-live="polite">{text}</p>;
}

/** The pseudocode, the step's line lit and kept in view, on every step, when the page scrolls. */
export function CodeList({ lines, lit, step }: { lines: string[]; lit: number | null; step?: number }) {
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => keepShowing(list.current, () => (lit === null ? null : list.current?.children[lit])), [lit, step]);
  return (
    <ol className="nb-code" ref={list}>
      {lines.map((line, i) => (
        <li key={i} data-lit={i === lit || undefined} aria-current={i === lit ? "step" : undefined}>
          <span className="nb-code-no">{i + 1}</span>
          <code>{line}</code>
        </li>
      ))}
    </ol>
  );
}

const STATUS: Record<NodeRole, string> = {
  unseen: "unreached", waiting: "waiting", current: "now", final: "final", reached: "may improve", open: "", done: "",
};

/**
 * The run's state at step `index`: a table of values (Dijkstra's, Prim's, Bellman-Ford), the old
 * value struck through on the row this step changed, or the queue / stack the run keeps.
 */
export function StateView({ run, index, nodes }: { run: Run; index: number; nodes: GraphNode[] }) {
  const table = useRef<HTMLTableElement>(null);
  // The row this step changed, else the node being worked on, stays in view.
  useEffect(() => keepShowing(table.current, () =>
    table.current?.querySelector("tr[data-changed]") ?? table.current?.querySelector("tr[data-role='current']")), [run, index]);
  const label = (id: number) => nameOf(nodes, id);
  if (keepsValues(run.algorithmId)) {
    const badges = runMarksAt(run, index).nodes;
    const roles = rolesAt(run, index);
    const prev = frameAt(run.events, index < 0 ? 0 : run.ends[index]).prev;
    const rows = [...nodes].sort((a, b) => label(a.id).localeCompare(label(b.id), undefined, { numeric: true }));
    return (
      <table className="nb-table" ref={table}>
        <thead>
          <tr><th>Node</th><th>{run.algorithmId === "prims" ? "Cost" : "Distance"}</th><th>Via</th><th><span className="sr-only">Status</span></th></tr>
        </thead>
        <tbody>
          {rows.map((node) => {
            const badge = badges.get(node.id);
            const role = roles.get(node.id) ?? "unseen";
            const via = prev.get(node.id);
            return (
              <tr key={node.id} data-changed={badge?.changed || undefined} data-role={role}>
                <td>{label(node.id)}</td>
                <td className="gs-value">
                  {badge?.old !== undefined && <s>{num(badge.old)}</s>} {num(badge?.value)}
                </td>
                <td>{via === undefined ? "–" : label(via)}</td>
                <td className="nb-table-status">{STATUS[role]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }
  const trace = traceAt(run, index);
  if (!trace?.dataStructure) return <p className="nb-muted">Nothing waiting</p>;
  return <DataStructureVis dataStructure={trace.dataStructure} getNodeLabel={label} />;
}

/** The symbol a key moment's mark shows when it has no text of its own. */
const MOMENT_ICON: Partial<Record<MomentKind, LucideIcon>> = { found: Flag, loop: RotateCcw, answer: Check };

/** A mark's least width, the gap kept between marks, and the furthest a mark may sit from its step, in px. */
const MARK = 16;
const GAP = 2;
const NEAR = MARK;
/** The least room between two round marks' steps (a mark's width free between them), so rounds read as a sparse ruler. */
const ROUND_ROOM = 2 * (MARK + GAP);
/** About how wide a mark is: a symbol, or its text in 10px monospace. */
const markWidth = (m: KeyMoment) => (m.text ? Math.max(MARK, 6 + 6 * m.text.length) : MARK);

/** Which marks give way first when the row is too short for all of them: rounds, then a negative edge, then a loop. */
const RANK: Record<MomentKind, number> = { answer: 0, found: 1, loop: 2, negative: 3, round: 4 };

/**
 * Centres for marks that want to sit at `want` (px along a row `width` wide, in step order), pushed
 * apart just enough that none overlap; null unless every mark then lies wholly inside the row and
 * within `NEAR` of where it wants to be.
 */
function place(want: number[], widths: number[], width: number): number[] | null {
  const apart = (i: number) => (widths[i] + widths[i + 1]) / 2 + GAP;
  const x = want.map((v, i) => Math.max(v, widths[i] / 2));
  for (let i = 1; i < x.length; i++) x[i] = Math.max(x[i], x[i - 1] + apart(i - 1));
  for (let i = x.length - 1; i >= 0; i--) x[i] = Math.min(x[i], i === x.length - 1 ? width - widths[i] / 2 : x[i + 1] - apart(i));
  return x.every((v, i) => v >= widths[i] / 2 - 0.5 && Math.abs(v - want[i]) <= NEAR) ? x : null;
}

/**
 * The marks that fit, each with its centre. Marks are taken most important first (the answer, the
 * destination found, a back edge or loop, a negative edge, then rounds from the first), and one is
 * left out when it would push a mark out of the row or more than `NEAR` from its step. Rounds thin
 * out first: a round is left out when its step is within `ROUND_ROOM` of a round already kept, the
 * later of two crowded rounds giving way.
 */
function fit(moments: KeyMoment[], want: number[], width: number): Array<{ moment: KeyMoment; x: number }> {
  const order = moments.map((_, i) => i).sort((a, b) => RANK[moments[a].kind] - RANK[moments[b].kind] || a - b);
  let kept: number[] = [];
  let xs: number[] = [];
  for (const i of order) {
    const round = (k: number) => moments[k].kind === "round";
    if (round(i) && kept.some((k) => round(k) && Math.abs(want[k] - want[i]) < ROUND_ROOM)) continue;
    const next = [...kept, i].sort((a, b) => a - b);
    const placed = place(next.map((k) => want[k]), next.map((k) => markWidth(moments[k])), width);
    if (placed) {
      kept = next;
      xs = placed;
    }
  }
  return kept.map((k, j) => ({ moment: moments[k], x: xs[j] }));
}

/**
 * The run's key moments, marked over the scrubber's track: a tap or click jumps to one. The row spans
 * the scrubber; each mark wants to sit over its step on the track, which is inset by half a thumb.
 */
function Moments({ moments, index, last, onScrub }: {
  moments: KeyMoment[]; index: number; last: number; onScrub: (index: number) => void;
}) {
  const row = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, start: 0, span: 0 });
  useLayoutEffect(() => {
    const el = row.current;
    const track = el?.parentElement?.querySelector(".gs-slider-track");
    if (!el || !track) return;
    const measure = () => {
      const box = el.getBoundingClientRect();
      const t = track.getBoundingClientRect();
      setSize({ width: box.width, start: t.left - box.left, span: t.width });
    };
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    watch.observe(track);
    return () => watch.disconnect();
  }, []);
  const { width, start, span } = size;
  const shown = width > 0 ? fit(moments, moments.map((m) => start + (m.index / last) * span), width) : [];
  return (
    <div className="nb-moments" ref={row} role="group" aria-label="Key moments">
      {shown.map(({ moment: m, x }) => {
        const Icon = MOMENT_ICON[m.kind];
        const here = m.index === index;
        return (
          <Tooltip key={`${m.kind}-${m.index}`}>
            <TooltipTrigger
              render={<button type="button" className="nb-moment" onClick={() => onScrub(m.index)} />}
              aria-label={`${m.label}, step ${m.index + 1}`}
              aria-current={here ? "step" : undefined}
              data-kind={m.kind}
              data-here={here || undefined}
              style={{ left: x }}
            >
              {Icon ? <Icon aria-hidden="true" /> : <span aria-hidden="true">{m.text}</span>}
            </TooltipTrigger>
            <TooltipContent side="top">{m.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

/** A plain scrubber over the run's steps, with its key `moments` marked above the track. */
export function Scrubber({ index, total, onScrub, moments, className }: {
  index: number; total: number; onScrub: (index: number) => void; moments?: KeyMoment[]; className?: string;
}) {
  const last = Math.max(1, total - 1);
  return (
    <div className={cn("nb-scrub", className)}>
      {moments && moments.length > 0 && <Moments moments={moments} index={index} last={last} onScrub={onScrub} />}
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

export interface NotebookProps {
  run: Run;
  /** The step on screen, 0 to N - 1. */
  index: number;
  desktop: boolean;
  /** The step keys, in the head on desktop. */
  controls?: ReactNode;
  onScrub: (index: number) => void;
}

export function Notebook({ run, index, desktop, controls, onScrub }: NotebookProps) {
  const nodes = useGraphStore(useShallow((s) => s.data.nodes));
  const page = useSettingsStore((s) => s.notebookPage);
  const setPage = useSettingsStore((s) => s.setNotebookPage);
  const adapter = algorithmRegistry.get(run.algorithmId);
  const narration = useMemo(() => narrate(run.events, run.algorithmId), [run]);
  const moments = useMemo(() => keyMoments(run), [run]);
  const sentence = (narration[index] ?? "").replace(/\{n:(\d+)\}/g, (_, id) => nameOf(nodes, Number(id)));
  const lit = lineAt(run, index);

  return (
    <Panel className="nb" role="region" aria-label="Notebook">
      {desktop && (
        <header className="nb-head">
          <span className="gs-label">{adapter?.metadata.name}</span>
          {controls}
        </header>
      )}
      <Narration text={sentence} />
      <Tabs value={page} onValueChange={(v) => setPage(v as NotebookPage)} className="nb-tabs">
        <TabsList aria-label="Notebook page">
          <TabsTab value="code">Code</TabsTab>
          <TabsTab value="state">State</TabsTab>
        </TabsList>
        <TabsPanel value="code" className="nb-page"><CodeList lines={adapter?.pseudocode ?? []} lit={lit} step={index} /></TabsPanel>
        <TabsPanel value="state" className="nb-page"><StateView run={run} index={index} nodes={nodes} /></TabsPanel>
      </Tabs>
      <Scrubber index={index} total={run.ends.length} onScrub={onScrub} moments={moments} />
    </Panel>
  );
}
