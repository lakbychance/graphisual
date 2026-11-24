import { Volume2, VolumeX } from "lucide-react";
import { Message, nameOf, outcome, type AlgorithmLandingProps } from "./helpers";
import { algorithmRegistry } from "@/algorithms";
import type { LabGraph } from "./live/types";
import { formatDistance, type Frame } from "./run";
import { LiveGraph } from "./LiveGraph";
import { useSound } from "./sound";
import type { StageState } from "./useStage";

/** The three grounds, the drafted lead ahead of the blueprint seam, and the two seam edges. */
export function Grounds() {
  return (
    <>
      <div className="lp-ground" data-material="graphite" />
      <div className="lp-ground" data-material="paper" />
      <div className="lp-ground" data-material="blueprint" />
      <div className="lp-draft-ground" aria-hidden="true" />
      <div className="lp-seam" data-seam="1" aria-hidden="true" />
      <div className="lp-seam" data-seam="2" aria-hidden="true" />
    </>
  );
}

/**
 * The graph, drawn once per material and clipped by the seams, plus the bare construction
 * lines that run ahead of the blueprint seam. Once unlocked it is a single blueprint drawing.
 */
export function Layers({ s, content, label }: { s: StageState; content: AlgorithmLandingProps; label: string }) {
  const { live } = content;
  if (!s.size) return null;
  const common = {
    graph: s.graph, width: s.size.w, height: s.size.h, radius: s.radius, label,
    showDistances: live.ledger === "distance", showWeights: live.weighted, onMove: s.onMove, onWeight: s.onWeight,
  };
  if (s.view.unlocked) return <div className="lp-layers"><LiveGraph {...common} frame={s.frame} material="blueprint" /></div>;
  return (
    <div className="lp-layers">
      {(["paper", "graphite", "blueprint"] as const).map((material) => (
        <div key={material} className="lp-layer" data-material={material}>
          <LiveGraph {...common} frame={s.frame} next={s.next} material={material} />
        </div>
      ))}
      <div className="lp-layer" data-draft="" aria-hidden="true">
        <LiveGraph graph={s.graph} frame={s.run.frames[0]} width={s.size.w} height={s.size.h} radius={s.radius} material="blueprint" label="" showWeights={false} />
      </div>
    </div>
  );
}

export function StepsList({ content, s }: { content: AlgorithmLandingProps; s: StageState }) {
  return (
    <ol className="lp-steps">
      {content.howItWorks.steps.map((step, i) => (
        <li key={step} data-active={!s.opening && s.litSteps.includes(i) ? "" : undefined}><span>{i + 1}</span>{step}</li>
      ))}
    </ol>
  );
}

/** The algorithm's own pseudocode (the one the app's events point at), with the step's line lit. */
export function CodeBlock({ content, s }: { content: AlgorithmLandingProps; s: StageState }) {
  const pseudocode = algorithmRegistry.get(content.live.algorithmId)?.pseudocode ?? [];
  return (
    <pre className="lp-code" aria-label="Pseudocode">
      {pseudocode.map((line, i) => (
        <span key={i} data-active={s.litLines.includes(i) ? "" : undefined}><i>{i + 1}</i>{line}{"\n"}</span>
      ))}
    </pre>
  );
}

export function QueueChips({ frame, graph }: { frame: Frame; graph: LabGraph }) {
  return (
    <div className="lp-queue-items">
      {frame.processing && (
        <span className="lp-chip" data-now="">{nameOf(graph, frame.processing.id)}{frame.processing.value !== undefined && <b>{formatDistance(frame.processing.value)}</b>}</span>
      )}
      {frame.queue.map((item, i) => (
        <span key={`${item.id}-${i}`} className="lp-chip">{nameOf(graph, item.id)}{item.value !== undefined && <b>{formatDistance(item.value)}</b>}</span>
      ))}
    </div>
  );
}

export function SpecBlock({ content }: { content: AlgorithmLandingProps }) {
  return (
    <dl className="lp-specs">
      {content.live.specs.map((spec) => (
        <div key={spec.label}><dt>{spec.label}</dt><dd>{spec.value}</dd><dd className="lp-spec-note">{spec.note}</dd></div>
      ))}
    </dl>
  );
}

/** What the stage is saying right now, whichever chapter it is in. */
export function Caption({ content, s }: { content: AlgorithmLandingProps; s: StageState }) {
  const { live } = content;
  if (s.view.unlocked) {
    return (
      <>
        <p className="lp-now"><b>It is yours now.</b> Drag a node{live.weighted ? " or click a weight" : ""}, and it solves again.</p>
        <p className="lp-yours">{outcome(live, s.run, s.graph)}</p>
      </>
    );
  }
  if (s.opening) return <><p className="lp-opening">{content.subtitle}</p><p className="lp-cue">Scroll to run it</p></>;
  if (s.view.chapter === "blueprint") return <p className="lp-now">{outcome(live, s.run, s.graph)} Keep scrolling and it is yours.</p>;
  return <p className="lp-now" aria-live="polite"><Message frame={s.frame} graph={s.graph} /></p>;
}

const CHAPTERS = [["paper", "The idea"], ["graphite", "The machine"], ["blueprint", "The spec"], ["yours", "Yours"]] as const;

/** Where the stage is, and a way to jump: each chapter name scrolls the page to its start. */
export function ChapterNav({ s }: { s: StageState }) {
  const active = s.view.unlocked ? "yours" : s.view.chapter;
  return (
    <nav className="lp-chapters" aria-label="Chapters">
      {CHAPTERS.map(([id, name]) => (
        <button key={id} type="button" aria-current={id === active ? "step" : undefined} onClick={() => s.goToChapter(id)}>{name}</button>
      ))}
      <i aria-hidden="true" />
    </nav>
  );
}

/** The page-wide sound switch. It stays on screen so the lower sections can be heard too. */
export function SoundKey() {
  const sound = useSound();
  return (
    <button type="button" className="lp-sound" aria-pressed={sound.on} onClick={sound.toggle}>
      {sound.on ? <Volume2 /> : <VolumeX />}{sound.on ? "Sound on" : "Sound off"}
    </button>
  );
}
