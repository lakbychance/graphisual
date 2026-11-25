/**
 * The shapes of a run's marks on the graph (value badges, queue places, parent links, this step's
 * edge), shared by the SVG and Canvas renderers so both draw them alike.
 */
import type { EdgeClass } from "@/algorithms/engine";
import type { RunMarkKind } from "@/utils/visualization/runView";
import { EDGE, EDGE_TYPE } from "@/constants/graph";
import { getControlPoint } from "@/utils/geometry/calc";
import type { GraphEdge, GraphNode } from "./types";

/**
 * A mark drawn over an edge: the run's own (see `runMarksAt`), or how a depth-first search
 * classifies it (`branch`: a tree edge into a node still in progress; back, forward, cross).
 */
export type MarkKind = RunMarkKind | "branch" | EdgeClass;

export interface DrawnMark {
  from: number;
  to: number;
  kind: MarkKind;
}

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
