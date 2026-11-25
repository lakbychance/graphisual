/**
 * The shapes of a run's marks on the graph (value badges, queue places, depth-first times, parent
 * links, edge classes, this step's edge), shared by the SVG and Canvas renderers so both draw them alike.
 */
import type { RunMark, RunMarkKind } from "@/utils/visualization/runView";
import { EDGE, EDGE_TYPE } from "@/constants/graph";
import { getControlPoint } from "@/utils/geometry/calc";
import type { GraphEdge, GraphNode } from "./types";

/** A mark drawn over an edge (see `runMarksAt`): a parent link, the branch, an edge class or this step's edge. */
export type MarkKind = RunMarkKind;
export type DrawnMark = RunMark;

/** Stroke of each mark, as CSS colour tokens (the canvas resolves them). */
export const MARK_STYLE: Record<MarkKind, { stroke: string; width: number; dash?: number[]; opacity?: number }> = {
  change: { stroke: "--color-state-change", width: 5, opacity: 0.9 },
  tentative: { stroke: "--color-edge-traversal", width: 2.5, dash: [7, 6] },
  tree: { stroke: "--color-edge-traversal", width: 2.5, opacity: 0 },
  branch: { stroke: "--color-edge-traversal", width: 6, opacity: 0.85 },
  back: { stroke: "--color-edge-back", width: 3.5, dash: [10, 5] },
  forward: { stroke: "--color-edge-forward", width: 3.5, dash: [3, 5] },
  cross: { stroke: "--color-edge-cross", width: 3.5, dash: [1, 6] },
};

/** The marks that follow the way the search travelled (and carry a chevron saying which way). */
export const isWalked = (kind: MarkKind) => kind === "tree" || kind === "tentative" || kind === "branch" || kind === "change";

/** Badges keep a readable size on screen whatever the zoom: they grow by 1 / zoom, within limits. */
export const markScale = (zoom: number) => Math.min(1.8, Math.max(1, 1 / zoom));

/** A value as a badge writes it: ∞ until reached, a true minus for negatives. */
export const num = (value: number | undefined) =>
  value === undefined || value === Infinity ? "∞" : value < 0 ? `−${-value}` : String(value);

/** Value badge size and place (beside the node's top right), before scaling. */
export const VALUE_BADGE = {
  height: 20,
  fontSize: 11.5,
  /** Badge width for its text: the plain value, or old → new. */
  width: (text: string, old?: string) => (old !== undefined ? 18 + (old.length + text.length) * 7 + 14 : 14 + text.length * 7),
  at: (node: GraphNode) => ({ x: node.x + node.r * 0.75, y: node.y - node.r * 0.95 }),
};

/** The word a classified edge carries (colour is never the only cue). */
export const CLASS_WORD: Partial<Record<MarkKind, string>> = { back: "back", forward: "forward", cross: "cross" };

/** Edge class word pill, before scaling. It fits its word, so it covers as little of a short edge as it can. */
export const CLASS_PILL = {
  width: (word: string) => 12 + word.length * 6,
  height: 16,
  fontSize: 10,
};

/**
 * Where a word pill may sit, most wanted first: on its edge at the middle, then out towards the ends,
 * then beside the edge (`side`: pill heights to either side of it).
 */
const PILL_SPOTS = [0, 1, -1].flatMap((side) => [0.5, 0.4, 0.6, 0.3, 0.7].map((t) => ({ t, side })));

interface Box { x: number; y: number; w: number; h: number }
const overlap = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2)) *
  Math.max(0, Math.min(a.y + a.h / 2, b.y + b.h / 2) - Math.max(a.y - a.h / 2, b.y - b.h / 2));

/**
 * Where each classified edge's word pill sits (centre, in graph units), keyed by the mark. A pill sits
 * on its edge (just under the weight when the edge shows one), at the first spot along it, or beside
 * it, that is clear of the nodes, their `d/f` badges and the pills placed before it, or else at the
 * least crowded spot (covering another word counts most).
 * Both renderers place pills with this, so they agree.
 */
export function placeClassWords(
  marks: ReadonlyArray<{ mark: DrawnMark; g: MarkGeometry }>,
  nodes: readonly GraphNode[],
  badges: ReadonlyMap<number, { d?: number }> | null,
  k: number,
): Map<DrawnMark, { x: number; y: number }> {
  const taken: Array<Box & { weight: number }> = nodes.map((n) => ({ x: n.x, y: n.y, w: n.r * 2, h: n.r * 2, weight: 1 }));
  if (badges) {
    for (const n of nodes) {
      if (badges.get(n.id)?.d === undefined) continue;
      const at = TIME_BADGE.at(n);
      taken.push({ x: at.x, y: at.y, w: TIME_BADGE.width * k, h: TIME_BADGE.height * k, weight: 2 });
    }
  }
  const placed = new Map<DrawnMark, { x: number; y: number }>();
  // This step's classes choose first.
  for (const { mark, g } of [...marks].sort((a, b) => Number(!!b.mark.fresh) - Number(!!a.mark.fresh))) {
    const word = CLASS_WORD[mark.kind];
    if (!word) continue;
    const w = CLASS_PILL.width(word) * k;
    const h = CLASS_PILL.height * k;
    const below = g.weight === null ? 0 : 16 * k;
    let best: Box | null = null;
    let bestCrowd = Infinity;
    for (const { t, side } of PILL_SPOTS) {
      const p = g.along(t);
      const q = g.along(t + 0.01);
      const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
      const nx = (-(q.y - p.y) / len) * side * h;
      const ny = ((q.x - p.x) / len) * side * h;
      const box = { x: p.x + nx, y: p.y + ny + below, w, h };
      const crowd = taken.reduce((sum, other) => sum + overlap(box, other) * other.weight, 0);
      if (crowd < bestCrowd) [best, bestCrowd] = [box, crowd];
      if (crowd === 0) break;
    }
    if (!best) continue;
    taken.push({ ...best, weight: 4 });
    placed.set(mark, { x: best.x, y: best.y });
  }
  return placed;
}

/** Depth-first `d/f` time pill (under the node's bottom left), before scaling. */
export const TIME_BADGE = {
  width: 34,
  height: 18,
  fontSize: 10.5,
  at: (node: GraphNode) => ({ x: node.x - node.r * 0.8, y: node.y + node.r * 0.95 }),
  text: (d: number, f: number | undefined) => `${d}/${f ?? "·"}`,
};

/** Queue or stack place badge (a small disc at the node's top left), before scaling. */
export const SLOT_BADGE = {
  r: 8.5,
  fontSize: 10,
  at: (node: GraphNode) => ({ x: node.x - node.r * 0.85, y: node.y - node.r * 0.85 }),
};

/** Where a mark's chevron sits: 70% of the way along the walk, with the walk's direction there. */
export interface MarkGeometry {
  /** The edge as the renderers draw it: a straight line between the node rims, or the directed curve. */
  line: { x1: number; y1: number; x2: number; y2: number; cx?: number; cy?: number };
  /** Where the edge's weight label sits, and the weight (null for an unweighted edge). */
  label: { x: number; y: number };
  weight: number | null;
  chevron: { x: number; y: number; angle: number };
  /** The point `t` of the way along the drawn edge (0 at its start, 1 at its end). */
  along: (t: number) => { x: number; y: number };
  directed: boolean;
  /** Walked against its arrow (a backtrack up a directed edge). */
  against: boolean;
}

/** The drawn path of the edge from -> to, as the renderer draws it, and where its marks sit. */
export function markGeometry(mark: { from: number; to: number }, nodes: Map<number, GraphNode>, edges: Map<number, GraphEdge[]>): MarkGeometry | null {
  const out = edges.get(mark.from)?.find((e) => e.to === mark.to);
  const edge = out ?? edges.get(mark.to)?.find((e) => e.to === mark.from);
  const a = nodes.get(mark.from);
  const b = nodes.get(mark.to);
  if (!edge || !a || !b) return null;
  const weight = edge.weight === EDGE.DEFAULT_WEIGHT ? null : edge.weight;
  if (edge.type === EDGE_TYPE.DIRECTED) {
    const { cx, cy } = getControlPoint(edge.x1, edge.y1, edge.x2, edge.y2);
    const at = (t: number) => ({
      x: (1 - t) ** 2 * edge.x1 + 2 * (1 - t) * t * cx + t ** 2 * edge.x2,
      y: (1 - t) ** 2 * edge.y1 + 2 * (1 - t) * t * cy + t ** 2 * edge.y2,
    });
    // Walked against its arrow: the same curve, read from its end.
    const t = out ? 0.7 : 0.3;
    const p = at(t);
    const q = at(out ? t + 0.01 : t - 0.01);
    return {
      line: { x1: edge.x1, y1: edge.y1, x2: edge.x2, y2: edge.y2, cx, cy },
      label: at(0.5), weight,
      chevron: { x: p.x, y: p.y, angle: Math.atan2(q.y - p.y, q.x - p.x) },
      along: at,
      directed: true, against: !out,
    };
  }
  const trim = (p: GraphNode, q: GraphNode) => {
    const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    return { x: p.x + ((q.x - p.x) / len) * p.r, y: p.y + ((q.y - p.y) / len) * p.r };
  };
  const s = trim(a, b);
  const e = trim(b, a);
  return {
    line: { x1: s.x, y1: s.y, x2: e.x, y2: e.y },
    label: { x: (edge.x1 + edge.nodeX2) / 2, y: (edge.y1 + edge.nodeY2) / 2 }, weight,
    chevron: { x: s.x + (e.x - s.x) * 0.7, y: s.y + (e.y - s.y) * 0.7, angle: Math.atan2(b.y - a.y, b.x - a.x) },
    along: (t) => ({ x: s.x + (e.x - s.x) * t, y: s.y + (e.y - s.y) * t }),
    directed: false, against: false,
  };
}

/** The SVG path of a mark's line. */
export const linePath = ({ x1, y1, x2, y2, cx, cy }: MarkGeometry["line"]) =>
  cx === undefined ? `M${x1} ${y1} L${x2} ${y2}` : `M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`;

/** Marks in drawing order (this step's change on top), each with whether it carries a chevron. */
export function orderMarks<T extends DrawnMark>(marks: readonly T[]): Array<{ mark: T; chevron: boolean }> {
  const pair = (m: DrawnMark) => [Math.min(m.from, m.to), Math.max(m.from, m.to)].join("-");
  const changed = new Set(marks.filter((m) => m.kind === "change").map(pair));
  return [...marks]
    .sort((a, b) => Number(a.kind === "change") - Number(b.kind === "change"))
    .map((mark) => ({ mark, chevron: isWalked(mark.kind) && (mark.kind === "change" || !changed.has(pair(mark))) }));
}
