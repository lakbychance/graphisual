/**
 * The graph as a program stores it (`storage.ts`): an adjacency list (`A: B (4), C (2)`) or an
 * adjacency matrix (row A, column B holds the edge from A to B), one at a time. In the notebook during
 * a run it lights what the step does (`storageAt`): the row of the node being worked on, and the entry
 * of the edge the step uses, in the colours the canvas gives them; everything else is quiet, and the
 * lit row and entry stay in view. Beside the canvas outside a run (the edge list panel) nothing is lit.
 * View-only: the graph is edited on the canvas or as text.
 */
import { Fragment, useEffect, useMemo, useRef, type ReactNode } from "react";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui-sdk";
import { signed } from "../../algorithms/traceHelpers";
import type { GraphEdge, GraphNode } from "../Graph/types";
import type { StorageForm } from "../../store/settingsStore";
import { cellOf, storageOf } from "../../utils/graph/storage";
import type { StorageLit } from "../../utils/visualization/runView";
import { keepShowing } from "./keepInView";
import "./storage.css";

/** List or matrix. */
export function StorageFormSwitch({ form, onForm }: { form: StorageForm; onForm: (form: StorageForm) => void }) {
  return (
    <SegmentedControl
      aria-label="Storage view"
      value={form}
      onValueChange={(v) => v && onForm(v as StorageForm)}
      // As with Watch / Run it, a click leaves no focus on the switch, so the arrow keys go on stepping the run.
      onClick={(e) => {
        if (e.detail > 0) (document.activeElement as HTMLElement | null)?.blur();
      }}
    >
      <SegmentedControlItem value="list">List</SegmentedControlItem>
      <SegmentedControlItem value="matrix">Matrix</SegmentedControlItem>
    </SegmentedControl>
  );
}

/** What each view says it shows, in a line above it. */
function Key({ form, weighted }: { form: StorageForm; weighted: boolean }) {
  return form === "list" ? (
    <p className="sv-key"><b>Adjacency list</b>: each node, then the nodes its edges lead to{weighted ? " (weight)" : ""}</p>
  ) : (
    <p className="sv-key"><b>Adjacency matrix</b>: row to column holds {weighted ? "the edge's weight" : "1 for an edge"}, blank for none</p>
  );
}

export interface StorageViewProps {
  nodes: readonly GraphNode[];
  edges: ReadonlyMap<number, readonly GraphEdge[]>;
  form: StorageForm;
  /** During a run, what the step lights; nothing is lit outside one. */
  lit?: StorageLit;
  /** The step on screen, so the lit row is brought back into view on every step. */
  step?: number;
  /** A label for the scroller, which takes keyboard focus to scroll a big graph. */
  label: string;
  /** What goes above the view (the notebook's List / Matrix switch). */
  head?: ReactNode;
}

export function StorageView({ nodes, edges, form, lit, step, label, head }: StorageViewProps) {
  const storage = useMemo(() => storageOf(nodes, edges), [nodes, edges]);
  const { order, names, rows, weighted } = storage;
  const scroller = useRef<HTMLDivElement>(null);
  const row = lit?.row ?? null;
  const cells = lit?.cells ?? [];
  const litCell = (from: number, to: number) => cells.some((c) => c.from === from && c.to === to);
  const name = (id: number) => names.get(id) ?? String(id);

  // The lit entry, else the lit row, stays in view, on every step and whenever the page changes size.
  useEffect(() => keepShowing(scroller.current, () =>
    scroller.current?.querySelector("[data-lit-row] [data-lit]") ?? scroller.current?.querySelector("[data-lit-row]")
    ?? scroller.current?.querySelector("[data-lit]")), [lit, step, form]);

  return (
    <div className="sv" data-run={lit ? "" : undefined}>
      {head && <div className="sv-top">{head}</div>}
      <Key form={form} weighted={weighted} />
      <div className="sv-scroll" ref={scroller} tabIndex={0} role="region" aria-label={label}>
        {order.length === 0 ? (
          <p className="sv-empty">No nodes yet</p>
        ) : form === "list" ? (
          <ul className="sv-list">
            {order.map((id) => {
              const entries = rows.get(id) ?? [];
              return (
                <li key={id} data-lit-row={row === id || undefined} aria-current={row === id ? "step" : undefined}>
                  <span className="sv-head">{name(id)}:</span>
                  <span className="sv-entries">
                    {entries.length === 0 ? <span className="sv-none">–</span> : entries.map((e, i) => (
                      <Fragment key={i}>
                        {i > 0 && ", "}
                        <span className="sv-entry" data-lit={litCell(id, e.to) || undefined}>
                          {name(e.to)}{weighted && ` (${signed(e.weight)})`}
                        </span>
                      </Fragment>
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <table className="sv-matrix">
            <thead>
              <tr>
                <th scope="col"><span className="sr-only">From, to</span></th>
                {order.map((id) => <th key={id} scope="col">{name(id)}</th>)}
              </tr>
            </thead>
            <tbody>
              {order.map((from) => (
                <tr key={from} data-lit-row={row === from || undefined} aria-current={row === from ? "step" : undefined}>
                  <th scope="row">{name(from)}</th>
                  {order.map((to) => {
                    const value = cellOf(storage, from, to);
                    return (
                      <td key={to} data-lit={litCell(from, to) || undefined} data-none={value === null || undefined}>
                        {value === null ? "" : signed(value)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
