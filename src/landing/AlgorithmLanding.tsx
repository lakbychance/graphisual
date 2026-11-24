import { useMemo } from "react";
import "@/algorithms";
import "./landing.css";
import type { LabGraph } from "./live/types";
import { Experiment } from "./Experiment";
import { appLink, type AlgorithmLandingProps } from "./helpers";
import { LiveGraph, type GraphBox } from "./LiveGraph";
import { COMPACT, OTHERS, pageGraph } from "./live/shared";
import { Caption, ChapterNav, CodeBlock, Grounds, Layers, QueueChips, SoundKey, SpecBlock, StepsList } from "./parts";
import { SoundProvider, useSound } from "./sound";
import { useStage, type Placement } from "./useStage";

export type { AlgorithmLandingProps } from "./helpers";

// Where the graph sits on the stage, as fractions of it: left on a wide stage, top on a tall one.
const AREA = { wide: { x: 0.07, y: 0.36, w: 0.46, h: 0.44 }, tall: { x: 0.08, y: 0.2, w: 0.84, h: 0.26 } };
// The page graph's own bounds, and its node radius in those units.
const BOUNDS = { x: 60, y: 60, w: 440, h: 180 };
const RADIUS = 22;
const percent = (value: number) => `${value * 100}%`;
const boxOf = (area: typeof AREA.wide): GraphBox => ({
  x: percent(area.x), y: percent(area.y), w: percent(area.w), h: percent(area.h), viewBox: `${BOUNDS.x} ${BOUNDS.y} ${BOUNDS.w} ${BOUNDS.h}`,
});

/** The same placement the percentages give, in pixels, once the stage has a size. */
function place(box: { w: number; h: number }, base: LabGraph): Placement {
  const area = box.w < 760 ? AREA.tall : AREA.wide;
  const scale = Math.min((area.w * box.w) / BOUNDS.w, (area.h * box.h) / BOUNDS.h);
  const left = area.x * box.w + (area.w * box.w - BOUNDS.w * scale) / 2;
  const top = area.y * box.h + (area.h * box.h - BOUNDS.h * scale) / 2;
  return { radius: RADIUS * scale, graph: { ...base, nodes: base.nodes.map((n) => ({ ...n, x: left + (n.x - BOUNDS.x) * scale, y: top + (n.y - BOUNDS.y) * scale })) } };
}

const LABEL = "The graph this page is about. Scroll to run the algorithm on it.";

function Page({ subtitle, howItWorks, useCases, faq, live }: AlgorithmLandingProps) {
  const content = { subtitle, howItWorks, useCases, faq, live };
  const sound = useSound();
  const base = useMemo(() => pageGraph(live, COMPACT), [live]);
  const s = useStage({ content, base, place });
  // Once the visitor has rearranged the graph, the links carry their version of it.
  const open = useMemo(() => appLink(live.algorithmId, s.edited ? s.graph : base), [live.algorithmId, s.edited, s.graph, base]);
  const headline = <><span>{live.headline[0]}</span> <span>{live.headline[1]}</span></>;
  const table = live.limits.table;
  const { chapter, unlocked, wiping } = s.view;

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

      {/*
        One graph stays pinned while this track scrolls past. Scrolling is time: it runs the
        algorithm, and a seam sweeps the page from paper to graphite to blueprint around the
        graph. At the end the graph unlocks and becomes the visitor's.
      */}
      <div className="lp-track" ref={s.track} id="how">
        <section className="lp-stage" ref={s.stage} aria-label={`${live.headline.join(" ")}: scroll to run it`}>
          <Grounds />
          <h1 className="lp-h1" data-material="paper">{headline}</h1>
          <div className="lp-h1" data-material="graphite" aria-hidden="true">{headline}</div>
          <div className="lp-h1" data-material="blueprint" aria-hidden="true">{headline}</div>

          {s.size ? <Layers s={s} content={content} label={LABEL} /> : (
            // Prerendered markup, before the stage has been measured: the graph is placed by
            // percentages, for both stage shapes, and CSS shows the one that fits.
            <>
              <LiveGraph layout="wide" graph={base} frame={s.frame} box={boxOf(AREA.wide)} radius={RADIUS} material="paper" label={LABEL} showDistances={live.ledger === "distance"} showWeights={live.weighted} />
              <LiveGraph layout="tall" graph={base} frame={s.frame} box={boxOf(AREA.tall)} radius={RADIUS} material="paper" label={LABEL} showDistances={live.ledger === "distance"} showWeights={live.weighted} />
            </>
          )}

          <div className={`lp-panel lp-${chapter}`} data-hidden={wiping ? "" : undefined} data-opening={s.opening ? "" : undefined}>
            {chapter === "blueprint" && !unlocked && <SpecBlock content={content} />}
            {(chapter !== "graphite" || unlocked) && <Caption content={content} s={s} />}
            {unlocked ? <a className="lp-key" data-tone="amber" href={open} onPointerDown={() => sound.play("blueprint", "down")}>Open this graph in the visualizer</a>
              : chapter === "paper" ? <StepsList content={content} s={s} />
              : chapter === "graphite" ? <><CodeBlock content={content} s={s} /><QueueChips frame={s.frame} graph={s.graph} /></>
              : null}
          </div>
          <ChapterNav s={s} />
        </section>
      </div>

      <section className="lp-blueprint lp-band" id="limits">
        <div className="lp-wrap">
          <h2>{live.limits.heading}</h2>
          <Experiment content={content} />
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
                <details key={item.question} open={i === 0} onToggle={() => sound.play("paper", "tick")}>
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
            <a className="lp-key" data-tone="amber" data-size="lg" href={open} onPointerDown={() => sound.play("graphite", "down")}>Open the visualizer</a>
          </div>
          <h3 className="lp-others-title">More algorithms to watch</h3>
          <div className="lp-others">
            {OTHERS.map((other) => (other.id === live.algorithmId
              ? <div key={other.id} aria-current="page"><b>{other.name}</b><span>You are here</span></div>
              : <a key={other.id} href={`/algorithm/${other.id}`} onPointerDown={() => sound.play("graphite", "down")}><b>{other.name}</b><span>{other.why}</span></a>
            ))}
          </div>
          <footer className="lp-footer">
            <span>Graphisual</span>
            <span>Interactive graph editor and algorithm visualizer</span>
          </footer>
        </div>
      </section>

      <SoundKey />
    </div>
  );
}

/**
 * An algorithm's landing page, built as an instrument around one pinned stage.
 * It is prerendered, then hydrated: see the stage for how the markup stays correct
 * before the browser has measured anything.
 */
export function AlgorithmLanding(props: AlgorithmLandingProps) {
  return <SoundProvider><Page {...props} /></SoundProvider>;
}
