import { WebHaptics } from "web-haptics";
import { playPressSound } from "./press-sound";

/**
 * Press physics for the gs-* keys.
 *
 * A key is a fixed seat with a cap on top (see `.gs-button` in ui-sdk.css).
 * CSS drops the cap when the key is held. What CSS cannot know is *where* on
 * the cap the finger landed, so one delegated listener measures it and writes
 * three values on the pressed element:
 *
 *   --press-x   -1 (left edge) … 1 (right edge)
 *   --press-y   -1 (top edge)  … 1 (bottom edge)
 *   --key-skew  the angle that makes the pressed side sit `--key-lean` px
 *               lower than the far side, whatever the cap's width
 *
 * The cap leans by that angle, sinks a little further when pressed near its
 * front edge, and is shaded where the finger is. A theme sets `--key-lean`
 * (0 keeps the cap level). Keyboard presses clear the values, so Enter / Space
 * push the key straight down.
 *
 * Touch presses also fire a short haptic tick where the device supports it,
 * and every press, latch and slider detent is voiced by press-sound.ts in the
 * theme's own sound kit.
 */

const KEYS = ".gs-button, .gs-card-button, .gs-stepper-button";
const LATCHES = ".gs-toggle, .gs-tab, .gs-segmented-item, .gs-switch, .gs-checkbox";
const DISABLED = ':disabled, [data-disabled], [aria-disabled="true"]';
const MENU_ROWS = ".gs-menu-item";
/** Slider detents closer together than this are merged, so a fast drag purrs instead of buzzing. */
const TICK_GAP_MS = 28;

const PROPS = ["--press-x", "--press-y", "--key-skew"] as const;

const toDeg = (rad: number) => (rad * 180) / Math.PI;
const clamp = (n: number) => Math.max(-1, Math.min(1, n));
/** A press near the middle goes straight down; the lean ramps in toward the edges. */
const edge = (t: number) => (Math.abs(t) < 0.15 ? 0 : Math.sign(t) * ((Math.abs(t) - 0.15) / 0.85));

let installed = false;

export function installPressPhysics(root: Document = document): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  let haptics: WebHaptics | null = null;
  let held: HTMLElement | null = null;
  let sounding: HTMLElement | null = null;
  let lastTick = 0;

  const release = () => {
    if (!held) return;
    for (const prop of PROPS) held.style.removeProperty(prop);
    held = null;
  };

  root.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button !== 0) return;
      const target = event.target as Element | null;
      const key = target?.closest?.<HTMLElement>(KEYS);
      const control = key ?? target?.closest?.<HTMLElement>(LATCHES);
      if (!control || control.matches(DISABLED)) return;

      if (event.pointerType === "touch" && WebHaptics.isSupported) {
        haptics ??= new WebHaptics();
        void haptics.trigger(key ? "light" : "selection");
      }

      playPressSound(control, key ? "down" : "latch");
      sounding = key ?? null;

      if (!key) return;
      release();
      const rect = key.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = edge(clamp((event.clientX - rect.left) / (rect.width / 2) - 1));
      const y = edge(clamp((event.clientY - rect.top) / (rect.height / 2) - 1));
      const lean = parseFloat(getComputedStyle(key).getPropertyValue("--key-lean")) || 0;
      key.style.setProperty("--press-x", x.toFixed(3));
      key.style.setProperty("--press-y", y.toFixed(3));
      key.style.setProperty("--key-skew", `${toDeg(Math.atan((lean * x) / rect.width)).toFixed(3)}deg`);
      held = key;
    },
    { capture: true, passive: true },
  );

  // Let the release transition run from the leaned pose, then forget it.
  const settle = () => window.setTimeout(release, 220);
  root.addEventListener(
    "pointerup",
    (event) => {
      if (sounding) playPressSound(sounding, "up");
      else if (event.button === 0) {
        // A menu row is chosen on release, so that is when it sounds.
        const row = (event.target as Element | null)?.closest?.<HTMLElement>(MENU_ROWS);
        if (row && !row.matches(DISABLED)) playPressSound(row, "latch");
      }
      sounding = null;
      settle();
    },
    { capture: true, passive: true },
  );
  root.addEventListener(
    "pointercancel",
    () => {
      sounding = null;
      settle();
    },
    { capture: true, passive: true },
  );
  root.addEventListener(
    "keydown",
    (event) => {
      release();
      // Enter / Space operate a control from the keyboard: voice it once, not on auto-repeat.
      if (event.repeat || (event.key !== "Enter" && event.key !== " ")) return;
      const target = event.target as Element | null;
      const key = target?.closest?.<HTMLElement>(KEYS);
      const control = key ?? target?.closest?.<HTMLElement>(`${LATCHES}, ${MENU_ROWS}`);
      if (control && !control.matches(DISABLED)) playPressSound(control, key ? "down" : "latch");
    },
    { capture: true, passive: true },
  );
  // Each step of a slider is a detent, whether dragged or moved with the arrow keys.
  root.addEventListener(
    "input",
    (event) => {
      const slider = (event.target as Element | null)?.closest?.<HTMLElement>(".gs-slider");
      if (!slider || slider.matches(DISABLED)) return;
      const now = performance.now();
      if (now - lastTick < TICK_GAP_MS) return;
      lastTick = now;
      playPressSound(slider, "tick");
    },
    { capture: true, passive: true },
  );
}
