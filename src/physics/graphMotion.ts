import { useSyncExternalStore } from "react";
import { projectDistance } from "@ui-sdk/core/gesture";
import { Body, wake, type Sim } from "@/components/ui-sdk/physics/engine";
import { Mass, Rope } from "@/components/ui-sdk/physics/graph";
import { edgeOf, glideOf, intensityOf, springOf, type EdgeMaterial } from "@/components/ui-sdk/physics/material";
import { getControlPoint } from "@/utils/geometry/calc";
import type { GraphNode } from "@/components/Graph/types";
import { playPressSound } from "@/components/ui-sdk/press-sound";
import { useGraphStore } from "@/store/graphStore";

/**
 * Physical motion for the live graph, shared by the SVG and canvas renderers.
 *
 * The graph store stays the single source of truth for where nodes are. This
 * module sits between the pointer and the store:
 *
 *   nodes   a dragged node is a mass sprung to the pointer; its position is
 *           written to the store every frame, and a theme may let it slide on
 *           after it is let go
 *   edges   while an end of an edge is moving, the middle of the line arrives
 *           late; that offset (its "bow") is published for the renderers to
 *           bend the line by, and disappears once the line has settled
 *   draft   the edge being drawn, as a thread, a wire or a ruled pen line,
 *           published as a shape both renderers can stroke
 *   leaving a deleted node lingers for a moment as a ghost that goes the way
 *           it came in that theme, while each edge it held is let go and
 *           recoils into the node at its other end
 *
 * Everything is in the material of the theme the canvas sits in (`--phys-*`
 * tokens). Outside a `[data-physics]` scope, inside a `[data-no-physics]` one
 * (the Performance renderer), or with reduced motion, every call falls
 * through to the exact behaviour: the node goes where the pointer
 * is, lines stay straight, and nothing moves after the pointer lets go.
 */

interface Point { x: number; y: number }

/** The line being drawn: `line` and `quad` are 2 and 3 points; `rope` is a run of points to smooth through. */
export interface DraftShape {
  kind: "line" | "quad" | "rope";
  /** x, y pairs. For `quad` the middle pair is the control point. */
  points: number[];
}

/** How far the middle of a line may bow, as a fraction of its length. */
const MAX_BOW = 0.2;

const pairKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

const simulated = (el: Element | null): el is Element =>
  !!el?.closest("[data-physics]") &&
  !el.closest("[data-no-physics]") &&
  !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ---------- state ---------- */

interface MovingNode { id: number; mass: Mass; held: boolean; lastX: number; lastY: number }
interface MovingEdge { a: number; b: number; mid: Mass }
interface Draft {
  el: Element;
  start: Point;
  pointer: Point;
  snap: Point | null;
  tip: Mass;
  rope: Rope | null;
  mid: Mass | null;
  slack: Body;
  cancelling: boolean;
  material: EdgeMaterial;
}

/** A deleted node on its way out: `life` runs from 1 (as it was) to 0 (gone). */
interface Ghost { node: GraphNode; life: Body; from: number }
/** An edge whose far node was deleted, drawing back into the node that is left. */
interface Recoil {
  start: Point;
  tip: Mass;
  rope: Rope | null;
  mid: Mass | null;
  slack: Body;
  material: EdgeMaterial;
}
export interface LeavingNode { id: number; x: number; y: number; r: number; label: string; scale: number; opacity: number }
export interface Leaving { nodes: LeavingNode[]; edges: DraftShape[] }

const ghosts: Ghost[] = [];
const recoils: Recoil[] = [];
let leaving: Leaving | null = null;
/** The SVG the graph is drawn on, while the standard renderer is mounted. */
let surface: Element | null = null;

const nodes = new Map<number, MovingNode>();
const edges = new Map<string, MovingEdge>();
let draft: Draft | null = null;
let edgeMaterial: EdgeMaterial | null = null;

/** What the renderers read. Objects are replaced, never mutated, so they work as snapshots. */
const bows = new Map<string, Point>();
let draftShape: DraftShape | null = null;
let frame = 0;

const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const positionOf = (id: number): Point | undefined => useGraphStore.getState().data.nodes.find((node) => node.id === id);

/* ---------- the simulation ---------- */

const motion: Sim = {
  step(dt) {
    let moving = false;
    for (const node of nodes.values()) moving = node.mass.step(dt) || node.held || moving;

    for (const edge of edges.values()) moving = edge.mid.step(dt) || moving;

    if (draft) {
      moving = true;
      const { tip, start } = draft;
      if (draft.cancelling) tip.to(start.x, start.y);
      else if (draft.snap) tip.to(draft.snap.x, draft.snap.y);
      else tip.to(draft.pointer.x, draft.pointer.y);
      tip.step(dt);
      draft.slack.step(dt);
      const span = Math.hypot(tip.x - start.x, tip.y - start.y);
      if (draft.rope) draft.rope.step(dt, start, tip, span * (1 + Math.max(0, draft.slack.x)), draft.material.gravity, 5);
      else if (draft.mid) {
        draft.mid.to((start.x + tip.x) / 2, (start.y + tip.y) / 2);
        draft.mid.step(dt);
      }
      if (draft.cancelling && span < 3) draft = null;
    }

    for (let i = ghosts.length - 1; i >= 0; i--) {
      moving = true;
      const ghost = ghosts[i];
      ghost.life.step(dt);
      if (ghost.life.x < 0.02) ghosts.splice(i, 1);
    }
    for (let i = recoils.length - 1; i >= 0; i--) {
      moving = true;
      const recoil = recoils[i];
      const { start, tip } = recoil;
      tip.to(start.x, start.y);
      tip.step(dt);
      recoil.slack.step(dt);
      const span = Math.hypot(tip.x - start.x, tip.y - start.y);
      if (recoil.rope) recoil.rope.step(dt, start, tip, span * (1 + Math.max(0, recoil.slack.x)), recoil.material.gravity, 5);
      else if (recoil.mid) {
        recoil.mid.to((start.x + tip.x) / 2, (start.y + tip.y) / 2);
        recoil.mid.step(dt);
      }
      if (span < 3) recoils.splice(i, 1);
    }
    return moving;
  },

  render() {
    // Nodes: hand this frame's positions to the store, which redraws both renderers.
    const { moveNode } = useGraphStore.getState();
    for (const node of nodes.values()) {
      const { x, y } = node.mass;
      if (Math.abs(x - node.lastX) > 0.01 || Math.abs(y - node.lastY) > 0.01) {
        node.lastX = x;
        node.lastY = y;
        moveNode(node.id, x, y);
      }
    }

    // Edges: aim each middle at where the straight line now puts it, and publish how far behind it is.
    const gain = Math.min(1, edgeMaterial?.intensity ?? 0);
    for (const [key, edge] of edges) {
      const a = positionOf(edge.a);
      const b = positionOf(edge.b);
      if (!a || !b) {
        edges.delete(key);
        bows.delete(key);
        continue;
      }
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      edge.mid.to(mx, my);
      let bx = (edge.mid.x - mx) * gain;
      let by = (edge.mid.y - my) * gain;
      const limit = Math.hypot(b.x - a.x, b.y - a.y) * MAX_BOW;
      const size = Math.hypot(bx, by);
      if (size > limit && size > 0) {
        bx *= limit / size;
        by *= limit / size;
      }
      bows.set(key, { x: bx, y: by });
    }

    draftShape = draft ? shapeOf(draft) : null;
    leaving = ghosts.length > 0 || recoils.length > 0
      ? {
          nodes: ghosts.map(({ node, life, from }) => ({
            id: node.id,
            x: node.x,
            y: node.y,
            r: node.r,
            label: node.label || String(node.id),
            scale: from + (1 - from) * life.x,
            opacity: Math.max(0, Math.min(1, life.x)),
          })),
          edges: recoils.map(shapeOf),
        }
      : null;
    frame++;
    for (const listener of listeners) listener();
  },

  rest() {
    // Everything has settled: forget the moving parts, and the renderers go back to plain geometry.
    for (const [id, node] of nodes) if (!node.held) nodes.delete(id);
    edges.clear();
    bows.clear();
    leaving = null;
    frame++;
    for (const listener of listeners) listener();
  },
};

function shapeOf({ start, tip, rope, mid, material }: Pick<Draft, "start" | "tip" | "rope" | "mid" | "material">): DraftShape {
  if (rope) {
    const points: number[] = [];
    for (let i = 0; i < rope.n; i++) points.push(rope.x[i], rope.y[i]);
    return { kind: "rope", points };
  }
  if (mid) {
    const mx = (start.x + tip.x) / 2;
    const my = (start.y + tip.y) / 2;
    const gain = Math.min(1, material.intensity);
    return { kind: "quad", points: [start.x, start.y, mx + 2 * (mid.x - mx) * gain, my + 2 * (mid.y - my) * gain, tip.x, tip.y] };
  }
  return { kind: "line", points: [start.x, start.y, tip.x, tip.y] };
}

/** Give every edge touching `ids` a mass at its middle, so it can lag when those nodes move. */
function exciteEdges(el: Element, ids: Iterable<number>): void {
  edgeMaterial = edgeOf(el);
  if (edgeMaterial.model === "pen" || edgeMaterial.intensity === 0) return; // a ruled line has no mass
  const moved = new Set(ids);
  const { nodes: all, edges: byNode } = useGraphStore.getState().data;
  const at = new Map(all.map((node) => [node.id, node]));
  byNode.forEach((list, from) => {
    for (const edge of list) {
      if (!moved.has(from) && !moved.has(edge.to)) continue;
      const key = pairKey(from, edge.to);
      if (edges.has(key)) continue;
      const a = at.get(from);
      const b = at.get(edge.to);
      if (!a || !b) continue;
      edges.set(key, { a: from, b: edge.to, mid: new Mass((a.x + b.x) / 2, (a.y + b.y) / 2).spring(edgeMaterial!.spring) });
    }
  });
}

/* ---------- nodes ---------- */

/** Drag node `id` toward (x, y). `el` is the canvas it lives on, which decides the material. */
export function dragNode(el: Element | null, id: number, x: number, y: number): void {
  if (!simulated(el)) {
    useGraphStore.getState().moveNode(id, x, y);
    return;
  }
  let node = nodes.get(id);
  if (!node || !node.held) {
    const from = positionOf(id);
    if (!from) return;
    node ??= { id, mass: new Mass(from.x, from.y), held: true, lastX: from.x, lastY: from.y };
    node.held = true;
    node.mass.spring(springOf(el, "node"));
    nodes.set(id, node);
    exciteEdges(el, [id]);
  }
  node.mass.to(x, y);
  wake(motion);
}

/** Let go of node `id`. If the theme's surface allows, it slides on as far as its speed carries it. */
export function releaseNode(el: Element | null, id: number): void {
  const node = nodes.get(id);
  if (!node) return;
  node.held = false;
  const glide = el ? glideOf(el) : 0;
  if (glide > 0) {
    const { bx, by } = node.mass;
    node.mass.spring({ response: 0.42, damping: 1, bounce: 0 });
    node.mass.to(bx.x + projectDistance(bx.v / 1000, glide), by.x + projectDistance(by.v / 1000, glide));
  }
  wake(motion);
}

/** Nodes are about to be moved directly (a group drag): let the edges touching them lag behind. */
export function nodesMoving(el: Element | null, ids: number[]): void {
  if (!simulated(el)) return;
  exciteEdges(el, ids);
  wake(motion);
}

/* ---------- drawing an edge ---------- */

const EXACT = { response: 0.01, damping: 1, bounce: 0 };
const UNDER_THE_HAND = { response: 0.05, damping: 1, bounce: 0 };

/** Start drawing a line from `start` (where it leaves its node). */
export function beginDraft(el: Element | null, start: Point, pointer: Point): void {
  if (!el) return;
  const live = simulated(el);
  const material: EdgeMaterial = live
    ? edgeOf(el)
    : { model: "pen", spring: EXACT, slack: 0, gravity: 0, intensity: 0 };
  const loose = !live ? EXACT : material.model === "pen" ? material.spring : UNDER_THE_HAND;
  const tip = new Mass(pointer.x, pointer.y).spring(loose);
  draft = {
    el,
    start: { ...start },
    pointer: { ...pointer },
    snap: null,
    tip,
    rope: material.model === "thread" ? new Rope(start, tip) : null,
    mid: material.model === "wire" ? new Mass((start.x + pointer.x) / 2, (start.y + pointer.y) / 2).spring(material.spring) : null,
    slack: new Body(material.slack, 0.0005).spring({ response: 0.16, damping: 0.7, bounce: 0 }),
    cancelling: false,
    material,
  };
  draftShape = shapeOf(draft);
  wake(motion);
}

/** Move the loose end. `snap` is the point on a node the line may attach to, when it is over one. */
export function aimDraft(pointer: Point, snap: Point | null): void {
  if (!draft || draft.cancelling) return;
  draft.pointer = { ...pointer };
  const live = draft.material.intensity > 0 || draft.material.model !== "pen";
  if (!live) {
    draft.tip.jump(pointer.x, pointer.y);
  } else if (!!snap !== !!draft.snap) {
    // Caught: the end is pulled onto the node in the material's own spring, and a thread pulls taut.
    draft.tip.spring(snap || draft.material.model === "pen" ? draft.material.spring : UNDER_THE_HAND);
    draft.slack.target = snap ? 0 : draft.material.slack;
    if (snap) playPressSound(draft.el, "tick", 0.8);
  }
  draft.snap = live && snap ? { ...snap } : null;
  wake(motion);
}

/**
 * Let go of the line. With `connected` (the ids of the edge it has just become) the line turns into
 * that edge and settles straight from whatever shape it had; otherwise it is drawn back into its node.
 */
export function endDraft(connected?: { from: number; to: number }): void {
  const current = draft;
  if (!current) return;
  const live = current.material.intensity > 0 || current.material.model !== "pen";
  if (connected) {
    const speed = Math.hypot(current.tip.bx.v, current.tip.by.v);
    if (live) playPressSound(current.el, "latch", Math.max(0.6, Math.min(1.2, 0.6 + speed / 1500)));
    const middle = current.rope?.middle(1 / 480)
      ?? (current.mid ? { x: current.mid.x, y: current.mid.y, vx: current.mid.bx.v, vy: current.mid.by.v } : null);
    const a = positionOf(connected.from);
    const b = positionOf(connected.to);
    if (middle && a && b && live) {
      // The new edge inherits how far the line was from straight, and how fast it was moving.
      edgeMaterial = current.material;
      const { start, tip } = current;
      const mid = new Mass(
        (a.x + b.x) / 2 + (middle.x - (start.x + tip.x) / 2),
        (a.y + b.y) / 2 + (middle.y - (start.y + tip.y) / 2),
      ).spring(current.material.spring);
      mid.to((a.x + b.x) / 2, (a.y + b.y) / 2);
      mid.bx.v = middle.vx;
      mid.by.v = middle.vy;
      edges.set(pairKey(connected.from, connected.to), { a: connected.from, b: connected.to, mid });
    }
    draft = null;
  } else if (!live) {
    draft = null;
  } else {
    current.cancelling = true;
    current.snap = null;
    current.slack.target = 0;
    current.tip.spring({ response: 0.2, damping: 1, bounce: 0 });
  }
  wake(motion);
}

/* ---------- nodes arriving and leaving ---------- */

const num = (style: CSSStyleDeclaration, name: string, fallback: number) => {
  const value = parseFloat(style.getPropertyValue(name));
  return Number.isFinite(value) ? value : fallback;
};

/** How a theme brings a node in: the scale it starts from and the spring that takes it to full size. */
function arrivalOf(el: Element): { from: number; response: number; damping: number } {
  const style = getComputedStyle(el);
  const intensity = intensityOf(style);
  return {
    from: num(style, "--phys-arrive-from", 0.9),
    response: num(style, "--phys-arrive-response", 0.2),
    damping: Math.max(0.2, Math.min(1, 1 - (1 - num(style, "--phys-arrive-damping", 1)) * intensity)),
  };
}

/**
 * The entrance of a new node in the current theme, as a spring for `motion`:
 * laid down softly, dropped in with a knock, or simply drawn. Null when physics
 * is off, and the caller keeps its plain entrance.
 */
export function nodeArrival(): { from: number; stiffness: number; damping: number } | null {
  if (typeof document === "undefined" || !simulated(document.body)) return null;
  const { from, response, damping } = arrivalOf(document.documentElement);
  const omega = (2 * Math.PI) / response;
  return { from, stiffness: omega * omega, damping: 2 * damping * omega };
}

/** The standard renderer says which element the graph is on (null when it unmounts). */
export function setGraphSurface(el: Element | null): void {
  surface = el;
}

/** More than this many nodes going at once (clearing a big graph) just go. */
const MAX_GHOSTS = 40;

// Nodes that are deleted linger as ghosts, and the edges they held recoil into
// the nodes that are left. Only a plain deletion counts: every node that is
// still there is the very same object, so undo, redo and generating a new
// graph (which replace the nodes) pass straight through.
useGraphStore.subscribe((state, previous) => {
  if (state.data === previous.data || !simulated(surface)) return;
  const now = state.data.nodes;
  const before = previous.data.nodes;
  if (now.length >= before.length) return;
  const were = new Set(before);
  if (!now.every((node) => were.has(node))) return;
  const stay = new Set(now.map((node) => node.id));
  const gone = before.filter((node) => !stay.has(node.id));
  if (gone.length === 0 || gone.length > MAX_GHOSTS) return;

  const arrive = arrivalOf(surface);
  const material = edgeOf(surface);
  for (const node of gone) {
    const life = new Body(1, 0.002).spring({ response: arrive.response * 1.4, damping: 1, bounce: 0 });
    life.target = 0;
    ghosts.push({ node, life, from: arrive.from });
  }

  const at = new Map(before.map((node) => [node.id, node]));
  const seen = new Set<string>();
  previous.data.edges.forEach((list, from) => {
    for (const edge of list) {
      const fromGone = !stay.has(from);
      if (fromGone === !stay.has(edge.to)) continue; // both ends stay, or both go
      const key = edge.type === "directed" ? `${from}>${edge.to}` : pairKey(from, edge.to);
      if (seen.has(key)) continue;
      seen.add(key);
      const a = at.get(from);
      const b = at.get(edge.to);
      if (!a || !b) continue;
      const kept = fromGone ? b : a;
      const lost = fromGone ? a : b;
      // The line as it was drawn: straight, or the directed edge's curve.
      const control = edge.type === "directed"
        ? getControlPoint(edge.x1, edge.y1, edge.x2, edge.y2)
        : { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
      const along = (t: number): Point => {
        const u = fromGone ? 1 - t : t; // t runs from the node that stays to the one that left
        return {
          x: (1 - u) * (1 - u) * a.x + 2 * u * (1 - u) * control.cx + u * u * b.x,
          y: (1 - u) * (1 - u) * a.y + 2 * u * (1 - u) * control.cy + u * u * b.y,
        };
      };
      const start = { x: kept.x, y: kept.y };
      const tip = new Mass(lost.x, lost.y).spring({ response: 0.3, damping: 1, bounce: 0 });
      const span = Math.hypot(lost.x - kept.x, lost.y - kept.y) || 1;
      let rope: Rope | null = null;
      let mid: Mass | null = null;
      let slack = 0;
      if (material.model === "thread") {
        rope = new Rope(start, tip);
        slack = Math.max(0, rope.lay(along) / span - 1);
      } else {
        // The middle starts where the line actually passed, then follows the shrinking chord.
        const middle = along(0.5);
        mid = new Mass(middle.x, middle.y).spring(material.spring);
      }
      const give = new Body(slack, 0.0005).spring({ response: 0.2, damping: 1, bounce: 0 });
      give.target = 0;
      recoils.push({ start, tip, rope, mid, slack: give, material: { ...material, intensity: Math.max(1, material.intensity) } });
    }
  });
  wake(motion);
});

/* ---------- what the renderers read ---------- */

/** How far the middle of the edge between `a` and `b` is from where it will settle, or null when it is at rest. */
export function bowOf(a: number, b: number): Point | null {
  return bows.get(pairKey(a, b)) ?? null;
}

export function useEdgeBow(a: number, b: number): Point | null {
  return useSyncExternalStore(subscribe, () => bowOf(a, b));
}

/** Deleted nodes and the edges they held, while they are on their way out. */
export function useLeaving(): Leaving | null {
  return useSyncExternalStore(subscribe, () => leaving);
}

export function useDraftShape(): DraftShape | null {
  return useSyncExternalStore(subscribe, () => draftShape);
}

/** Changes every simulated frame; a canvas render loop depends on it to redraw while things move. */
export function useMotionFrame(): number {
  return useSyncExternalStore(subscribe, () => frame);
}

/** SVG path data for the line being drawn. */
export function draftPath({ kind, points: p }: DraftShape): string {
  if (kind === "line") return `M${p[0]} ${p[1]}L${p[2]} ${p[3]}`;
  if (kind === "quad") return `M${p[0]} ${p[1]}Q${p[2]} ${p[3]} ${p[4]} ${p[5]}`;
  let d = `M${p[0]} ${p[1]}`;
  const last = p.length - 2;
  for (let i = 2; i < last; i += 2) d += `Q${p[i]} ${p[i + 1]} ${(p[i] + p[i + 2]) / 2} ${(p[i + 1] + p[i + 3]) / 2}`;
  return `${d}L${p[last]} ${p[last + 1]}`;
}

/** Trace the line being drawn onto a canvas path. Returns its end point and the direction it arrives from. */
export function traceDraft(ctx: CanvasRenderingContext2D, { kind, points: p }: DraftShape): { x: number; y: number; angle: number } {
  const last = p.length - 2;
  ctx.moveTo(p[0], p[1]);
  if (kind === "line") ctx.lineTo(p[2], p[3]);
  else if (kind === "quad") ctx.quadraticCurveTo(p[2], p[3], p[4], p[5]);
  else {
    for (let i = 2; i < last; i += 2) ctx.quadraticCurveTo(p[i], p[i + 1], (p[i] + p[i + 2]) / 2, (p[i + 1] + p[i + 3]) / 2);
    ctx.lineTo(p[last], p[last + 1]);
  }
  return { x: p[last], y: p[last + 1], angle: Math.atan2(p[last + 1] - p[last - 1], p[last] - p[last - 2]) };
}
