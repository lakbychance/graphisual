/**
 * Press sounds for the gs-* controls.
 *
 * Every sound is synthesised with Web Audio; there are no audio files. A theme
 * picks its kit with the `--sound-kit` token (`paper`, `tungsten`, `blueprint`
 * or `none`), read from the control that was touched, so a nested skin scope
 * sounds like itself and themes cannot leak into each other.
 *
 *   paper      soft, dry taps: a fingertip on card stock
 *   tungsten   a damped mechanical click with a little body under it
 *   blueprint  a pen on the sheet: a hard tick, a short scratch for latches
 *
 * Four events are voiced: a key going down, a key coming back up, a latch
 * (toggle, tab, segment, switch, checkbox, menu row) and a slider detent.
 * The audio context is created on the first gesture, as browsers require.
 */

export type SoundEvent = "down" | "up" | "latch" | "tick";
type Kit = "paper" | "tungsten" | "blueprint";

const MASTER_GAIN = 0.32;

let enabled = true;
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;

export function setPressSoundEnabled(value: boolean): void {
  enabled = value;
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx?.state === "closed") ctx = null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor({ latencyHint: "interactive" });
    master = ctx.createGain();
    master.gain.value = MASTER_GAIN;
    master.connect(ctx.destination);
    // Half a second of white noise, reused by every burst.
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate / 2), ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

interface Burst {
  /** Filter type and centre / cutoff frequency in Hz. */
  filter: BiquadFilterType;
  freq: number;
  q?: number;
  /** Peak gain and decay time in seconds. */
  gain: number;
  decay: number;
  /** Start offset in seconds. */
  at?: number;
  /** Sweep the filter to this frequency over the decay. */
  sweepTo?: number;
}

interface Tone {
  type: OscillatorType;
  freq: number;
  /** Glide to this frequency over the decay. */
  to?: number;
  gain: number;
  decay: number;
  at?: number;
}

/** A shaped burst of filtered noise: the "material" part of a sound. */
function burst(ac: AudioContext, b: Burst): void {
  if (!master || !noise) return;
  const t = ac.currentTime + (b.at ?? 0);
  const src = ac.createBufferSource();
  src.buffer = noise;
  const filter = ac.createBiquadFilter();
  filter.type = b.filter;
  filter.frequency.setValueAtTime(b.freq, t);
  if (b.sweepTo) filter.frequency.exponentialRampToValueAtTime(b.sweepTo, t + b.decay);
  filter.Q.value = b.q ?? 0.8;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(b.gain, t + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + b.decay);
  src.connect(filter).connect(gain).connect(master);
  // Start somewhere different in the buffer each time so repeats are not identical.
  src.start(t, Math.random() * 0.3, b.decay + 0.02);
}

/** A short pitched blip: the "body" part of a sound. */
function tone(ac: AudioContext, o: Tone): void {
  if (!master) return;
  const t = ac.currentTime + (o.at ?? 0);
  const osc = ac.createOscillator();
  osc.type = o.type;
  osc.frequency.setValueAtTime(o.freq, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + o.decay);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(o.gain, t + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + o.decay);
  osc.connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + o.decay + 0.02);
}

const KITS: Record<Kit, Record<SoundEvent, (ac: AudioContext) => void>> = {
  // Card stock: no pitch, no ring. Just a soft dry tap, lower going down than coming up.
  paper: {
    down: (ac) => {
      burst(ac, { filter: "bandpass", freq: 1500, q: 0.7, gain: 0.5, decay: 0.035 });
      burst(ac, { filter: "lowpass", freq: 420, gain: 0.35, decay: 0.045 });
    },
    up: (ac) => burst(ac, { filter: "bandpass", freq: 2400, q: 0.8, gain: 0.22, decay: 0.025 }),
    // A slip of card being flicked over.
    latch: (ac) => {
      burst(ac, { filter: "bandpass", freq: 2600, sweepTo: 1300, q: 0.9, gain: 0.4, decay: 0.055 });
      burst(ac, { filter: "lowpass", freq: 380, gain: 0.25, decay: 0.04, at: 0.012 });
    },
    tick: (ac) => burst(ac, { filter: "bandpass", freq: 3200, q: 1.2, gain: 0.16, decay: 0.014 }),
  },
  // A damped key: a sharp contact click over a short low thump, and a lighter return.
  tungsten: {
    down: (ac) => {
      burst(ac, { filter: "highpass", freq: 3200, gain: 0.34, decay: 0.012 });
      tone(ac, { type: "sine", freq: 170, to: 95, gain: 0.5, decay: 0.05 });
    },
    up: (ac) => {
      burst(ac, { filter: "highpass", freq: 4200, gain: 0.18, decay: 0.009 });
      tone(ac, { type: "sine", freq: 240, to: 170, gain: 0.16, decay: 0.03 });
    },
    // A detent: two contacts a few milliseconds apart.
    latch: (ac) => {
      burst(ac, { filter: "bandpass", freq: 2800, q: 1.4, gain: 0.3, decay: 0.012 });
      burst(ac, { filter: "bandpass", freq: 3600, q: 1.4, gain: 0.34, decay: 0.014, at: 0.028 });
      tone(ac, { type: "sine", freq: 150, to: 100, gain: 0.3, decay: 0.04, at: 0.028 });
    },
    tick: (ac) => burst(ac, { filter: "bandpass", freq: 4200, q: 2, gain: 0.16, decay: 0.008 }),
  },
  // A pen on drafting film: a hard, slightly pitched tick; latches get a short stroke.
  blueprint: {
    down: (ac) => {
      tone(ac, { type: "triangle", freq: 1250, to: 820, gain: 0.3, decay: 0.028 });
      burst(ac, { filter: "bandpass", freq: 3800, q: 1.6, gain: 0.2, decay: 0.014 });
    },
    up: (ac) => tone(ac, { type: "triangle", freq: 1650, to: 1250, gain: 0.14, decay: 0.02 }),
    // One hatch stroke.
    latch: (ac) => {
      burst(ac, { filter: "bandpass", freq: 2600, sweepTo: 4600, q: 2.2, gain: 0.3, decay: 0.07 });
      tone(ac, { type: "triangle", freq: 1250, to: 900, gain: 0.16, decay: 0.022, at: 0.06 });
    },
    tick: (ac) => tone(ac, { type: "triangle", freq: 1900, to: 1500, gain: 0.12, decay: 0.012 }),
  },
};

const isKit = (value: string): value is Kit => value in KITS;

/** Play `event` in the kit of the theme `element` belongs to. */
export function playPressSound(element: Element, event: SoundEvent): void {
  if (!enabled) return;
  const kit = getComputedStyle(element).getPropertyValue("--sound-kit").trim();
  if (!isKit(kit)) return;
  const ac = audio();
  if (!ac) return;
  KITS[kit][event](ac);
}
