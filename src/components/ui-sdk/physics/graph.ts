import { projectDistance } from "@ui-sdk/core/gesture";
import { Body, type Sim, type Spring } from "./engine";
import type { EdgeMaterial } from "./material";

/**
 * The graph as physical objects.
 *
 *   node    a puck on the sheet: it follows the hand with a little weight, and
 *           a theme may let it slide on after it is let go and knock off the
 *           edge of the canvas
 *   edge    a line with mass: when its ends move, its middle arrives late, so
 *           the line bows and straightens the way its material would
 *   draft   the edge being drawn, in one of three materials
 *             thread  hangs with a little slack and pulls taut when it connects
 *             wire    stays almost straight and whips behind a fast hand
 *             pen     a ruled line; only the pen tip lags the hand
 *
 * The simulation knows nothing about the DOM. A view steps it through the
 * shared loop (`wake(sim)`) and draws from `nodes`, `edges` and `draft` in
 * `onRender`.
 */

export interface Point { x: number; y: number }

/** A point mass: two sprung axes. */
export class Mass {
  readonly bx: Body;
  readonly by: Body;
  constructor(x: number, y: number) {
    this.bx = new Body(x, 0.03);
    this.by = new Body(y, 0.03);
  }
  get x() { return this.bx.x; }
  get y() { return this.by.x; }
  spring(spring: Spring): this {
    this.bx.spring(spring);
    this.by.spring(spring);
    return this;
  }
  to(x: number, y: number): void {
    this.bx.target = x;
    this.by.target = y;
  }
  jump(x: number, y: number): void {
    this.bx.x = this.bx.target = x;
    this.by.x = this.by.target = y;
    this.bx.v = this.by.v = 0;
  }
  step(dt: number): boolean {
    const a = this.bx.step(dt);
    const b = this.by.step(dt);
    return a || b;
  }
}

/** A thread: point masses joined by links that pull but never push. */
export class Rope {
  readonly n: number;
  readonly x: Float64Array;
  readonly y: Float64Array;
  private px: Float64Array;
  private py: Float64Array;

  constructor(a: Point, b: Point, n = 14) {
    this.n = n;
    this.x = new Float64Array(n);
    this.y = new Float64Array(n);
    this.px = new Float64Array(n);
    this.py = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      this.x[i] = this.px[i] = a.x + (b.x - a.x) * t;
      this.y[i] = this.py[i] = a.y + (b.y - a.y) * t;
    }
  }

  /** Lay the thread, at rest, along the curve `at(t)` for t from 0 to 1. Returns the length laid. */
  lay(at: (t: number) => Point): number {
    let length = 0;
    for (let i = 0; i < this.n; i++) {
      const p = at(i / (this.n - 1));
      if (i > 0) length += Math.hypot(p.x - this.x[i - 1], p.y - this.y[i - 1]);
      this.x[i] = this.px[i] = p.x;
      this.y[i] = this.py[i] = p.y;
    }
    return length;
  }

  /** Advance by `dt` with the ends pinned at `a` and `b`. Returns how far the fastest point moved. */
  step(dt: number, a: Point, b: Point, length: number, gravity: number, drag: number): number {
    const { n, x, y, px, py } = this;
    const keep = Math.exp(-drag * dt);
    let moved = 0;
    for (let i = 1; i < n - 1; i++) {
      const dx = (x[i] - px[i]) * keep;
      const dy = (y[i] - py[i]) * keep + gravity * dt * dt;
      px[i] = x[i];
      py[i] = y[i];
      x[i] += dx;
      y[i] += dy;
      moved = Math.max(moved, Math.abs(dx), Math.abs(dy));
    }
    const link = length / (n - 1);
    for (let pass = 0; pass < 10; pass++) {
      x[0] = a.x; y[0] = a.y;
      x[n - 1] = b.x; y[n - 1] = b.y;
      for (let i = 0; i < n - 1; i++) {
        const dx = x[i + 1] - x[i];
        const dy = y[i + 1] - y[i];
        const d = Math.hypot(dx, dy);
        if (d <= link || d === 0) continue; // slack: a thread does not resist being pushed
        const pull = ((d - link) / d) * 0.5;
        if (i > 0) { x[i] += dx * pull; y[i] += dy * pull; }
        if (i + 1 < n - 1) { x[i + 1] -= dx * pull; y[i + 1] -= dy * pull; }
      }
    }
    return moved;
  }

  /** Position and velocity (per second, given the step that produced it) of the middle of the thread. */
  middle(dt: number): { x: number; y: number; vx: number; vy: number } {
    const i = this.n >> 1;
    return { x: this.x[i], y: this.y[i], vx: (this.x[i] - this.px[i]) / dt, vy: (this.y[i] - this.py[i]) / dt };
  }
}

export interface SimNode { id: string; mass: Mass; held: boolean }
export interface SimEdge { key: string; from: string; to: string; mid: Mass }
export interface Draft {
  from: string;
  tip: Mass;
  /** The node the tip has been pulled onto, if any. */
  snap: string | null;
  cancelling: boolean;
  rope: Rope | null;
  mid: Mass | null;
  /** Current slack of a thread: its material slack while loose, drawn to zero once it catches a node. */
  slack: Body;
}

export interface GraphPhysics {
  node: Spring;
  /** Fraction of speed a released node keeps per millisecond; 0 stops it where it is let go. */
  glide: number;
  edge: EdgeMaterial;
}

export interface GraphBounds { minX: number; minY: number; maxX: number; maxY: number }

const STEP_HINT = 1 / 480;
const edgeKey = (a: string, b: string) => [a, b].sort().join("-");

export class GraphSim implements Sim {
  readonly nodes = new Map<string, SimNode>();
  readonly edges = new Map<string, SimEdge>();
  draft: Draft | null = null;
  physics: GraphPhysics;

  onRender?: () => void;
  /** A node knocked against the edge of the canvas at `speed` px/s. */
  onKnock?: (speed: number) => void;
  /** The draft caught (`true`) or let go of (`false`) a node. */
  onSnap?: (caught: boolean) => void;
  onConnect?: (from: string, to: string, speed: number) => void;

  private pointer: Point = { x: 0, y: 0 };

  constructor(physics: GraphPhysics, private bounds: GraphBounds, private snapRadius: number) {
    this.physics = physics;
  }

  addNode(id: string, x: number, y: number): void {
    const mass = new Mass(x, y).spring(this.physics.node);
    const { minX, minY, maxX, maxY } = this.bounds;
    mass.bx.min = minX; mass.bx.max = maxX;
    mass.by.min = minY; mass.by.max = maxY;
    mass.bx.onImpact = mass.by.onImpact = (speed) => this.onKnock?.(speed);
    this.nodes.set(id, { id, mass, held: false });
  }

  addEdge(from: string, to: string, middle?: { x: number; y: number; vx: number; vy: number }): void {
    const a = this.nodes.get(from)!.mass;
    const b = this.nodes.get(to)!.mass;
    const mid = new Mass(middle?.x ?? (a.x + b.x) / 2, middle?.y ?? (a.y + b.y) / 2).spring(this.physics.edge.spring);
    if (middle) { mid.bx.v = middle.vx; mid.by.v = middle.vy; }
    this.edges.set(edgeKey(from, to), { key: edgeKey(from, to), from, to, mid });
  }

  hasEdge(a: string, b: string): boolean {
    return this.edges.has(edgeKey(a, b));
  }

  /** Re-read springs after the theme or the intensity changed. */
  retune(physics: GraphPhysics): void {
    this.physics = physics;
    for (const edge of this.edges.values()) edge.mid.spring(physics.edge.spring);
  }

  /* ---------- nodes ---------- */
  grab(id: string): void {
    const node = this.nodes.get(id);
    if (!node) return;
    node.held = true;
    node.mass.spring(this.physics.node);
  }

  drag(id: string, x: number, y: number): void {
    const { minX, minY, maxX, maxY } = this.bounds;
    this.nodes.get(id)?.mass.to(Math.max(minX, Math.min(maxX, x)), Math.max(minY, Math.min(maxY, y)));
  }

  drop(id: string): void {
    const node = this.nodes.get(id);
    if (!node) return;
    node.held = false;
    const { glide, node: spring } = this.physics;
    if (glide <= 0) return;
    // Let go while moving: it slides on as far as its speed and the surface's friction allow.
    const { bx, by } = node.mass;
    node.mass.spring({ response: 0.42, damping: 1, bounce: spring.bounce });
    node.mass.to(bx.x + projectDistance(bx.v / 1000, glide), by.x + projectDistance(by.v / 1000, glide));
  }

  /* ---------- drawing an edge ---------- */
  begin(from: string, x: number, y: number): void {
    const source = this.nodes.get(from);
    if (!source) return;
    const { edge } = this.physics;
    const tip = new Mass(x, y).spring(edge.model === "pen" ? edge.spring : { response: 0.05, damping: 1, bounce: 0 });
    const slack = new Body(edge.slack, 0.0005).spring({ response: 0.16, damping: 0.7, bounce: 0 });
    this.pointer = { x, y };
    this.draft = {
      from,
      tip,
      snap: null,
      cancelling: false,
      rope: edge.model === "thread" ? new Rope(source.mass, tip) : null,
      mid: edge.model === "wire" ? new Mass((source.mass.x + x) / 2, (source.mass.y + y) / 2).spring(edge.spring) : null,
      slack,
    };
  }

  aim(x: number, y: number): void {
    const draft = this.draft;
    if (!draft || draft.cancelling) return;
    this.pointer = { x, y };
    let snap: string | null = null;
    let nearest = this.snapRadius;
    for (const node of this.nodes.values()) {
      if (node.id === draft.from || this.hasEdge(draft.from, node.id)) continue;
      const d = Math.hypot(node.mass.x - x, node.mass.y - y);
      if (d < nearest) { nearest = d; snap = node.id; }
    }
    if (snap !== draft.snap) {
      draft.snap = snap;
      // Caught: the tip is pulled onto the node with the material's own spring, and a thread pulls taut.
      draft.tip.spring(snap || this.physics.edge.model === "pen" ? this.physics.edge.spring : { response: 0.05, damping: 1, bounce: 0 });
      draft.slack.target = snap ? 0 : this.physics.edge.slack;
      this.onSnap?.(snap !== null);
    }
  }

  /** Let go of the line: it connects if it has caught a node, otherwise it is drawn back into its source. */
  end(): void {
    const draft = this.draft;
    if (!draft || draft.cancelling) return;
    if (draft.snap) {
      const from = this.nodes.get(draft.from)!.mass;
      const to = this.nodes.get(draft.snap)!.mass;
      const speed = Math.hypot(draft.tip.bx.v, draft.tip.by.v);
      const middle = draft.rope?.middle(STEP_HINT)
        ?? (draft.mid ? { x: draft.mid.x, y: draft.mid.y, vx: draft.mid.bx.v, vy: draft.mid.by.v } : undefined);
      // The line keeps whatever shape and motion it had: it becomes the edge and settles straight.
      this.addEdge(draft.from, draft.snap, middle && {
        x: middle.x + ((from.x + to.x) / 2 - (from.x + draft.tip.x) / 2),
        y: middle.y + ((from.y + to.y) / 2 - (from.y + draft.tip.y) / 2),
        vx: middle.vx,
        vy: middle.vy,
      });
      const { from: a, snap: b } = draft;
      this.draft = null;
      this.onConnect?.(a, b, speed);
      return;
    }
    draft.cancelling = true;
    draft.slack.target = 0;
    draft.tip.spring({ response: 0.2, damping: 1, bounce: 0 });
  }

  /* ---------- stepping ---------- */
  step(dt: number): boolean {
    let moving = false;
    for (const node of this.nodes.values()) moving = node.mass.step(dt) || moving || node.held;

    const pen = this.physics.edge.model === "pen";
    for (const edge of this.edges.values()) {
      const a = this.nodes.get(edge.from)!.mass;
      const b = this.nodes.get(edge.to)!.mass;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      if (pen) { edge.mid.jump(mx, my); continue; }
      edge.mid.to(mx, my);
      moving = edge.mid.step(dt) || moving;
    }

    const draft = this.draft;
    if (draft) {
      moving = true;
      const source = this.nodes.get(draft.from)!.mass;
      const caught = draft.snap ? this.nodes.get(draft.snap)!.mass : null;
      if (draft.cancelling) draft.tip.to(source.x, source.y);
      else if (caught) draft.tip.to(caught.x, caught.y);
      else draft.tip.to(this.pointer.x, this.pointer.y);
      draft.tip.step(dt);
      draft.slack.step(dt);
      const span = Math.hypot(draft.tip.x - source.x, draft.tip.y - source.y);
      if (draft.rope) {
        draft.rope.step(dt, source, draft.tip, span * (1 + Math.max(0, draft.slack.x)), this.physics.edge.gravity, 5);
      } else if (draft.mid) {
        draft.mid.to((source.x + draft.tip.x) / 2, (source.y + draft.tip.y) / 2);
        draft.mid.step(dt);
      }
      if (draft.cancelling && span < 3) this.draft = null;
    }
    return moving;
  }

  render(): void {
    this.onRender?.();
  }
}
