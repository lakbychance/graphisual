/**
 * A small real-time physics loop for the gs-* controls.
 *
 * Nothing here is an animation curve. Every moving part is a mass on a
 * spring, stepped at a fixed rate; it can be pushed, re-targeted or hit a hard
 * stop at any moment and carries its velocity through. One `requestAnimationFrame`
 * loop steps whatever is awake and goes idle when everything has come to rest.
 */

/** Anything the loop can step. `step` returns false once it has come to rest. */
export interface Sim {
  step(dt: number): boolean;
  render(): void;
  /** Called once when the sim falls asleep. */
  rest?(): void;
}

/** Fixed step in seconds. Small enough that a stiff key spring stays stable. */
const STEP = 1 / 480;
/** A frame longer than this (a background tab) is not simulated in full. */
const MAX_FRAME = 1 / 20;

const awake = new Set<Sim>();
let frame = 0;
let last = 0;
let carry = 0;

function tick(now: number): void {
  const elapsed = Math.min((now - last) / 1000, MAX_FRAME);
  last = now;
  carry += elapsed;
  const steps = Math.floor(carry / STEP);
  carry -= steps * STEP;

  for (const sim of [...awake]) {
    let moving = true;
    for (let i = 0; i < steps && moving; i++) moving = sim.step(STEP);
    sim.render();
    if (!moving) {
      awake.delete(sim);
      sim.rest?.();
    }
  }
  frame = awake.size > 0 ? requestAnimationFrame(tick) : 0;
}

/** Start (or keep) stepping `sim`. */
export function wake(sim: Sim): void {
  awake.add(sim);
  if (frame) return;
  last = performance.now();
  carry = 0;
  frame = requestAnimationFrame(tick);
}

/** Stop stepping `sim` without calling its `rest`. */
export function drop(sim: Sim): void {
  awake.delete(sim);
}

/** How a spring behaves: its period in seconds, damping ratio, and bounce off a hard stop. */
export interface Spring {
  response: number;
  /** 1 settles without overshoot; lower rings. */
  damping: number;
  /** Fraction of speed kept after hitting a stop (0 = dead, 1 = perfectly elastic). */
  bounce: number;
}

/**
 * One degree of freedom: a unit mass pulled toward `target` by a damped
 * spring, optionally confined between two hard stops.
 */
export class Body implements Sim {
  x: number;
  v = 0;
  target: number;
  min = -Infinity;
  max = Infinity;
  bounce = 0;
  /** Below this distance and speed (per second) the body is considered at rest. */
  eps: number;

  private k = 0;
  private c = 0;

  onRender?: (body: Body) => void;
  /** A stop was hit at `speed` (units per second); `side` is -1 for min, 1 for max. */
  onImpact?: (speed: number, side: -1 | 1) => void;
  onRest?: (body: Body) => void;

  constructor(x: number, eps = 0.001) {
    this.x = x;
    this.target = x;
    this.eps = eps;
  }

  spring({ response, damping, bounce }: Spring): this {
    const omega = (2 * Math.PI) / Math.max(response, 0.01);
    this.k = omega * omega;
    this.c = 2 * damping * omega;
    this.bounce = bounce;
    return this;
  }

  /** Natural angular frequency, for judging how hard an impact was. */
  get omega(): number {
    return Math.sqrt(this.k);
  }

  step(dt: number): boolean {
    // Semi-implicit Euler: stable for a damped spring at this step size.
    const push = (-this.k * (this.x - this.target) - this.c * this.v) * dt;
    this.v += push;
    this.x += this.v * dt;

    const still = this.eps * 20;
    const side = this.x > this.max ? 1 : this.x < this.min ? -1 : 0;
    if (side !== 0) {
      this.x = side === 1 ? this.max : this.min;
      const speed = this.v * side;
      // Arriving no faster than one step of the spring's own push is not a hit:
      // the body is lying against the stop.
      if (speed <= Math.abs(push) * 1.5 + still) {
        this.v = 0;
      } else {
        this.v = speed * this.bounce > still ? -side * speed * this.bounce : 0;
        this.onImpact?.(speed, side);
      }
    }

    // Pressed against a stop by the spring: nothing further will happen.
    if (this.v === 0 && ((this.x === this.max && this.target >= this.max) || (this.x === this.min && this.target <= this.min))) {
      return false;
    }
    if (Math.abs(this.x - this.target) < this.eps && Math.abs(this.v) < still) {
      this.x = this.target;
      this.v = 0;
      return false;
    }
    return true;
  }

  render(): void {
    this.onRender?.(this);
  }

  rest(): void {
    this.onRest?.(this);
  }
}
