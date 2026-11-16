import type { Spring } from "./engine";

/**
 * A theme's physical material, read from its `--phys-*` tokens.
 *
 * Tokens are read from the element that was touched, the same way the sound
 * kit is, so a nested skin scope moves like itself. `--phys-intensity` scales
 * how much a material rings and bounces without changing how fast it responds:
 * 0 is dead (critically damped, no bounce), 1 is the theme as designed.
 */

export type Part = "key" | "slide" | "popup" | "edge" | "node";
export type EdgeModel = "thread" | "wire" | "pen";

const FALLBACK: Record<Part, Spring> = {
  key: { response: 0.11, damping: 0.8, bounce: 0.1 },
  slide: { response: 0.16, damping: 0.85, bounce: 0.1 },
  popup: { response: 0.22, damping: 0.85, bounce: 0 },
  edge: { response: 0.16, damping: 0.8, bounce: 0 },
  node: { response: 0.07, damping: 1, bounce: 0.2 },
};

const num = (style: CSSStyleDeclaration, name: string, fallback: number): number => {
  const value = parseFloat(style.getPropertyValue(name));
  return Number.isFinite(value) ? value : fallback;
};

export function intensityOf(style: CSSStyleDeclaration): number {
  return Math.max(0, Math.min(2, num(style, "--phys-intensity", 1)));
}

function scaled(spring: Spring, intensity: number): Spring {
  return {
    response: spring.response,
    damping: Math.max(0.2, Math.min(1, 1 - (1 - spring.damping) * intensity)),
    bounce: Math.max(0, Math.min(0.7, spring.bounce * intensity)),
  };
}

/** The spring a theme gives `part`, as seen from `element`. */
export function springOf(element: Element, part: Part): Spring {
  const style = getComputedStyle(element);
  const base = FALLBACK[part];
  return scaled(
    {
      response: num(style, `--phys-${part}-response`, base.response),
      damping: num(style, `--phys-${part}-damping`, base.damping),
      bounce: num(style, `--phys-${part}-bounce`, base.bounce),
    },
    intensityOf(style),
  );
}

export interface EdgeMaterial {
  model: EdgeModel;
  spring: Spring;
  /** Extra length of a thread over the straight distance (0.05 = 5% slack). */
  slack: number;
  /** Downward pull on a loose line, in px/s². */
  gravity: number;
  intensity: number;
}

export function edgeOf(element: Element): EdgeMaterial {
  const style = getComputedStyle(element);
  const model = style.getPropertyValue("--phys-edge").trim();
  const intensity = intensityOf(style);
  return {
    model: model === "thread" || model === "wire" ? model : "pen",
    spring: springOf(element, "edge"),
    slack: num(style, "--phys-edge-slack", 0) * intensity,
    gravity: num(style, "--phys-edge-gravity", 0) * intensity,
    intensity,
  };
}

/** How long a released node keeps sliding: the fraction of speed kept per millisecond (0 = stops dead). */
export function glideOf(element: Element): number {
  const style = getComputedStyle(element);
  const glide = num(style, "--phys-node-glide", 0);
  return intensityOf(style) === 0 ? 0 : Math.max(0, Math.min(0.998, glide));
}
