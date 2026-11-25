/**
 * The notebook: what a step-mode run says beside the graph. First the step in words (the engine's
 * narration), then one page at a time, the learner's choice: Code (the algorithm's pseudocode with
 * the step's line lit) or State (the table of distances or costs, or the queue / stack). A plain
 * scrubber moves through the run. On desktop it is a side panel whose head carries the step keys;
 * on phones a card along the bottom, view-only (the step keys stay along the top).
 *
 * The rework lab's notebook variant is this component too.
 */
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useShallow } from "zustand/shallow";
import { Panel, Slider, Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui-sdk";
import { cn } from "@/lib/utils";
import { algorithmRegistry } from "../../algorithms";
import { frameAt, narrate } from "../../algorithms/engine";
import { num } from "../Graph/runMarkShapes";
import type { GraphNode } from "../Graph/types";
import { useGraphStore } from "../../store/graphStore";
import { useSettingsStore, type NotebookPage } from "../../store/settingsStore";
import { keepsValues, lineAt, rolesAt, runMarksAt, traceAt, type NodeRole, type Run } from "../../utils/visualization/runView";
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

/** A plain scrubber over the run's steps. `marks` sit above the track. */
export function Scrubber({ index, total, onScrub, marks, className }: {
  index: number; total: number; onScrub: (index: number) => void; marks?: ReactNode; className?: string;
}) {
  const last = Math.max(1, total - 1);
  return (
    <div className={cn("nb-scrub", className)}>
      {marks}
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
  /** Marks above the scrubber's track. */
  marks?: ReactNode;
}

export function Notebook({ run, index, desktop, controls, onScrub, marks }: NotebookProps) {
  const nodes = useGraphStore(useShallow((s) => s.data.nodes));
  const page = useSettingsStore((s) => s.notebookPage);
  const setPage = useSettingsStore((s) => s.setNotebookPage);
  const adapter = algorithmRegistry.get(run.algorithmId);
  const narration = useMemo(() => narrate(run.events, run.algorithmId), [run]);
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
      <Scrubber index={index} total={run.ends.length} onScrub={onScrub} marks={marks} />
    </Panel>
  );
}
