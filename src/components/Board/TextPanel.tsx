/**
 * The graph as text, one edge per line (`edgeList.ts`), beside the canvas outside a run. Both stay in
 * step: typing redraws the canvas once the learner pauses (or leaves the text), and an edit on the
 * canvas rewrites the text. Each change the text makes is one step in the canvas's own undo history,
 * so Undo / Redo in the text undo and redo the graph. A line that does not read is named under the
 * text and marked beside it, and the canvas keeps the last graph that did read.
 *
 * A switch in the head shows the same graph as it is stored instead, an adjacency list or matrix
 * (`StorageView`), to read; the text comes back with the switch, and with every opening of the panel.
 */
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import {
  Button, Kbd, Panel, SegmentedControl, SegmentedControlItem, Textarea, Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui-sdk";
import { useGraphStore } from "../../store/graphStore";
import { useSettingsStore, type StorageForm } from "../../store/settingsStore";
import { followCanvas, MAX_TEXT, readEdgeList, textAfterCommit, textOf, whyNotWritable, type LineProblem, type TextState } from "../../utils/graph/edgeList";
import { isModKey } from "../../utils/keyboard";
import { StorageView } from "./StorageView";
import "./textPanel.css";

/** How long typing pauses before the canvas redraws, in milliseconds. */
const PAUSE = 500;

/** How many problems are named at once; the rest are counted. */
const SHOWN_PROBLEMS = 4;

/**
 * The middle of the canvas the learner can see, beside the panel (desktop) or between it and the
 * bottom toolbar (phones), as a point on the graph: new nodes are placed around it.
 */
function visibleMiddle(panel: HTMLElement | null) {
  const { zoom, pan } = useGraphStore.getState().viewport;
  const [width, height] = [window.innerWidth, window.innerHeight];
  const box = panel?.getBoundingClientRect();
  const toolbar = document.querySelector("[aria-label='Graph controls']")?.closest("[data-run-fit-avoid]")?.getBoundingClientRect();
  const beside = box !== undefined && box.left > width / 2;
  const [x, y] = beside || !box
    ? [(box?.left ?? width) / 2, height / 2]
    : [width / 2, (box.bottom + (toolbar && toolbar.top > box.bottom ? toolbar.top : height)) / 2];
  // Screen point (x, y) shows graph point ((x - width / 2) / zoom - pan.x, (y - height / 2) / zoom - pan.y).
  return { x: Math.round((x - width / 2) / zoom - pan.x), y: Math.round((y - height / 2) / zoom - pan.y) };
}

/** A message, its examples (in `backticks`) set as code that never breaks across lines. */
function Words({ text }: { text: string }) {
  return <span>{text.split("`").map((part, i) => (i % 2 === 1 ? <code key={i} className="tp-example">{part}</code> : part))}</span>;
}

interface TextPanelProps {
  /** Puts the caret in the text on opening (not on phones, where it would raise the keyboard over the canvas). */
  focusOnOpen: boolean;
  onClose: () => void;
}

export function TextPanel({ focusOnOpen, onClose }: TextPanelProps) {
  const nodes = useGraphStore((s) => s.data.nodes);
  const edges = useGraphStore((s) => s.data.edges);
  const [state, setState] = useState<TextState>(() => textOf(nodes, edges));
  // What the text last handed to the canvas got back: lines that do not read, and lines that read but may not say what was meant.
  const [said, setSaid] = useState<{ problems: LineProblem[]; hints: LineProblem[] }>({ problems: [], hints: [] });
  const { problems, hints } = said;
  // The canvas changed: the text follows it, keeping the learner's own wording while it still fits.
  const followed = followCanvas(state, nodes, edges);
  if (followed !== state) {
    setState(followed);
    if (followed.text !== state.text) setSaid({ problems: [], hints: [] });
  }
  const { text } = followed;
  const why = whyNotWritable(nodes);
  // The text, or the graph as stored (in the form the learner last chose, shared with the notebook).
  const [asText, setAsText] = useState(true);
  const storageForm = useSettingsStore((s) => s.storageForm);
  const setStorageForm = useSettingsStore((s) => s.setStorageForm);

  const panel = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const gutter = useRef<HTMLDivElement>(null);
  // The text typed since the canvas last took it, and the pause that hands it over.
  const typed = useRef<string | null>(null);
  const pause = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Hands what was typed to the canvas now: it redraws (one undo step), or the problems show. */
  const commit = () => {
    if (pause.current !== null) clearTimeout(pause.current);
    pause.current = null;
    const next = typed.current;
    typed.current = null;
    if (next === null) return;
    const store = useGraphStore.getState();
    const found = store.applyEdgeListText(next, visibleMiddle(panel.current));
    const { nodes: now, edges: nowEdges } = useGraphStore.getState().data;
    // The text now stands for the canvas as it is, so a change straight after (Undo) is seen as one.
    setState(textAfterCommit(next, now, nowEdges));
    setSaid({ problems: found, hints: readEdgeList(next).hints });
  };
  const commitRef = useRef(commit);
  useEffect(() => {
    commitRef.current = commit;
  });

  useEffect(() => {
    if (focusOnOpen) {
      const field = area.current;
      field?.focus();
      field?.setSelectionRange(field.value.length, field.value.length);
    }
    // Closing the panel hands over anything still typed.
    return () => commitRef.current();
  }, [focusOnOpen]);

  const change = (next: string) => {
    setState((s) => ({ ...s, text: next }));
    typed.current = next;
    if (pause.current !== null) clearTimeout(pause.current);
    pause.current = setTimeout(commit, PAUSE);
  };

  // Undo and Redo in the text step through the canvas's history (the text follows), not the field's own.
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const key = e.key.toLowerCase();
    if (e.key === "Escape") {
      e.preventDefault();
      commit();
      onClose();
    } else if (isModKey(e.nativeEvent) && (key === "z" || key === "y")) {
      e.preventDefault();
      commit();
      const store = useGraphStore.getState();
      if (key === "y" || e.shiftKey) store.redo();
      else store.undo();
      const { data } = useGraphStore.getState();
      setState((s) => followCanvas(s, data.nodes, data.edges));
    }
  };

  /** Selects line `line` of the text and scrolls it into view. */
  const goToLine = (line: number) => {
    const field = area.current;
    if (!field) return;
    const lines = field.value.split("\n");
    const start = lines.slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0);
    field.focus();
    field.setSelectionRange(start, start + (lines[line - 1]?.length ?? 0));
    const lineHeight = parseFloat(getComputedStyle(field).lineHeight) || 20;
    field.scrollTop = Math.max(0, (line - 1) * lineHeight - field.clientHeight / 3);
  };

  /** Shows the text, or the graph as stored, handing over anything still typed first. */
  const show = (view: "text" | StorageForm) => {
    if (view === "text") {
      setAsText(true);
      return;
    }
    commit();
    setAsText(false);
    setStorageForm(view);
  };

  const lineCount = text.split("\n").length;
  const wrong = new Set(problems.map((p) => p.line));
  const unsure = new Set(hints.map((p) => p.line));
  const named = problems.slice(0, SHOWN_PROBLEMS);

  return (
    <Panel
      ref={panel}
      className="tp"
      role="region"
      aria-labelledby="tp-title"
      // Esc closes the panel from the stored views too (the text handles its own).
      onKeyDown={(e) => {
        if (e.key === "Escape" && !asText) {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <header className="tp-head">
        <span className="gs-label" id="tp-title">Edge list</span>
        <SegmentedControl className="tp-views" aria-label="Show the graph as" value={asText ? "text" : storageForm} onValueChange={(v) => v && show(v as "text" | StorageForm)}>
          <SegmentedControlItem value="text">Text</SegmentedControlItem>
          <SegmentedControlItem value="list">List</SegmentedControlItem>
          <SegmentedControlItem value="matrix">Matrix</SegmentedControlItem>
        </SegmentedControl>
        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Close edge list" onClick={onClose} />}>
            <X aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent side="bottom">Close <Kbd>Esc</Kbd></TooltipContent>
        </Tooltip>
      </header>

      {asText ? (
        <>
          <dl className="tp-key" id="tp-key">
            <dt><code>A B 4</code></dt><dd>joins A and B both ways, weight 4</dd>
            <dt><code>A -&gt; B 4</code></dt><dd>one way, from A to B</dd>
            <dt><code>C</code></dt><dd>a node on its own</dd>
            <dd className="tp-key-note">No weight means 1 · <code>#</code> starts a note</dd>
            <dd className="tp-key-note">Edits on the canvas rewrite this text</dd>
          </dl>
          <p className="tp-key-line"><code>A B 4</code>two-way &nbsp;·&nbsp; <code>A -&gt; B</code>one-way</p>

          <div className="tp-editor" data-read-only={why ? "" : undefined}>
            <div className="tp-gutter" ref={gutter} aria-hidden="true">
              {Array.from({ length: lineCount }, (_, i) => (
                <span key={i} data-wrong={wrong.has(i + 1) ? "" : undefined} data-unsure={unsure.has(i + 1) ? "" : undefined}>{i + 1}</span>
              ))}
            </div>
            <Textarea
              ref={area}
              className="tp-text"
              aria-label="Edge list, one edge per line"
              aria-describedby={why || problems.length > 0 || hints.length > 0 ? "tp-key tp-problems" : "tp-key"}
              aria-invalid={problems.length > 0 || undefined}
              value={text}
              onValueChange={change}
              onBlur={commit}
              onKeyDown={onKeyDown}
              onScroll={(e) => {
                if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop;
              }}
              readOnly={why !== null}
              maxLength={MAX_TEXT}
              placeholder={"A B 4\nB -> C 2\nD"}
              wrap="off"
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
            />
          </div>

          <div id="tp-problems" className="tp-problems" aria-live="polite">
            {why ? (
              <p className="tp-why">{why[0].toUpperCase() + why.slice(1)}</p>
            ) : named.length > 0 ? (
              <ul>
                {named.map((p) => (
                  <li key={`${p.line}-${p.text}`}>
                    {p.line > 0 && <button type="button" className="tp-line" onClick={() => goToLine(p.line)}>Line {p.line}</button>}
                    <Words text={p.line > 0 ? p.text : p.text[0].toUpperCase() + p.text.slice(1)} />
                  </li>
                ))}
                {problems.length > SHOWN_PROBLEMS && <li className="tp-more">and {problems.length - SHOWN_PROBLEMS} more</li>}
                <li className="tp-more">The canvas keeps the last graph that read</li>
              </ul>
            ) : hints.length > 0 && (
              <ul>
                {hints.slice(0, SHOWN_PROBLEMS).map((p) => (
                  <li key={`${p.line}-${p.text}`}>
                    <button type="button" className="tp-line" data-tone="hint" onClick={() => goToLine(p.line)}>Line {p.line}</button>
                    <Words text={p.text} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        <StorageView nodes={nodes} edges={edges} form={storageForm} label={storageForm === "list" ? "Adjacency list" : "Adjacency matrix"} />
      )}
    </Panel>
  );
}
