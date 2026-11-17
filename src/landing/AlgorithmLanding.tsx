import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import "@/algorithms";
import "./landing.css";
import { encodeGraphLink } from "@/utils/graph/graphLink";
import { formatDistance, messageParts, runAlgorithm, usePlayback, type Frame, type LabGraph, type Playback, type Run } from "./engine";
import { LiveGraph, type GraphBox, type MaterialRegion } from "./LiveGraph";
import { COMPACT, OTHERS, pageGraph } from "./live/shared";
import type { LiveConfig, PhaseMap } from "./live/types";

export interface AlgorithmLandingProps {
  subtitle: string;
  howItWorks: { description: string[]; steps: string[] };
  /** Each as "Name — what it does". */
  useCases: { text: string }[];
  faq: { question: string; answer: string }[];
  live: LiveConfig;
}

type Chapter = "paper" | "graphite" | "blueprint";
const CHAPTERS: Array<{ id: Chapter; name: string }> = [
  { id: "paper", name: "The idea" }, { id: "graphite", name: "The machine" }, { id: "blueprint", name: "The spec" },
];

// The pinned scroll, in fractions of its length: run, wipe to graphite, run again, wipe to blueprint.
const RUN_1: [number, number] = [0.05, 0.34];
const WIPE_1: [number, number] = [0.34, 0.43];
const RUN_2: [number, number] = [0.43, 0.73];
const WIPE_2: [number, number] = [0.73, 0.82];

// Where the graph sits on the stage, as fractions of it: left on a wide stage, top on a tall one.
const AREA = { wide: { x: 0.07, y: 0.36, w: 0.46, h: 0.44 }, tall: { x: 0.08, y: 0.2, w: 0.84, h: 0.26 } };
// The compact layout's own bounds, and the node radius in its units.
const BOUNDS = { x: 60, y: 60, w: 440, h: 180 };
const RADIUS = 22;
const percent = (value: number) => `${value * 100}%`;
const boxOf = (area: typeof AREA.wide): GraphBox => ({
  x: percent(area.x), y: percent(area.y), w: percent(area.w), h: percent(area.h), viewBox: `${BOUNDS.x} ${BOUNDS.y} ${BOUNDS.w} ${BOUNDS.h}`,
});

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const within = (p: number, [a, b]: [number, number]) => Math.max(0, Math.min(1, (p - a) / (b - a)));
const frameAt = (run: Run, index: number) => run.frames[Math.min(index, run.frames.length - 1)];
const nameOf = (graph: LabGraph, id: number) => graph.nodes.find((n) => n.id === id)?.label ?? String(id);
const treeWeight = (frame: Frame, graph: LabGraph) => [...frame.traversed].reduce((sum, i) => sum + graph.edges[i].weight, 0);
const cycleNodes = (frame: Frame, graph: LabGraph) => [...frame.pathNodes].map((id) => nameOf(graph, id)).sort().join(", ");
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** Which entries of a phase map a frame lights up. */
function lit(map: PhaseMap, frame: Frame): number[] {
  if (frame.phase === "ready") return map.ready;
  if (frame.phase === "answer") return map.answer;
  return /Found destination|Cycle detected/.test(frame.message) ? map.found : map.explore;
}

/** The app link that opens the page's graph with its algorithm selected. */
function appLink(algorithmId: string, graph: LabGraph): string {
  const indexOf = (id: number) => graph.nodes.findIndex((n) => n.id === id);
  const link = encodeGraphLink({
    nodes: graph.nodes.map((n) => ({ x: n.x, y: n.y, label: n.label })),
    edges: graph.edges.map((e) => ({ from: indexOf(e.from), to: indexOf(e.to), weight: e.weight, directed: Boolean(e.directed) })),
  });
  return `/?algorithm=${algorithmId}&graph=${encodeURIComponent(link)}`;
}

/** What the whole run came to, as a sentence for the last chapter. */
function outcome(live: LiveConfig, run: Run, graph: LabGraph): ReactNode {
  const last = run.frames[run.frames.length - 1];
  if (live.kind === "route") {
    if (run.cost === null) return <>There is no route between the two nodes.</>;
    const route = <b>{run.pathLabels.join(" to ")}</b>;
    return live.weighted ? <>The route is {route}, at cost <b>{run.cost}</b>.</> : <>The route is {route}, <b>{plural(last.path.size, "edge")}</b> long.</>;
  }
  if (live.kind === "tree") return <>The tree joins <b>{plural(last.visited.size, "node")}</b> with total weight <b>{treeWeight(last, graph)}</b>.</>;
  if (live.kind === "cycle") return run.cycle ? <>It found a cycle through <b>{cycleNodes(last, graph)}</b>.</> : <>There is no cycle in this graph.</>;
  return <>It visited <b>{last.order.map((id) => nameOf(graph, id)).join(", ")}</b>, in that order.</>;
}

function Message({ frame, graph }: { frame: Frame; graph: LabGraph }) {
  return <>{messageParts(frame.message, graph).map((part, i) => (part.bold ? <b key={i}>{part.text}</b> : <span key={i}>{part.text}</span>))}</>;
}

/** Plays a clock only while its section is on screen (and never for reduced motion). */
function usePlayWhileVisible(ref: RefObject<HTMLElement | null>, playback: Playback) {
  const live = useRef(playback);
  live.current = playback;
  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting !== live.current.playing) live.current.toggle();
    }, { threshold: 0.25 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
}

interface Entry { name: string; graph: LabGraph; run: Run }

/** What one run of the experiment came to, and whether that is a wrong answer. */
function verdict(live: LiveConfig, entry: Entry, entries: Entry[]): { node: ReactNode; wrong: boolean } {
  const { run, graph } = entry;
  const last = run.frames[run.frames.length - 1];
  if (live.kind === "traversal") return { node: <>Visits <b>{last.order.map((id) => nameOf(graph, id)).join(", ")}</b>.</>, wrong: false };
  if (live.kind === "cycle") {
    return run.cycle
      ? { node: <>Finds a cycle through <b>{cycleNodes(last, graph)}</b>.</>, wrong: false }
      : { node: <><b>No cycle.</b> Every path ends without returning to a node that is still being explored.</>, wrong: false };
  }
  if (live.kind === "tree") {
    const reached = last.visited.size;
    return reached === graph.nodes.length
      ? { node: <>Joins all {reached} nodes. <b>Total weight {treeWeight(last, graph)}.</b></>, wrong: false }
      : { node: <>Reaches <b>{reached} of {graph.nodes.length} nodes</b>, total weight {treeWeight(last, graph)}. The rest cannot be joined.</>, wrong: true };
  }
  const byEdges = live.limits.experiment.measure === "edges";
  const measure = (e: Entry) => (e.run.cost === null ? Infinity : byEdges ? e.run.frames[e.run.frames.length - 1].path.size : e.run.cost);
  const value = measure(entry);
  const best = Math.min(...entries.map(measure));
  if (value === Infinity) return { node: <>Finds no route.</>, wrong: false };
  const route = <b>{run.pathLabels.join(" to ")}</b>;
  if (byEdges) {
    return value > best
      ? { node: <>Returns {route}, {plural(value, "edge")}. A route with {best} exists.</>, wrong: true }
      : { node: <>Finds {route}, {plural(value, "edge")}, the shortest route.</>, wrong: false };
  }
  return value > best
    ? { node: <>Returns {route} at cost {value}. A route costing {best} exists.</>, wrong: true }
    : { node: <>Finds {route} at cost {value}, the cheapest route.</>, wrong: false };
}

/** The page's experiment: one switch, one or two runs on the same small graph. */
function ExperimentBlock({ live }: { live: LiveConfig }) {
  const experiment = live.limits.experiment;
  const [on, setOn] = useState(experiment.initial);
  const block = useRef<HTMLDivElement>(null);
  const entries: Entry[] = useMemo(() => {
    const base = experiment.graph(on);
    return experiment.runs.map((r) => {
      const graph = { ...base, start: r.start ?? base.start };
      return { name: r.name, graph, run: runAlgorithm(r.algorithmId, graph) };
    });
  }, [experiment, on]);
  const playback = usePlayback(Math.max(...entries.map((e) => e.run.frames.length)), { ms: 800, hold: 4200, autoplay: false });
  usePlayWhileVisible(block, playback);

  return (
    <div className="lp-break" ref={block}>
      <div className="lp-break-intro">
        <h3>{experiment.title}</h3>
        <p>{experiment.text}</p>
        <button
          type="button" role="switch" aria-checked={on} className="lp-switch"
          onClick={() => { setOn((value) => !value); playback.setIndex(0); }}
        >
          <span className="lp-switch-track"><span className="lp-switch-thumb" /></span>
          {experiment.toggle}
        </button>
      </div>
      {entries.map((entry) => {
        const done = playback.index >= entry.run.frames.length - 1;
        const result = verdict(live, entry, entries);
        return (
          <figure key={entry.name} className="lp-sheet" data-solo={entries.length === 1 ? "" : undefined}>
            <figcaption>{entry.name}</figcaption>
            <LiveGraph
              graph={entry.graph} frame={frameAt(entry.run, playback.index)} width={540} height={300} radius={22} material="blueprint"
              showWeights={experiment.weighted(on)} label={`${entry.name}: ${experiment.toggle}, ${on ? "on" : "off"}`}
            />
            <p className="lp-verdict" data-wrong={done && result.wrong ? "" : undefined}>{done ? result.node : "Running"}</p>
          </figure>
        );
      })}
    </div>
  );
}

/**
 * An algorithm's landing page, built around one stage: a single graph stays pinned
 * while the page scrolls. Scrolling is time. It runs the algorithm, and the page
 * changes material around the graph: paper for the idea, graphite for the machine,
 * blueprint for the specification.
 *
 * The page is prerendered, then hydrated. Until the stage has been measured the
 * graph is placed by percentages, for both stage shapes, so the markup alone is
 * laid out correctly; measuring it afterwards lets the material seam cut through
 * the drawing at exactly the pixel the page's ground changes.
 */
export function AlgorithmLanding({ subtitle, howItWorks, useCases, faq, live }: AlgorithmLandingProps) {
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let queued = 0;
    const update = () => {
      queued = 0;
      const el = track.current;
      const pinned = stage.current;
      if (!el || !pinned) return;
      const box = el.getBoundingClientRect();
      const top = Number.parseFloat(getComputedStyle(pinned).top) || 0;
      const travel = box.height - pinned.clientHeight;
      // Quantised so the stage re-renders a few hundred times over the whole scroll, not every pixel.
      setProgress(Math.round(Math.max(0, Math.min(1, (top - box.top) / travel)) * 400) / 400);
    };
    const onScroll = () => { if (!queued) queued = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { cancelAnimationFrame(queued); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, []);

  const base = useMemo(() => pageGraph(live, COMPACT), [live]);
  const run = useMemo(() => runAlgorithm(live.algorithmId, base), [live.algorithmId, base]);
  const open = useMemo(() => appLink(live.algorithmId, base), [live.algorithmId, base]);
  const lastFrame = run.frames.length - 1;

  // The same placement the percentages give, in pixels, once the stage has a size.
  const placed = useMemo(() => {
    if (!size) return null;
    const area = size.w < 760 ? AREA.tall : AREA.wide;
    const scale = Math.min((area.w * size.w) / BOUNDS.w, (area.h * size.h) / BOUNDS.h);
    const left = area.x * size.w + (area.w * size.w - BOUNDS.w * scale) / 2;
    const top = area.y * size.h + (area.h * size.h - BOUNDS.h * scale) / 2;
    return {
      radius: RADIUS * scale,
      graph: { ...base, nodes: base.nodes.map((n) => ({ ...n, x: left + (n.x - BOUNDS.x) * scale, y: top + (n.y - BOUNDS.y) * scale })) },
    };
  }, [base, size]);

  const wipe1 = within(progress, WIPE_1);
  const wipe2 = within(progress, WIPE_2);
  const chapter: Chapter = wipe2 > 0.5 ? "blueprint" : wipe1 > 0.5 ? "graphite" : "paper";
  const wiping = (wipe1 > 0 && wipe1 < 1) || (wipe2 > 0 && wipe2 < 1);
  const frameIndex = progress >= WIPE_2[0] ? lastFrame
    : progress >= RUN_2[0] ? Math.round(within(progress, RUN_2) * lastFrame)
    : progress >= WIPE_1[0] ? lastFrame
    : Math.round(within(progress, RUN_1) * lastFrame);
  const frame = run.frames[frameIndex];
  const opening = chapter === "paper" && frameIndex === 0;

  // Each new material enters from the left edge and pushes the last one off to the right.
  const regions: MaterialRegion[] = size ? [
    { name: "paper", x: wipe1 * size.w, y: 0, w: size.w * (1 - wipe1), h: size.h },
    { name: "graphite", x: wipe2 * size.w, y: 0, w: Math.max(0, size.w * (wipe1 - wipe2)), h: size.h },
    { name: "blueprint", x: 0, y: 0, w: wipe2 * size.w, h: size.h },
  ] : [];
  const clip = {
    paper: `inset(0 0 0 ${wipe1 * 100}%)`,
    graphite: `inset(0 ${(1 - wipe1) * 100}% 0 ${wipe2 * 100}%)`,
    blueprint: `inset(0 ${(1 - wipe2) * 100}% 0 0)`,
  };

  const litSteps = lit(live.steps, frame);
  const litLines = lit(live.lines, frame);
  const headline = <><span>{live.headline[0]}</span> <span>{live.headline[1]}</span></>;
  const label = "The graph this page is about. Scroll to run the algorithm on it.";
  const shared = { frame, label, showDistances: live.ledger === "distance", showWeights: live.weighted };
  const table = live.limits.table;

  return (
    <div className="lp">
      <header className="lp-paper">
        <nav className="lp-nav lp-wrap" aria-label="Site">
          <a href="/" className="lp-brand">
            <img src="https://ik.imagekit.io/lapstjup/graphisual/tr:w-256/logo.png" alt="" width={28} height={28} />
            Graphisual
          </a>
          <div className="lp-nav-links">
            <a href="#how">How it works</a>
            <a href="#limits">Limits</a>
            <a href="#more">Algorithms</a>
            <a className="lp-key" data-size="sm" href={open}>Open the visualizer</a>
          </div>
        </nav>
      </header>

      <div className="lp-track" ref={track} id="how">
        <section className="lp-stage" ref={stage} aria-label={`${live.headline.join(" ")}: scroll to run it`}>
          {/* Graphite fills the stage; paper and blueprint are clipped on top of it as the seams move. */}
          <div className="lp-ground" data-material="graphite" />
          <div className="lp-ground" data-material="paper" style={{ clipPath: clip.paper }} />
          <div className="lp-ground" data-material="blueprint" style={{ clipPath: clip.blueprint }} />
          <h1 className="lp-h1" data-material="paper" style={{ clipPath: clip.paper }}>{headline}</h1>
          <div className="lp-h1" data-material="graphite" aria-hidden="true" style={{ clipPath: clip.graphite }}>{headline}</div>
          <div className="lp-h1" data-material="blueprint" aria-hidden="true" style={{ clipPath: clip.blueprint }}>{headline}</div>

          {placed && size ? (
            <LiveGraph graph={placed.graph} width={size.w} height={size.h} radius={placed.radius} material={regions} {...shared} />
          ) : (
            <>
              <LiveGraph layout="wide" graph={base} box={boxOf(AREA.wide)} radius={RADIUS} material="paper" {...shared} />
              <LiveGraph layout="tall" graph={base} box={boxOf(AREA.tall)} radius={RADIUS} material="paper" {...shared} />
            </>
          )}

          <div className={`lp-panel lp-${chapter}`} data-hidden={wiping ? "" : undefined} data-opening={opening ? "" : undefined}>
            {chapter === "paper" && (
              <>
                {opening
                  ? <><p className="lp-opening">{subtitle}</p><p className="lp-cue">Scroll to run it</p></>
                  : <p className="lp-now" aria-live="polite"><Message frame={frame} graph={base} /></p>}
                <ol className="lp-steps">
                  {howItWorks.steps.map((step, i) => (
                    <li key={step} data-active={!opening && litSteps.includes(i) ? "" : undefined}><span>{i + 1}</span>{step}</li>
                  ))}
                </ol>
              </>
            )}
            {chapter === "graphite" && (
              <>
                <pre className="lp-code" aria-label="Pseudocode">
                  {live.pseudocode.map((line, i) => (
                    <span key={line} data-active={litLines.includes(i) ? "" : undefined}><i>{i + 1}</i>{line}{"\n"}</span>
                  ))}
                </pre>
                <div className="lp-queue-items">
                  {frame.processing && (
                    <span className="lp-chip" data-now="">
                      {nameOf(base, frame.processing.id)}{frame.processing.value !== undefined && <b>{formatDistance(frame.processing.value)}</b>}
                    </span>
                  )}
                  {frame.queue.map((item, i) => (
                    <span key={`${item.id}-${i}`} className="lp-chip">
                      {nameOf(base, item.id)}{item.value !== undefined && <b>{formatDistance(item.value)}</b>}
                    </span>
                  ))}
                </div>
              </>
            )}
            {chapter === "blueprint" && (
              <>
                <dl className="lp-specs">
                  {live.specs.map((spec) => (
                    <div key={spec.label}><dt>{spec.label}</dt><dd>{spec.value}</dd><dd className="lp-spec-note">{spec.note}</dd></div>
                  ))}
                </dl>
                <p className="lp-now">{outcome(live, run, base)} Keep scrolling to put it to the test.</p>
              </>
            )}
          </div>

          <div className="lp-chapters" aria-hidden="true">
            {CHAPTERS.map((c) => <span key={c.id} data-active={c.id === chapter ? "" : undefined}>{c.name}</span>)}
            <i style={{ width: `${progress * 100}%` }} />
          </div>
        </section>
      </div>

      <section className="lp-blueprint lp-band" id="limits">
        <div className="lp-wrap">
          <h2>{live.limits.heading}</h2>
          <ExperimentBlock live={live} />
          <h3 className="lp-table-title" id="lp-compare-title">{table.title}</h3>
          <div className="lp-table-scroll">
            <table className="lp-compare" aria-labelledby="lp-compare-title">
              <thead>
                <tr>{table.columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr>
              </thead>
              <tbody>
                {table.rows.map((row) => (
                  <tr key={row.name} data-here={row.name === live.limits.here ? "" : undefined}>
                    <th scope="row">{row.name}</th>
                    {row.cells.map((cell, i) => <td key={cell} className={i === table.mono ? "lp-mono" : undefined}>{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="lp-paper lp-band">
        <div className="lp-wrap lp-split">
          <div className="lp-split-side">
            <h2>Background</h2>
            <div className="lp-prose">
              {howItWorks.description.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
            <h3>Where it is used</h3>
            <ul className="lp-uses">
              {useCases.map((use) => {
                const [name, ...rest] = use.text.split(" — ");
                const detail = rest.join(" — ");
                return <li key={use.text}><b>{name}</b>{detail && <span>{detail.charAt(0).toUpperCase() + detail.slice(1)}.</span>}</li>;
              })}
            </ul>
          </div>
          <div className="lp-split-main">
            <h2>Questions</h2>
            <div className="lp-faq">
              {faq.map((item, i) => (
                <details key={item.question} open={i === 0}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="lp-graphite lp-band" id="more">
        <div className="lp-wrap">
          <div className="lp-close">
            <h2>See it on your own graph</h2>
            <a className="lp-key" data-tone="amber" data-size="lg" href={open}>Open the visualizer</a>
          </div>
          <h3 className="lp-others-title">More algorithms to watch</h3>
          <div className="lp-others">
            {OTHERS.map((other) => (other.id === live.algorithmId
              ? <div key={other.id} aria-current="page"><b>{other.name}</b><span>You are here</span></div>
              : <a key={other.id} href={`/algorithm/${other.id}`}><b>{other.name}</b><span>{other.why}</span></a>
            ))}
          </div>
          <footer className="lp-footer">
            <span>Graphisual</span>
            <span>Interactive graph editor and algorithm visualizer</span>
          </footer>
        </div>
      </section>
    </div>
  );
}
