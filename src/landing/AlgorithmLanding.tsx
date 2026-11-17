import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { Pause, Play, Shuffle, StepBack, StepForward } from "lucide-react";
import "@/algorithms";
import "./landing.css";
import { encodeGraphLink } from "@/utils/graph/graphLink";
import { formatDistance, messageParts, runAlgorithm, usePlayback, type Frame, type LabGraph, type Playback, type Run } from "./engine";
import { LiveGraph, type MaterialRegion } from "./LiveGraph";
import { COMPACT, OTHERS, pageGraph, scatterGraph, TALL, WIDE } from "./live/shared";
import type { LiveConfig, PhaseMap } from "./live/types";

export interface AlgorithmLandingProps {
  subtitle: string;
  howItWorks: { description: string[]; steps: string[] };
  /** Each as "Name — what it does". */
  useCases: { text: string }[];
  faq: { question: string; answer: string }[];
  live: LiveConfig;
}

type Layout = "wide" | "tall";
const NARROW = "(max-width: 760px)";

// The hero plate is split in thirds: across on wide screens, down on narrow ones.
const WIDE_REGIONS: MaterialRegion[] = [
  { name: "paper", x: 0, y: 0, w: 400, h: 600 }, { name: "graphite", x: 400, y: 0, w: 400, h: 600 }, { name: "blueprint", x: 800, y: 0, w: 400, h: 600 },
];
const TALL_REGIONS: MaterialRegion[] = [
  { name: "paper", x: 0, y: 0, w: 390, h: 214 }, { name: "graphite", x: 0, y: 214, w: 390, h: 213 }, { name: "blueprint", x: 0, y: 427, w: 390, h: 213 },
];

const QUEUE_NAMES: Record<string, string> = {
  "queue": "Queue", "stack": "Stack", "priority-queue": "Priority queue", "distances": "Distance just updated", "recursion-stack": "Recursion stack",
};

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

/** The app link that opens this exact graph with the page's algorithm selected. */
function appLink(algorithmId: string, graph: LabGraph): string {
  const indexOf = (id: number) => graph.nodes.findIndex((n) => n.id === id);
  const link = encodeGraphLink({
    nodes: graph.nodes.map((n) => ({ x: n.x, y: n.y, label: n.label })),
    edges: graph.edges.map((e) => ({ from: indexOf(e.from), to: indexOf(e.to), weight: e.weight, directed: Boolean(e.directed) })),
  });
  return `/?algorithm=${algorithmId}&graph=${encodeURIComponent(link)}`;
}

/** The outcome of a whole run, in a few words, for the control rail. */
function summary(live: LiveConfig, run: Run, graph: LabGraph): { text: string; strong: string } {
  const last = run.frames[run.frames.length - 1];
  if (live.kind === "route") {
    if (run.cost === null) return { text: "No route between them", strong: "" };
    return { text: run.pathLabels.join(" to "), strong: live.weighted ? `costs ${run.cost}` : plural(last.path.size, "edge") };
  }
  if (live.kind === "tree") return { text: `Spanning tree over ${plural(last.visited.size, "node")}`, strong: `weight ${treeWeight(last, graph)}` };
  if (live.kind === "cycle") return run.cycle ? { text: `Cycle through ${cycleNodes(last, graph)}`, strong: "found" } : { text: "No cycle in this graph", strong: "" };
  return { text: last.order.map((id) => nameOf(graph, id)).join(", "), strong: plural(last.order.length, "node") };
}

function Message({ frame, graph }: { frame: Frame; graph: LabGraph }) {
  return <>{messageParts(frame.message, graph).map((part, i) => (part.bold ? <b key={i}>{part.text}</b> : <span key={i}>{part.text}</span>))}</>;
}

function Transport({ playback }: { playback: Playback }) {
  return (
    <>
      <div className="lp-rail-keys">
        <button type="button" className="lp-key" data-size="icon" data-tone="amber" aria-label={playback.playing ? "Pause" : "Play"} onClick={playback.toggle}>
          {playback.playing ? <Pause /> : <Play />}
        </button>
        <button type="button" className="lp-key" data-size="icon" aria-label="Step back" disabled={playback.index === 0} onClick={() => playback.step(-1)}><StepBack /></button>
        <button type="button" className="lp-key" data-size="icon" aria-label="Step forward" disabled={playback.index === playback.last} onClick={() => playback.step(1)}><StepForward /></button>
      </div>
      <input
        className="lp-scrub" type="range" aria-label="Algorithm step" min={0} max={playback.last} step={1} value={playback.index}
        style={{ "--fill": `${(playback.index / Math.max(1, playback.last)) * 100}%` } as React.CSSProperties}
        onChange={(event) => playback.step(Number(event.target.value) - playback.index)}
      />
    </>
  );
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
 * An algorithm's landing page. One fixed design in three materials, one job each:
 * paper for reading, graphite for the running machine, blueprint for the specification.
 * It is prerendered, then hydrated: until the browser reports its width both hero
 * layouts are in the markup and CSS shows the right one.
 */
export function AlgorithmLanding({ subtitle, howItWorks, useCases, faq, live }: AlgorithmLandingProps) {
  const [layout, setLayout] = useState<Layout | null>(null);
  const [graph, setGraph] = useState(() => pageGraph(live, WIDE));
  const [intro, setIntro] = useState(true);
  const [docked, setDocked] = useState(false);
  const run = useMemo(() => runAlgorithm(live.algorithmId, graph), [live.algorithmId, graph]);
  const playback = usePlayback(run.frames.length, { ms: 950, hold: 3200, autoplay: false });
  const frame = frameAt(run, playback.index);
  // Before the layout is known, the tall hero shows the same run on its own layout.
  const tallPreview = useMemo(() => pageGraph(live, TALL), [live]);
  // The sections below replay the same run on a compact copy of the same graph.
  const compact = useMemo(() => ({ ...pageGraph(live, COMPACT), edges: graph.edges }), [live, graph.edges]);
  const open = useMemo(() => appLink(live.algorithmId, graph), [live.algorithmId, graph]);
  const outcome = useMemo(() => summary(live, run, graph), [live, run, graph]);
  const litSteps = lit(live.steps, frame);
  const litLines = lit(live.lines, frame);
  const rail = useRef<HTMLDivElement>(null);
  const machine = useRef<HTMLElement>(null);
  const tween = useRef(0);
  const clock = useRef(playback);
  clock.current = playback;

  // Pick the hero layout for this screen, and again if the screen changes shape.
  useEffect(() => {
    const query = window.matchMedia(NARROW);
    let current: Layout = "wide";
    const apply = () => {
      const next: Layout = query.matches ? "tall" : "wide";
      if (next !== current) { setGraph(pageGraph(live, next === "tall" ? TALL : WIDE)); clock.current.setIndex(0); }
      current = next;
      setLayout(next);
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [live]);

  // The run starts once the entrance has played, and not at all for reduced motion.
  useEffect(() => {
    const still = reducedMotion();
    const timer = window.setTimeout(() => { setIntro(false); if (!still) clock.current.restart(); }, still ? 0 : 1500);
    return () => { window.clearTimeout(timer); cancelAnimationFrame(tween.current); };
  }, []);

  // Nothing runs in a hidden tab.
  useEffect(() => {
    let paused = false;
    const onVisibility = () => {
      if (document.hidden && clock.current.playing) { paused = true; clock.current.toggle(); }
      else if (!document.hidden && paused) { paused = false; clock.current.toggle(); }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // A docked copy of the controls takes over once the rail has scrolled away, and
  // leaves again when the last section that follows the run has passed where it sits.
  useEffect(() => {
    let queued = 0;
    const update = () => {
      queued = 0;
      const top = rail.current?.getBoundingClientRect();
      const end = machine.current?.getBoundingClientRect();
      if (top && end) setDocked(top.bottom < 0 && end.bottom > window.innerHeight - 24);
    };
    const onScroll = () => { if (!queued) queued = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { cancelAnimationFrame(queued); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, []);

  const move = (id: number, x: number, y: number) => setGraph((g) => ({ ...g, nodes: g.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)) }));
  const bump = (edgeIndex: number) => {
    setGraph((g) => ({ ...g, edges: g.edges.map((e, i) => (i === edgeIndex ? { ...e, weight: (e.weight % 9) + 1 } : e)) }));
    playback.restart();
  };
  // A new graph: the nodes glide from where they are to where they are going.
  const newGraph = () => {
    const target = scatterGraph(layout === "tall", live);
    const from = graph.nodes;
    cancelAnimationFrame(tween.current);
    playback.restart();
    if (reducedMotion()) { setGraph(target); return; }
    const began = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - began) / 560);
      const eased = 1 - Math.pow(1 - k, 3);
      setGraph({ ...target, nodes: target.nodes.map((n, i) => ({ ...n, x: from[i].x + (n.x - from[i].x) * eased, y: from[i].y + (n.y - from[i].y) * eased })) });
      if (k < 1) tween.current = requestAnimationFrame(tick);
    };
    tween.current = requestAnimationFrame(tick);
  };

  const headline = <><span>{live.headline[0]}</span> <span>{live.headline[1]}</span></>;
  const label = `A graph being worked through by ${live.limits.here === "Directed" ? "cycle detection" : live.limits.here}, drawn across paper, graphite and blueprint`;
  const newGraphKey = <button type="button" className="lp-key lp-new" data-size="sm" onClick={newGraph}><Shuffle />New graph</button>;
  const others = OTHERS.filter((other) => other.id !== live.algorithmId);
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

      <section className="lp-plate" aria-label={`${live.headline.join(" ")}, running live`}>
        <div className="lp-ground" data-material="paper" />
        <div className="lp-ground" data-material="graphite" />
        <div className="lp-ground" data-material="blueprint" />
        <h1 className="lp-h1" data-material="paper">{headline}</h1>
        <div className="lp-h1" data-material="graphite" aria-hidden="true">{headline}</div>
        <div className="lp-h1" data-material="blueprint" aria-hidden="true">{headline}</div>
        {layout !== "tall" && (
          <LiveGraph
            key="wide" layout="wide" graph={graph} frame={frame} width={1200} height={600} radius={28} material={WIDE_REGIONS} label={label}
            showDistances={live.ledger === "distance"} showWeights={live.weighted} intro={intro}
            onMove={layout ? move : undefined} onWeight={layout && live.weighted ? bump : undefined}
          />
        )}
        {layout !== "wide" && (
          <LiveGraph
            key="tall" layout="tall" graph={layout ? graph : tallPreview} frame={frame} width={390} height={640} radius={19} material={TALL_REGIONS} label={label}
            showDistances={live.ledger === "distance"} showWeights={live.weighted} intro={intro}
            onMove={layout ? move : undefined} onWeight={layout && live.weighted ? bump : undefined}
          />
        )}
        {newGraphKey}
      </section>

      <div className="lp-rail lp-graphite" ref={rail}>
        <div className="lp-wrap lp-rail-row">
          <Transport playback={playback} />
          <p className="lp-rail-message" aria-live="polite"><Message frame={frame} graph={graph} /></p>
          <p className="lp-rail-answer">{outcome.text} {outcome.strong && <b>{outcome.strong}</b>}</p>
          {newGraphKey}
        </div>
      </div>

      <section className="lp-paper lp-band" data-tight="">
        <div className="lp-wrap lp-intro">
          <p className="lp-lede">{subtitle}</p>
          <div className="lp-intro-side">
            <p>
              The graph above is live. Drag a node across the page{live.weighted ? " or click a weight to change it" : ""}, and it
              runs again. The button opens that same graph in the visualizer.
            </p>
            <a className="lp-key" data-tone="ink" href={open}>Open this graph in the visualizer</a>
          </div>
        </div>
      </section>

      <section className="lp-paper lp-band" id="how" data-ruled="">
        <div className="lp-wrap lp-split">
          <div className="lp-split-head">
            <h2>How it works</h2>
            {howItWorks.description.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
          <div>
            <ol className="lp-steps">
              {howItWorks.steps.map((step, i) => (
                <li key={step} data-active={litSteps.includes(i) ? "" : undefined}><span>{i + 1}</span>{step}</li>
              ))}
            </ol>
            <div className="lp-ledger" role="table" aria-label={live.ledger === "distance" ? "Best known distance to each node" : "The order each node was visited in"}>
              {graph.nodes.map((node) => {
                const value = live.ledger === "distance"
                  ? formatDistance(frame.dist.get(node.id))
                  : frame.order.includes(node.id) ? String(frame.order.indexOf(node.id) + 1) : "–";
                return (
                  <div key={node.id} role="row" data-settled={frame.visited.has(node.id) ? "" : undefined}>
                    <span role="rowheader">{node.label}</span>
                    {/* Keyed by value so a changed cell replays its tick. */}
                    <b role="cell" key={value}>{value}</b>
                  </div>
                );
              })}
            </div>
            <p className="lp-note">
              The lit steps and the {live.ledger === "distance" ? "distance table" : "visit order"} follow the graph at the top of the page.
            </p>
          </div>
        </div>
      </section>

      <section className="lp-graphite lp-band" ref={machine}>
        <div className="lp-wrap lp-machine">
          <div className="lp-machine-head">
            <h2>What the machine is doing</h2>
            <p>The same run, seen from the inside: the line being executed and the data it is reading from.</p>
          </div>
          <div className="lp-machine-graph">
            <LiveGraph
              graph={compact} frame={frame} width={560} height={300} radius={22} material="graphite" label="The same graph, in step with the code"
              showDistances={live.ledger === "distance"} showWeights={live.weighted}
            />
          </div>
          <pre className="lp-code" aria-label="Pseudocode">
            {live.pseudocode.map((line, i) => (
              <span key={line} data-active={litLines.includes(i) ? "" : undefined}><i>{i + 1}</i>{line}{"\n"}</span>
            ))}
          </pre>
          <div className="lp-queue">
            <h3>{QUEUE_NAMES[frame.queueKind ?? ""] ?? QUEUE_NAMES[run.frames[1]?.queueKind ?? ""] ?? "Queue"}</h3>
            <div className="lp-queue-items">
              {frame.processing && (
                <span className="lp-chip" data-now="" key={`now-${frame.processing.id}`}>
                  {nameOf(graph, frame.processing.id)}{frame.processing.value !== undefined && <b>{formatDistance(frame.processing.value)}</b>}
                </span>
              )}
              {frame.queue.map((item, i) => (
                <span key={`${item.id}-${i}`} className="lp-chip">
                  {nameOf(graph, item.id)}{item.value !== undefined && <b>{formatDistance(item.value)}</b>}
                </span>
              ))}
              {!frame.processing && frame.queue.length === 0 && <span className="lp-queue-empty">Empty</span>}
            </div>
          </div>
        </div>
      </section>

      <section className="lp-blueprint lp-band" id="limits">
        <div className="lp-wrap">
          <div className="lp-split">
            <div className="lp-split-head">
              <h2>{live.limits.heading}</h2>
            </div>
            <dl className="lp-specs">
              {live.specs.map((spec) => (
                <div key={spec.label}>
                  <dt>{spec.label}</dt>
                  <dd>{spec.value}</dd>
                  <dd className="lp-spec-note">{spec.note}</dd>
                </div>
              ))}
            </dl>
          </div>
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
          <div className="lp-split-head"><h2>Where it is used</h2></div>
          <ul className="lp-uses">
            {useCases.map((use) => {
              const [name, ...rest] = use.text.split(" — ");
              const detail = rest.join(" — ");
              return <li key={use.text}><b>{name}</b>{detail && <span>{detail.charAt(0).toUpperCase() + detail.slice(1)}.</span>}</li>;
            })}
          </ul>
        </div>
      </section>

      <section className="lp-paper lp-band" data-ruled="">
        <div className="lp-wrap lp-split">
          <div className="lp-split-head"><h2>Questions</h2></div>
          <div className="lp-faq">
            {faq.map((item, i) => (
              <details key={item.question} open={i === 0}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-graphite lp-band" id="more">
        <div className="lp-wrap">
          <div className="lp-close">
            <h2>See it on your own graph</h2>
            <a className="lp-key" data-tone="amber" data-size="lg" href={open}>Open the visualizer</a>
          </div>
          <h3 className="lp-others-title">Seven more algorithms to watch</h3>
          <div className="lp-others">
            {others.map((other) => (
              <a key={other.id} href={`/algorithm/${other.id}`}><b>{other.name}</b><span>{other.why}</span></a>
            ))}
          </div>
          <footer className="lp-footer">
            <span>Graphisual</span>
            <span>Interactive graph editor and algorithm visualizer</span>
          </footer>
        </div>
      </section>

      <div className="lp-dock" data-shown={docked ? "" : undefined}>
        <Transport playback={playback} />
        <p className="lp-dock-message"><Message frame={frame} graph={graph} /></p>
      </div>
    </div>
  );
}
