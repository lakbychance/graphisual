import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, StepBack, StepForward } from "lucide-react";
import { usePlayback } from "./playback";
import { runAlgorithm } from "./run";
import { verdict, type AlgorithmLandingProps, type Entry } from "./helpers";
import { LiveGraph } from "./LiveGraph";
import { useSound } from "./sound";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The page's experiment, as part of the instrument: it has its own keys (play, step back,
 * step forward), and each step and each verdict is voiced in the blueprint kit.
 */
export function Experiment({ content }: { content: AlgorithmLandingProps }) {
  const { live } = content;
  const experiment = live.limits.experiment;
  const sound = useSound();
  const block = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(experiment.initial);
  const entries: Entry[] = useMemo(() => {
    const base = experiment.graph(on);
    return experiment.runs.map((r) => {
      const graph = { ...base, start: r.start ?? base.start };
      return { name: r.name, graph, run: runAlgorithm(r.algorithmId, graph) };
    });
  }, [experiment, on]);
  const playback = usePlayback(Math.max(...entries.map((e) => e.run.frames.length)), { ms: 800, hold: 4200, autoplay: false });

  // Runs only while on screen. The clock object changes every tick, so it is held in a ref.
  const clock = useRef(playback);
  clock.current = playback;
  const visible = useRef(false);
  useEffect(() => {
    const el = block.current;
    if (!el || reducedMotion()) return;
    const observer = new IntersectionObserver(([entry]) => {
      visible.current = entry.isIntersecting;
      if (entry.isIntersecting !== clock.current.playing) clock.current.toggle();
    }, { threshold: 0.25 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { index, last } = playback;
  useEffect(() => {
    if (!visible.current || index === 0) return;
    sound.play("blueprint", index >= last ? "latch" : "tick");
  }, [index, last, sound]);

  return (
    <div className="lp-break" ref={block}>
      <div className="lp-break-intro">
        <h3>{experiment.title}</h3>
        <p>{experiment.text}</p>
        <button
          type="button" role="switch" aria-checked={on} className="lp-switch"
          onClick={() => { sound.play("blueprint", "latch"); setOn((value) => !value); playback.restart(); }}
        >
          <span className="lp-switch-track"><span className="lp-switch-thumb" /></span>
          {experiment.toggle}
        </button>
        <div className="lp-exp-keys" role="group" aria-label="Experiment playback">
          <button type="button" className="lp-key" data-size="icon" data-tone="amber" aria-label={playback.playing ? "Pause" : "Play"} onClick={() => { sound.play("blueprint", "down"); playback.toggle(); }}>
            {playback.playing ? <Pause /> : <Play />}
          </button>
          <button type="button" className="lp-key" data-size="icon" aria-label="Step back" disabled={index === 0} onClick={() => { sound.play("blueprint", "down"); playback.step(-1); }}><StepBack /></button>
          <button type="button" className="lp-key" data-size="icon" aria-label="Step forward" disabled={index === last} onClick={() => { sound.play("blueprint", "down"); playback.step(1); }}><StepForward /></button>
          <span className="lp-counter">{String(index).padStart(2, "0")}<small>/{String(last).padStart(2, "0")}</small></span>
        </div>
      </div>
      {entries.map((entry) => {
        const done = index >= entry.run.frames.length - 1;
        const result = verdict(live, entry, entries);
        return (
          <figure key={entry.name} className="lp-sheet" data-solo={entries.length === 1 ? "" : undefined}>
            <figcaption>{entry.name}</figcaption>
            <LiveGraph
              graph={entry.graph} frame={entry.run.frames[Math.min(index, entry.run.frames.length - 1)]} width={540} height={300} radius={22} material="blueprint"
              showWeights={experiment.weighted(on)} label={`${entry.name}: ${experiment.toggle}, ${on ? "on" : "off"}`}
            />
            <p className="lp-verdict" data-wrong={done && result.wrong ? "" : undefined}>{done ? result.node : "Running"}</p>
          </figure>
        );
      })}
    </div>
  );
}
