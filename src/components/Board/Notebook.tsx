/**
 * The notebook: what a step-mode run says beside the graph. First the step in words (the engine's
 * narration), then one page at a time, the learner's choice: Code (the algorithm's pseudocode with
 * the step's line lit), State (the table of distances or costs, or the queue / stack) or Storage
 * (the graph as an adjacency list or matrix, the row of the node being worked on lit). A plain
 * scrubber moves through the run, its key moments marked above the track (see `keyMoments`). On
 * desktop it is a side panel whose head carries the step keys; on phones a card along the bottom,
 * view-only (the step keys stay along the top).
 *
 * On desktop the head also switches between watching the run and running it yourself (Run it, see
 * `runIt.ts`): the run plays on its own to each decision a learner could get wrong, and below the
 * sentence the notebook asks what comes next, says why a pick is not the one, gives a clue after two
 * tries and names the answer after three. New graph runs it again on a fresh graph (`freshGraph.ts`).
 * Bellman-Ford has nothing to pick: its Run it stops now and then to ask, Yes or No, whether an edge
 * lowers a distance, says whether the answer is right and why on the step that shows it, and plays on
 * either way.
 *
 * Copy link puts a link to the step on screen on the clipboard (see `stepLink.ts`): in the head
 * on desktop, at the end of the Code / State row on phones. A link opens the step to watch; when it
 * cannot open this very step (a graph a link cannot carry, or a run the learner's picks took another
 * way) the notebook says why instead, and when the clipboard refuses, it shows the link to copy by hand.
 *
 * The rework lab's notebook variant is this component too.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useShallow } from "zustand/shallow";
import { toast } from "sonner";
import { Check, Flag, Link, RotateCcw, type LucideIcon } from "lucide-react";
import {
  Button, Input, Panel, Popover, PopoverContent, PopoverTitle, SegmentedControl, SegmentedControlItem, Slider, Tabs, TabsList, TabsPanel, TabsTab,
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui-sdk";
import { cn } from "@/lib/utils";
import { algorithmRegistry } from "../../algorithms";
import { clue, edgeQuestion, edgeQuestions, frameAt, hint, narrate, question, type DecideEvent } from "../../algorithms/engine";
import { num } from "../Graph/runMarkShapes";
import type { GraphNode } from "../Graph/types";
import { selectIsPlaying, selectRunIt, useGraphStore, type RunItState } from "../../store/graphStore";
import { useSettingsStore, type NotebookPage } from "../../store/settingsStore";
import {
  keepsValues, keyMoments, lineAt, rolesAt, runMarksAt, storageAt, traceAt, type KeyMoment, type MomentKind, type NodeRole, type Run,
} from "../../utils/visualization/runView";
import { asksYesNo, canRunIt } from "../../utils/visualization/runIt";
import { linkToStep, type NoLink } from "../../utils/visualization/stepLink";
import { DataStructureVis } from "./DataStructureVis";
import { keepShowing } from "./keepInView";
import { StorageFormSwitch, StorageView } from "./StorageView";
import "./notebook.css";

const nameOf = (nodes: readonly GraphNode[], id: number) => nodes.find((n) => n.id === id)?.label || String(id);

/** Text with node ids marked (`nid`), each shown as its node's label. */
const named = (nodes: readonly GraphNode[], text: string) => text.replace(/\{n:(\d+)\}/g, (_, id) => nameOf(nodes, Number(id)));

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

/** Watch the run, or run it yourself. */
function ModeSwitch({ run, runIt }: { run: Run; runIt: RunItState | null }) {
  const setRunItMode = useGraphStore((s) => s.setRunItMode);
  return (
    <SegmentedControl
      aria-label="Run mode"
      value={runIt ? "run" : "watch"}
      onValueChange={(v) => v && setRunItMode(v === "run")}
      // A click leaves no focus on the switch, so the arrow keys go on stepping the run (with a keyboard, Tab to it).
      onClick={(e) => {
        if (e.detail > 0) (document.activeElement as HTMLElement | null)?.blur();
      }}
    >
      <SegmentedControlItem value="watch">Watch</SegmentedControlItem>
      <SegmentedControlItem value="run" disabled={!canRunIt(run)}>Run it</SegmentedControlItem>
    </SegmentedControl>
  );
}

const NEW_GRAPH_TOAST = "new-graph";

/** Asks the store for a fresh graph; while the learner's own graph is put aside behind fresh ones, offers it back on every press. */
function newGraph() {
  const store = useGraphStore.getState();
  const ownBehind = store.newRunItGraph(Math.floor(Math.random() * 2 ** 31));
  if (!ownBehind) {
    toast.dismiss(NEW_GRAPH_TOAST);
    return;
  }
  toast("Your graph is put aside for a new one", {
    id: NEW_GRAPH_TOAST,
    action: { label: "Bring it back", onClick: () => useGraphStore.getState().bringBackOwnGraph() },
  });
}

/**
 * Run it's part of the notebook, under the step's sentence: at the learner's turn, the question and
 * what the last pick said (why it is not the one; after two tries a clue, the algorithm's rule, and
 * after three a hint naming the valid picks); between turns, what the last good pick said. With a
 * keyboard, the graph's nodes can be picked from a row of keys that shows once it has focus.
 * Bellman-Ford's turn is a Yes / No question about an edge, with Skip; what the answer got back shows
 * on the step that shows the answer only, so the run's later sentences never sit beside it.
 */
function Turn({ run, index, runIt, nodes }: { run: Run; index: number; runIt: RunItState; nodes: GraphNode[] }) {
  const pickNode = useGraphStore((s) => s.pickNode);
  const answer = useGraphStore((s) => s.answerQuestion);
  const yesNo = asksYesNo(run);
  const restart = useGraphStore((s) => s.restartRunIt);
  const playing = useGraphStore(selectIsPlaying);
  const { turn, said: last, tries } = runIt;
  const waiting = turn !== null && index === turn.limit;
  // What the last pick said shows from the step it was said at on, never on the steps before it;
  // Bellman-Ford's reply only on that step, then gives way to the run's sentences.
  const said = last && (yesNo ? index === last.at : index >= last.at) && !(yesNo && waiting) ? last : null;
  const end = run.ends.length - 1;
  const how = waiting ? (yesNo ? "" : "Click it on the graph")
    : turn !== null ? (playing ? "Playing on to your turn" : `Your turn comes at step ${turn.limit + 1}`)
    : index === end ? (yesNo ? "That's the whole run" : last ? "That's the whole run, picked your way" : "Nothing is left to pick in this run")
    // Bellman-Ford on a graph with no edge check worth asking about says so from the start.
    : yesNo && edgeQuestions(run.algorithmId, run.events).length === 0 ? "Nothing to ask on this graph — watch it play"
    : playing ? "Playing on to the end" : "";
  const decision = turn && !yesNo ? (run.events[turn.event] as DecideEvent) : null;
  const asked = turn && yesNo ? edgeQuestions(run.algorithmId, run.events)[turn.decision] : null;
  const keys = [...nodes].sort((a, b) => nameOf(nodes, a.id).localeCompare(nameOf(nodes, b.id), undefined, { numeric: true }));
  return (
    <section className="nb-turn" aria-label="Your turn" data-waiting={waiting || undefined}>
      <div aria-live="polite" className="nb-turn-words">
        {said?.tone === "yes" && <p className="nb-turn-yes">{named(nodes, said.text)}</p>}
        {said?.tone === "note" && <p className="nb-turn-miss">{named(nodes, said.text)}</p>}
        {waiting && asked && <p className="nb-turn-ask">{named(nodes, edgeQuestion(asked, run.events))}</p>}
        {waiting && decision && (
          <p className="nb-turn-ask">{named(nodes, question(run.algorithmId, decision, frameAt(run.events, turn.event)))}</p>
        )}
        {waiting && said?.tone === "miss" && <p className="nb-turn-miss">{named(nodes, said.text)}</p>}
        {waiting && decision && tries >= 2 && (
          <p className="nb-turn-hint">
            {named(nodes, tries === 2 ? clue(run.algorithmId, decision, frameAt(run.events, turn.event)) : hint(run.algorithmId, decision))}
          </p>
        )}
      </div>
      {waiting && decision && (
        <div className="nb-pick" role="group" aria-label="Pick a node">
          {keys.map((node) => (
            <button key={node.id} type="button" className="nb-pick-key" onClick={() => pickNode(node.id)}>
              {nameOf(nodes, node.id)}
            </button>
          ))}
        </div>
      )}
      <div className="nb-turn-foot">
        {waiting && asked ? (
          <div className="nb-answer" role="group" aria-label="Your answer">
            <Button size="sm" onClick={() => answer(true)}>Yes</Button>
            <Button size="sm" onClick={() => answer(false)}>No</Button>
          </div>
        ) : <p className="nb-turn-how">{how}</p>}
        <div className="nb-turn-keys">
          {waiting && asked && <Button variant="ghost" size="sm" onClick={() => answer(null)}>Skip</Button>}
          <Button variant="ghost" size="sm" onClick={restart}>Start over</Button>
          {/* Fresh practice graphs are made for the algorithms with choices to pick. */}
          {!yesNo && <Button variant="ghost" size="sm" onClick={newGraph}>New graph</Button>}
        </div>
      </div>
    </section>
  );
}

const SHARE_TOAST = "share-step";

/** Why the step on screen has no link, in the learner's words. */
function noLinkWords(why: NoLink): string {
  switch (why.none) {
    case "size": return "This graph is too big for a link — a link holds up to 40 nodes and 200 edges";
    case "names": return `This graph can't fit in a link — rename ${why.name} without , ; or |`;
    case "same-name": return `This graph can't fit in a link — two nodes go by ${why.name}, so rename one`;
    case "two-way": return `This graph can't fit in a link — ${why.name} and ${why.other} have an edge each way, so remove one`;
    case "graph": return "This graph can't fit in a link";
    case "picks": return "Your picks took this run another way, which a link can't carry";
  }
}

/**
 * Copy link: puts the link to the step on screen on the clipboard and says so, says why there is
 * none, or, when the clipboard refuses, shows the link selected in a field to copy by hand.
 */
function ShareStep({ run, index, runIt, side }: { run: Run; index: number; runIt: boolean; side: "top" | "bottom" }) {
  const [button, setButton] = useState<HTMLButtonElement | null>(null);
  const field = useRef<HTMLInputElement>(null);
  // The link to copy by hand, for the step it was made at: stepping on closes it.
  const [byHand, setByHand] = useState<{ url: string; run: Run; index: number } | null>(null);
  const open = byHand !== null && byHand.run === run && byHand.index === index;
  const share = async () => {
    const { nodes, edges, nodeCounter } = useGraphStore.getState().data;
    const link = linkToStep(run, index, { nodes, edges, nodeCounter });
    if (typeof link !== "string") {
      toast(noLinkWords(link), { id: SHARE_TOAST });
      return;
    }
    const url = new URL(link, window.location.origin).href;
    try {
      await navigator.clipboard.writeText(url);
      // Run it's picks stay here: the link opens this step to watch.
      toast(runIt ? "Link copied — it opens this step to watch" : "Link copied", { id: SHARE_TOAST });
    } catch {
      toast.dismiss(SHARE_TOAST);
      setByHand({ url, run, index });
    }
  };
  return (
    <Popover open={open} onOpenChange={(next) => !next && setByHand(null)}>
      <Tooltip>
        <TooltipTrigger
          render={<Button ref={setButton} variant="ghost" size="icon-sm" aria-label="Copy link to this step" onClick={share} />}
        >
          <Link aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent side={side}>Copy link to this step</TooltipContent>
      </Tooltip>
      <PopoverContent
        anchor={button}
        side={side}
        align="end"
        sideOffset={8}
        finalFocus={() => button}
        initialFocus={() => field.current}
        className="nb-share w-72"
      >
        <PopoverTitle>Copy this link</PopoverTitle>
        <Input
          ref={field}
          className="nb-share-link"
          readOnly
          value={byHand?.url ?? ""}
          aria-label="Link to this step"
          onFocus={(e) => e.currentTarget.select()}
        />
      </PopoverContent>
    </Popover>
  );
}

export interface NotebookProps {
  run: Run;
  /** The step on screen, 0 to N - 1. */
  index: number;
  desktop: boolean;
  /** Whether Run it is offered here (desktop and wide windows, not phones). */
  runItHere?: boolean;
  /** The step keys, in the head on desktop. */
  controls?: ReactNode;
  /** Whether Copy link is offered (the app's runs, on the graph in the store). */
  shareable?: boolean;
  onScrub: (index: number) => void;
}

export function Notebook({ run, index, desktop, runItHere = false, controls, shareable = false, onScrub }: NotebookProps) {
  const nodes = useGraphStore(useShallow((s) => s.data.nodes));
  const edges = useGraphStore((s) => s.data.edges);
  const page = useSettingsStore((s) => s.notebookPage);
  const setPage = useSettingsStore((s) => s.setNotebookPage);
  const storageForm = useSettingsStore((s) => s.storageForm);
  const setStorageForm = useSettingsStore((s) => s.setStorageForm);
  const storageLit = useMemo(() => storageAt(run, index), [run, index]);
  const adapter = algorithmRegistry.get(run.algorithmId);
  const narration = useMemo(() => narrate(run.events, run.algorithmId), [run]);
  const runIt = useGraphStore(selectRunIt);
  const allMoments = useMemo(() => keyMoments(run), [run]);
  // In Run it the run past the learner's turn is not decided yet: its moments are left off.
  const limit = runIt?.turn?.limit;
  const moments = limit === undefined ? allMoments : allMoments.filter((m) => m.index <= limit);
  const sentence = named(nodes, narration[index] ?? "");
  const lit = lineAt(run, index);

  return (
    <Panel className="nb" role="region" aria-label="Notebook">
      {desktop && (
        <header className="nb-head">
          <div className="nb-head-row">
            <span className="gs-label">{adapter?.metadata.name}</span>
            <div className="nb-head-keys">
              {shareable && <ShareStep run={run} index={index} runIt={runIt !== null} side="bottom" />}
              {runItHere && <ModeSwitch run={run} runIt={runIt} />}
            </div>
          </div>
          {controls}
        </header>
      )}
      <Narration text={sentence} />
      {runItHere && runIt && <Turn run={run} index={index} runIt={runIt} nodes={nodes} />}
      <Tabs value={page} onValueChange={(v) => setPage(v as NotebookPage)} className="nb-tabs">
        <div className="nb-tabs-row">
          <TabsList aria-label="Notebook page">
            <TabsTab value="code">Code</TabsTab>
            <TabsTab value="state">State</TabsTab>
            <TabsTab value="storage">Storage</TabsTab>
          </TabsList>
          {/* On phones Copy link ends this row (the card has no head). */}
          {shareable && !desktop && <ShareStep run={run} index={index} runIt={runIt !== null} side="top" />}
        </div>
        <TabsPanel value="code" className="nb-page"><CodeList lines={adapter?.pseudocode ?? []} lit={lit} step={index} /></TabsPanel>
        <TabsPanel value="state" className="nb-page"><StateView run={run} index={index} nodes={nodes} /></TabsPanel>
        <TabsPanel value="storage" className="nb-page nb-storage">
          <StorageView
            nodes={nodes}
            edges={edges}
            form={storageForm}
            lit={storageLit}
            step={index}
            label={storageForm === "list" ? "Adjacency list" : "Adjacency matrix"}
            head={<StorageFormSwitch form={storageForm} onForm={setStorageForm} />}
          />
        </TabsPanel>
      </Tabs>
      <Scrubber index={index} total={run.ends.length} onScrub={onScrub} moments={moments} />
    </Panel>
  );
}
