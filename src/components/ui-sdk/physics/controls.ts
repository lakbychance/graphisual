import { createVelocityTracker, rubberBand } from "@ui-sdk/core/gesture";
import { WebHaptics } from "web-haptics";
import { DISABLED, KEYS, LATCHES, MENU_ROWS, clearLean, leanKey } from "../press-physics";
import { playPressSound } from "../press-sound";
import { Body, drop, wake, type Sim, type Spring } from "./engine";
import { intensityOf, springOf } from "./material";

/**
 * Simulated motion for the gs-* controls inside one scope.
 *
 * `installControlPhysics(root)` marks `root` with `data-physics`. Inside it the
 * stylesheet (physics.css) stops animating the moving parts with transitions
 * and reads their position from custom properties that this file writes every
 * frame from the simulation in engine.ts:
 *
 *   key cap        --key-d     0 (up) … 1 (bottomed out)
 *   slider thumb   --thumb-dx  px between where the thumb is and where the value is
 *                              (while dragged it rides under the pointer, never more
 *                              than half a detent from its value; let go, it drops
 *                              into the notch)
 *   switch thumb   --sw-x      0 (off) … 1 (on)
 *                  --sw-s      0 (a circle) … 1 (stretched: held, or still travelling)
 *   indicator      --ind-d*    px between the sliding cap and its slot
 *   popup          --pop-p     0 (starting pose) … 1 (in place)
 *
 * A property is removed once its part has come to rest, so a control at rest
 * is styled by plain CSS exactly as it is outside the scope. ui-sdk still owns
 * every state and value; this layer only decides how a part gets there.
 *
 * Sounds are voiced in the same turn as the touch or key that caused them,
 * never from the simulation: a frame can be late, a sound must not be. How
 * hard the press landed sets how loud it is.
 */

const DENTS = ".gs-toggle, .gs-tab, .gs-segmented-item, .gs-checkbox";
const HELD_DOWN = "[data-pressed], [data-open]";
const POPUPS = ".gs-popover, .gs-menu, .gs-tooltip";
const TRAYS = ".gs-segmented, .gs-tabs-list";
const INDICATORS = ".gs-segmented-indicator, .gs-tabs-indicator";
const TRAY_ITEMS = ".gs-segmented-item, .gs-tab";

/** The finger: how fast it drives a cap down, and how far past the bottom it pushes. */
const FINGER_RESPONSE = 0.075;
const FINGER_REACH = 1.6;
/** The return spring is preloaded, so a released cap always knocks against its upstop. */
const PRELOAD = -0.04;
/** How far a thumb can be pulled past the end of its groove, in px at full intensity. */
const BAND = 12;
const TICK_GAP_MS = 28;
/** A slider thumb at full speed is this many px longer; full speed is this many px per second. */
const STRETCH = 6;
const STRETCH_SPEED = 600;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

interface Key {
  el: HTMLElement;
  body: Body;
  /** A real key (cap on a seat) rather than a latch that only dents. */
  isKey: boolean;
  material: Spring;
  held: boolean;
  bottomed: boolean;
  returning: boolean;
  strike: number;
}

interface Slide {
  slider: HTMLElement;
  control: HTMLElement;
  thumb: HTMLElement;
  track: HTMLElement;
  body: Body;
  /** Track length and the distance between two detents, in px. */
  width: number;
  detent: number;
  /** Where the value puts the thumb, in px along the track. */
  at: number;
  /** Where the pointer is holding the thumb, in px along the track; null when it is not held. */
  finger: number | null;
  /** Extra pull past an end stop while the pointer is beyond it. */
  band: number;
  /** How far the thumb is drawn out by its own speed, 0 … 1, and how much the theme lets it. */
  stretch: number;
  intensity: number;
  /** Stop watching the thumb. */
  stop: () => void;
}

interface Rect { l: number; t: number; w: number; h: number }
const SIDES = ["l", "t", "w", "h"] as const;

interface Toggle {
  el: HTMLElement;
  /** Where the thumb is along its housing, 0 … 1. */
  travel: Body;
  /** How far the thumb is stretched, 0 (a circle) … 1. */
  stretch: Body;
  held: boolean;
  moving: boolean;
  /** Which of the two bodies are still awake (bit 1 = travel, bit 2 = stretch). */
  awake: number;
  settle?: () => void;
}

/** A sliding cap (segmented / tabs indicator): four sprung values chasing the slot it belongs in. */
class Cap implements Sim {
  bodies: Record<(typeof SIDES)[number], Body>;
  slot: Rect;
  /** The offsets last written, so a fresh measurement can subtract them. */
  shown: Rect = { l: 0, t: 0, w: 0, h: 0 };
  constructor(private tray: HTMLElement, from: Rect, spring: Spring, private done: () => void) {
    this.slot = from;
    this.bodies = { l: new Body(from.l, 0.05), t: new Body(from.t, 0.05), w: new Body(from.w, 0.05), h: new Body(from.h, 0.05) };
    for (const side of SIDES) this.bodies[side].spring(spring);
  }
  moveTo(slot: Rect, spring: Spring): void {
    this.slot = slot;
    for (const side of SIDES) {
      this.bodies[side].spring(spring);
      this.bodies[side].target = slot[side];
    }
  }
  visual(): Rect {
    return { l: this.bodies.l.x, t: this.bodies.t.x, w: this.bodies.w.x, h: this.bodies.h.x };
  }
  step(dt: number): boolean {
    let moving = false;
    for (const side of SIDES) moving = this.bodies[side].step(dt) || moving;
    return moving;
  }
  render(): void {
    for (const side of SIDES) {
      this.shown[side] = this.bodies[side].x - this.slot[side];
      this.tray.style.setProperty(`--ind-d${side}`, `${this.shown[side].toFixed(2)}px`);
    }
  }
  rest(): void {
    for (const side of SIDES) this.tray.style.removeProperty(`--ind-d${side}`);
    this.done();
  }
}

let uninstall: (() => void) | null = null;

/**
 * Turn simulated control motion on or off for the whole document. The app
 * switches it on once at start-up; the theme playground uses this to compare
 * it against the plain transitions.
 */
export function setControlPhysicsEnabled(enabled: boolean): void {
  if (typeof document === "undefined") return;
  if (enabled && !uninstall) uninstall = installControlPhysics(document.body);
  else if (!enabled && uninstall) {
    uninstall();
    uninstall = null;
  }
}

export function installControlPhysics(root: HTMLElement): () => void {
  if (typeof window === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return () => {};
  root.setAttribute("data-physics", "");

  const keys = new Map<HTMLElement, Key>();
  const slides = new Map<HTMLElement, Slide>();
  const switches = new Map<HTMLElement, Toggle>();
  const caps = new Map<HTMLElement, Cap>();
  const pops = new Map<HTMLElement, Body>();
  /** Where each thumb / sliding cap was last seen at rest, to start its next move from. */
  const lastThumb = new WeakMap<HTMLElement, number>();
  const lastSlot = new WeakMap<HTMLElement, Rect>();

  let haptics: WebHaptics | null = null;
  let pressed: HTMLElement | null = null;
  let pressedStrike = 1;
  let heldSwitch: Toggle | null = null;
  let dragging: { slide: Slide; offset: number; intensity: number } | null = null;
  let lastTick = 0;
  let capFrame = 0;
  const movedTrays = new Map<HTMLElement, number>();

  /* ---------- how hard a press lands ---------- */
  // A mouse has no pressure, but a hand that flies in and clicks does hit harder
  // than one that was resting on the key, so the approach speed stands in for it.
  const vx = createVelocityTracker();
  const vy = createVelocityTracker();
  const strikeOf = (event: PointerEvent): number => {
    if (event.pointerType !== "mouse") {
      return event.pressure > 0 && event.pressure !== 0.5 ? 0.7 + 0.6 * event.pressure : 1;
    }
    const speed = Math.hypot(vx.velocity(event.timeStamp), vy.velocity(event.timeStamp));
    return clamp(0.85 + speed * 0.25, 0.85, 1.3);
  };

  /* ---------- keys and latches ---------- */
  const wantsDown = (key: Key) => key.held || (key.isKey && key.el.matches(HELD_DOWN));

  const letGo = (key: Key) => {
    key.returning = true;
    key.body.spring(key.material);
    key.body.target = PRELOAD;
    wake(key.body);
  };

  const keyOf = (el: HTMLElement, isKey: boolean, start: number): Key => {
    const existing = keys.get(el);
    if (existing) return existing;
    const body = new Body(start);
    body.min = 0;
    body.max = 1;
    const key: Key = { el, body, isKey, material: springOf(el, "key"), held: false, bottomed: start >= 1, returning: false, strike: 1 };
    body.onRender = () => el.style.setProperty("--key-d", body.x.toFixed(4));
    body.onImpact = (_speed, side) => {
      if (side === 1) {
        key.bottomed = true;
        if (!wantsDown(key)) letGo(key);
      } else {
        key.returning = false;
      }
    };
    body.onRest = () => {
      if (body.x > 0.5) return; // resting at the bottom: still held, keep its state
      el.style.removeProperty("--key-d");
      if (isKey) clearLean(el);
      keys.delete(el);
    };
    keys.set(el, key);
    return key;
  };

  const press = (el: HTMLElement, isKey: boolean, strike: number, hold: boolean) => {
    const key = keyOf(el, isKey, 0);
    key.material = springOf(el, "key");
    key.held = hold;
    key.returning = false;
    key.strike = strike;
    if (key.body.x >= 1) {
      // Already down (a trigger whose menu is open): the finger lands on a cap that cannot travel.
      key.bottomed = true;
      if (!wantsDown(key)) letGo(key);
      return;
    }
    key.bottomed = false;
    key.body.spring({ response: FINGER_RESPONSE / strike, damping: 1, bounce: key.material.bounce });
    key.body.target = FINGER_REACH;
    key.body.render();
    wake(key.body);
  };

  const release = (el: HTMLElement) => {
    const key = keys.get(el);
    if (!key) return;
    key.held = false;
    // A quick tap is let go before the cap has landed: it still bottoms out, then returns.
    if (key.bottomed && !wantsDown(key)) letGo(key);
  };

  /* ---------- slider ---------- */
  const partsOf = (slider: HTMLElement) => {
    if (slider.getAttribute("data-orientation") === "vertical") return null;
    const control = slider.querySelector<HTMLElement>(".gs-slider-control");
    const track = slider.querySelector<HTMLElement>(".gs-slider-track");
    const thumb = slider.querySelector<HTMLElement>(".gs-slider-thumb");
    const input = slider.querySelector<HTMLInputElement>('input[type="range"]');
    return control && track && thumb && input ? { control, track, thumb, input } : null;
  };
  /** Where ui-sdk has the thumb right now: read from what it rendered, so the two can never disagree. */
  const valueAt = (thumb: HTMLElement, width: number, fallback: number): number => {
    const percent = parseFloat(thumb.style.getPropertyValue("--slider-thumb-position"));
    return Number.isFinite(percent) ? (percent / 100) * width : fallback;
  };

  const retarget = (slide: Slide) => {
    slide.at = valueAt(slide.thumb, slide.width, slide.at);
    if (slide.finger === null) {
      slide.body.target = slide.at;
      return;
    }
    // Held: the thumb stays under the finger, but never strays more than half a detent from its value.
    const reach = slide.detent / 2 + 2;
    const held = clamp(clamp(slide.finger, 0, slide.width), slide.at - reach, slide.at + reach);
    slide.body.target = held + slide.band;
  };

  const slideOf = (slider: HTMLElement): Slide | null => {
    const parts = partsOf(slider);
    if (!parts) return null;
    const { control, track, thumb, input } = parts;
    const existing = slides.get(control);
    if (existing) return existing;
    const width = track.clientWidth;
    const min = Number(input.min) || 0;
    const max = Number(input.max) || 100;
    const fraction = max > min ? (Number(input.value) - min) / (max - min) : 0;
    const at = valueAt(thumb, width, fraction * width);
    const body = new Body(lastThumb.get(control) ?? at, 0.05).spring(springOf(slider, "slide"));
    const slide: Slide = {
      slider, control, thumb, track, body, width,
      detent: max > min ? ((Number(input.step) || 1) / (max - min)) * width : 0,
      at, finger: null, band: 0, stretch: 0, intensity: intensityOf(getComputedStyle(slider)), stop: () => {},
    };
    body.onRender = () => {
      retarget(slide);
      control.style.setProperty("--thumb-dx", `${(body.x - slide.at).toFixed(2)}px`);
      // Moving fast, the thumb draws out along its travel, and gathers itself again as it slows.
      // Under the finger its speed is the finger's; let go, its own.
      const speed = slide.finger !== null ? Math.abs(vx.velocity(performance.now())) * 1000 : Math.abs(body.v);
      slide.stretch += (Math.min(1, speed / STRETCH_SPEED) - slide.stretch) * 0.45;
      control.style.setProperty("--thumb-stretch", `${(slide.stretch * STRETCH * slide.intensity).toFixed(2)}px`);
    };
    // ui-sdk moves the thumb a whole detent at a time. The offset is corrected the
    // moment it does, before anything is painted, so the thumb never shows that jump.
    const moved = new MutationObserver(() => body.render());
    moved.observe(thumb, { attributes: true, attributeFilter: ["style"] });
    slide.stop = () => moved.disconnect();
    body.onRest = () => {
      slide.stretch = 0;
      control.style.removeProperty("--thumb-stretch");
      if (slide.finger !== null) return; // still held, possibly between two detents
      moved.disconnect();
      control.style.removeProperty("--thumb-dx");
      slides.delete(control);
    };
    slides.set(control, slide);
    return slide;
  };

  const aim = (event: PointerEvent) => {
    if (!dragging) return;
    const { slide, offset, intensity } = dragging;
    const x = event.clientX - slide.track.getBoundingClientRect().left - offset;
    const past = x < 0 ? x : x > slide.width ? x - slide.width : 0;
    slide.finger = x;
    slide.band = intensity > 0 ? Math.sign(past) * rubberBand(Math.abs(past), BAND * intensity) : 0;
    slide.body.render();
    wake(slide.body);
  };

  /* ---------- sliding caps (segmented control, tabs) ---------- */
  const indicatorOf = (tray: HTMLElement) => tray.querySelector<HTMLElement>(INDICATORS);
  const slotOf = (tray: HTMLElement, indicator: HTMLElement): Rect => {
    const shown = caps.get(tray)?.shown;
    return {
      l: indicator.offsetLeft - (shown?.l ?? 0),
      t: indicator.offsetTop - (shown?.t ?? 0),
      w: indicator.offsetWidth - (shown?.w ?? 0),
      h: indicator.offsetHeight - (shown?.h ?? 0),
    };
  };
  const remember = (tray: HTMLElement) => {
    const indicator = indicatorOf(tray);
    if (indicator && !caps.has(tray)) lastSlot.set(tray, slotOf(tray, indicator));
  };
  // ui-sdk measures the new slot after the selection changes, so look for it on
  // the next few frames; each look happens before that frame is painted.
  const followCaps = () => {
    capFrame = 0;
    for (const [tray, tries] of movedTrays) {
      const indicator = indicatorOf(tray);
      if (!indicator || !tray.isConnected) { movedTrays.delete(tray); continue; }
      const slot = slotOf(tray, indicator);
      const cap = caps.get(tray);
      const from = cap ? cap.slot : lastSlot.get(tray);
      const same = from && SIDES.every((side) => Math.abs(from[side] - slot[side]) < 0.5);
      if (!from || (same && tries <= 0)) { movedTrays.delete(tray); lastSlot.set(tray, slot); continue; }
      if (same) { movedTrays.set(tray, tries - 1); continue; }
      movedTrays.delete(tray);
      lastSlot.set(tray, slot);
      const spring = springOf(tray, "slide");
      const moving = cap ?? new Cap(tray, from, spring, () => caps.delete(tray));
      caps.set(tray, moving);
      moving.moveTo(slot, spring);
      moving.render();
      wake(moving);
    }
    if (movedTrays.size > 0) capFrame = requestAnimationFrame(followCaps);
  };

  /* ---------- switch ---------- */
  // Two masses: where the thumb is along its housing, and how far it is stretched.
  // It stretches under the finger, stays stretched while it travels, and only
  // draws back into a circle once it has arrived.
  const toggleOf = (el: HTMLElement, startOn: boolean): Toggle => {
    const existing = switches.get(el);
    if (existing) return existing;
    const travel = new Body(startOn ? 1 : 0);
    travel.min = 0;
    travel.max = 1;
    const stretch = new Body(0, 0.004);
    const toggle: Toggle = { el, travel, stretch, held: false, moving: false, awake: 0 };
    const settle = () => {
      if (toggle.held || toggle.moving || stretch.target === 0) return;
      stretch.target = 0;
      toggle.awake |= 2;
      wake(stretch);
    };
    const done = (bit: number) => {
      toggle.awake &= ~bit;
      if (toggle.awake !== 0 || toggle.held || stretch.target !== 0) return;
      el.style.removeProperty("--sw-x");
      el.style.removeProperty("--sw-s");
      switches.delete(el);
    };
    travel.onRender = () => {
      el.style.setProperty("--sw-x", travel.x.toFixed(4));
      // Arrived (within a hair of its end): let the stretch go.
      if (toggle.moving && Math.abs(travel.x - (travel.target > 0.5 ? 1 : 0)) < 0.06) {
        toggle.moving = false;
        settle();
      }
    };
    travel.onRest = () => {
      toggle.moving = false;
      settle();
      done(1);
    };
    stretch.onRender = () => el.style.setProperty("--sw-s", stretch.x.toFixed(4));
    stretch.onRest = () => done(2);
    toggle.settle = settle;
    switches.set(el, toggle);
    return toggle;
  };
  const stretchSwitch = (toggle: Toggle) => {
    const spring = springOf(toggle.el, "slide");
    toggle.stretch.spring({ ...spring, response: spring.response * 0.55, bounce: 0 });
    toggle.stretch.target = 1;
    toggle.awake |= 2;
    toggle.stretch.render();
    wake(toggle.stretch);
  };
  const holdSwitch = (el: HTMLElement) => {
    const toggle = toggleOf(el, el.hasAttribute("data-checked"));
    toggle.held = true;
    stretchSwitch(toggle);
    heldSwitch = toggle;
  };
  const throwSwitch = (el: HTMLElement) => {
    const on = el.hasAttribute("data-checked");
    const toggle = toggleOf(el, !on);
    toggle.moving = true;
    stretchSwitch(toggle);
    // Thrown past the end of the housing, so it arrives with speed and knocks against the stop.
    toggle.travel.spring(springOf(el, "slide"));
    toggle.travel.target = on ? 1.2 : -0.2;
    toggle.awake |= 1;
    toggle.travel.render();
    wake(toggle.travel);
  };

  /* ---------- popups ---------- */
  const popOf = (el: HTMLElement, start: number): Body => {
    const existing = pops.get(el);
    if (existing) return existing;
    const body = new Body(start, 0.002);
    body.onRender = () => {
      if (!el.isConnected) {
        drop(body);
        pops.delete(el);
        return;
      }
      el.style.setProperty("--pop-p", body.x.toFixed(4));
    };
    body.onRest = () => {
      if (body.target === 1) el.style.removeProperty("--pop-p");
      pops.delete(el);
    };
    pops.set(el, body);
    return body;
  };
  const openPopup = (el: HTMLElement) => {
    if (el.hasAttribute("data-instant")) return;
    const body = popOf(el, 0);
    body.spring(springOf(el, "popup"));
    body.target = 1;
    body.render();
    wake(body);
  };
  const closePopup = (el: HTMLElement) => {
    if (el.hasAttribute("data-instant")) return;
    const body = popOf(el, 1);
    // Leaving is quick and never rings: the plate is being taken away, not landing.
    body.spring({ response: 0.14, damping: 1, bounce: 0 });
    body.target = 0;
    wake(body);
  };

  /* ---------- events ---------- */
  const controller = new AbortController();
  const options = { capture: true, passive: true, signal: controller.signal } as const;

  root.addEventListener("pointermove", (event) => {
    vx.add(event.timeStamp, event.clientX);
    vy.add(event.timeStamp, event.clientY);
    aim(event);
  }, options);

  root.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const target = event.target as Element | null;
    if (!target?.closest) return;

    const tray = target.closest<HTMLElement>(TRAYS);
    if (tray) remember(tray);

    const slider = target.closest<HTMLElement>(".gs-slider");
    if (slider && !slider.matches(DISABLED)) {
      const held = partsOf(slider);
      if (held && !slides.has(held.control)) lastThumb.delete(held.control);
      const slide = slideOf(slider);
      if (slide) {
        // Grabbed by the thumb, it keeps the point it was grabbed at; pressed on the groove, it comes to the finger.
        const box = slide.thumb.getBoundingClientRect();
        const onThumb = slide.thumb.contains(target);
        dragging = { slide, offset: onThumb ? event.clientX - (box.left + box.width / 2) : 0, intensity: intensityOf(getComputedStyle(slider)) };
        // A little weight under the finger, and no ringing while it is held.
        slide.body.spring({ response: springOf(slider, "slide").response * 0.15, damping: 1, bounce: 0 });
        aim(event);
      }
    }

    const key = target.closest<HTMLElement>(KEYS);
    const latch = key ? null : target.closest<HTMLElement>(LATCHES);
    const control = key ?? latch;
    if (!control || control.matches(DISABLED)) return;

    const strike = strikeOf(event);
    if (event.pointerType === "touch" && WebHaptics.isSupported) {
      haptics ??= new WebHaptics();
      void haptics.trigger(key ? (strike > 1.1 ? "medium" : "light") : "selection");
    }
    if (key) {
      // Sound first, in the same turn as the touch: it must never wait on a frame or a layout.
      playPressSound(key, "down", strike);
      leanKey(key, event.clientX, event.clientY);
      press(key, true, strike, true);
      pressed = key;
      pressedStrike = strike;
    } else if (latch) {
      playPressSound(latch, "latch", strike);
      if (latch.matches(".gs-switch")) holdSwitch(latch);
      if (latch.matches(DENTS)) {
        press(latch, false, strike, true);
        pressed = latch;
      }
    }
  }, options);

  const lift = (event: PointerEvent) => {
    if (pressed) {
      if (pressed.matches(KEYS)) playPressSound(pressed, "up", pressedStrike * 0.9);
      release(pressed);
    }
    else if (event.type === "pointerup" && event.button === 0) {
      // A menu row is chosen on release, so that is when it sounds.
      const row = (event.target as Element | null)?.closest?.<HTMLElement>(MENU_ROWS);
      if (row && root.contains(row) && !row.matches(DISABLED)) playPressSound(row, "latch");
    }
    pressed = null;
    if (heldSwitch) {
      const toggle = heldSwitch;
      heldSwitch = null;
      toggle.held = false;
      // The click that follows throws the thumb; if none does (released elsewhere), it just relaxes.
      requestAnimationFrame(() => toggle.settle?.());
    }
    if (dragging) {
      // Let go: the thumb drops into the notch its value is at, in the theme's own spring.
      const { slide } = dragging;
      slide.finger = null;
      slide.band = 0;
      slide.body.spring(springOf(slide.slider, "slide"));
      retarget(slide);
      wake(slide.body);
      dragging = null;
    }
  };
  window.addEventListener("pointerup", lift, options);
  window.addEventListener("pointercancel", lift, options);

  root.addEventListener("keydown", (event) => {
    const target = event.target as Element | null;
    if (!target?.closest) return;
    const tray = target.closest<HTMLElement>(TRAYS);
    if (tray) remember(tray);
    const slider = target.closest<HTMLElement>(".gs-slider");
    if (slider) {
      const parts = partsOf(slider);
      if (parts && !slides.has(parts.control)) lastThumb.set(parts.control, valueAt(parts.thumb, parts.track.clientWidth, 0));
    }
    // Enter / Space operate a control from the keyboard: one straight press, not on auto-repeat.
    if (event.repeat || (event.key !== "Enter" && event.key !== " ")) return;
    const key = target.closest<HTMLElement>(KEYS);
    const control = key ?? target.closest<HTMLElement>(`${LATCHES}, ${MENU_ROWS}`);
    if (!control || control.matches(DISABLED)) return;
    if (key) {
      playPressSound(key, "down");
      clearLean(key);
      press(key, true, 1, false);
    } else {
      playPressSound(control, "latch");
      if (control.matches(DENTS)) press(control, false, 1, false);
    }
  }, options);

  // Each step of a slider is a detent, and clicks as the thumb passes it.
  root.addEventListener("input", (event) => {
    const slider = (event.target as Element | null)?.closest?.<HTMLElement>(".gs-slider");
    if (!slider || slider.matches(DISABLED)) return;
    const slide = slideOf(slider);
    let speed = 0;
    if (slide) {
      // Moved by a key, the thumb travels to the new detent at the theme's own pace.
      if (slide.finger === null) slide.body.spring(springOf(slider, "slide"));
      slide.body.render();
      wake(slide.body);
      lastThumb.delete(slide.control);
      speed = Math.abs(slide.body.v);
    }
    const now = performance.now();
    if (now - lastTick < TICK_GAP_MS) return;
    lastTick = now;
    // A slow pass over a detent clicks clearly; a fast drag blurs into a quieter purr.
    playPressSound(slider, "tick", clamp(1.05 - speed / 2500, 0.45, 1.05));
  }, options);

  /* ---------- state changes made by ui-sdk ---------- */
  const popupsIn = (node: Node): HTMLElement[] => {
    if (!(node instanceof HTMLElement)) return [];
    const found = [...node.querySelectorAll<HTMLElement>(POPUPS)];
    if (node.matches(POPUPS)) found.push(node);
    return found;
  };

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "childList") {
        for (const node of record.addedNodes) for (const popup of popupsIn(node)) openPopup(popup);
        continue;
      }
      const el = record.target as HTMLElement;
      const name = record.attributeName!;
      const has = el.hasAttribute(name);
      if (name === "data-ending-style" || name === "data-starting-style") {
        if (!el.matches(POPUPS)) continue;
        if (name === "data-ending-style") {
          if (has) closePopup(el);
          else if (el.isConnected) openPopup(el);
        } else if (has && !pops.has(el)) openPopup(el);
      } else if (name === "data-checked" || name === "data-selected") {
        if (el.matches(".gs-switch")) throwSwitch(el);
        else if (has && el.matches(TRAY_ITEMS)) {
          const tray = el.closest<HTMLElement>(TRAYS);
          if (tray) {
            movedTrays.set(tray, 6);
            capFrame ||= requestAnimationFrame(followCaps);
          }
        }
      } else if (el.matches(KEYS) && !el.matches(DISABLED)) {
        // data-open / data-pressed hold a key down without a finger on it (an open menu's trigger).
        const key = keys.get(el);
        if (has) {
          if (!key) press(el, true, 1, false);
        } else if (key) {
          if (key.bottomed && !wantsDown(key)) letGo(key);
        } else {
          letGo(keyOf(el, true, 1));
        }
      }
    }
  });
  observer.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["data-checked", "data-selected", "data-open", "data-pressed", "data-starting-style", "data-ending-style"],
  });

  return () => {
    controller.abort();
    observer.disconnect();
    cancelAnimationFrame(capFrame);
    for (const key of keys.values()) { drop(key.body); key.el.style.removeProperty("--key-d"); }
    for (const slide of slides.values()) { drop(slide.body); slide.stop(); slide.control.style.removeProperty("--thumb-dx"); slide.control.style.removeProperty("--thumb-stretch"); }
    for (const [el, toggle] of switches) { drop(toggle.travel); drop(toggle.stretch); el.style.removeProperty("--sw-x"); el.style.removeProperty("--sw-s"); }
    for (const [tray, cap] of caps) { drop(cap); for (const side of SIDES) tray.style.removeProperty(`--ind-d${side}`); }
    for (const [el, body] of pops) { drop(body); el.style.removeProperty("--pop-p"); }
    root.removeAttribute("data-physics");
  };
}
