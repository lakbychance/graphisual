/**
 * The shapes of a run's marks on the graph (value badges, parent links, the branch,
 * this step's edge), shared by the SVG and Canvas renderers so both draw them alike.
 */
import type { RunMark, RunMarkKind } from "@/utils/visualization/runView";
import { EDGE, EDGE_TYPE } from "@/constants/graph";
import { NODE_RUN_RING } from "@/constants/ui";
import { getControlPoint } from "@/utils/geometry/calc";
import type { GraphEdge, GraphNode } from "./types";

/** A mark drawn over an edge (see `runMarksAt`): a parent link, the branch or this step's edge. */
export type MarkKind = RunMarkKind;
export type DrawnMark = RunMark;

/** Stroke of each mark, as CSS colour tokens (the canvas resolves them). */
export const MARK_STYLE: Record<MarkKind, { stroke: string; width: number; dash?: number[]; opacity?: number }> = {
  change: { stroke: "--color-state-change", width: 5, opacity: 0.9 },
  loop: { stroke: "--color-edge-cycle", width: 5, opacity: 0.9 },
  tentative: { stroke: "--color-edge-traversal", width: 2.5, dash: [7, 6] },
  tree: { stroke: "--color-edge-traversal", width: 2.5, opacity: 0 },
  branch: { stroke: "--color-edge-traversal", width: 6, opacity: 0.85 },
  ask: { stroke: "--color-state-current", width: 4, dash: [7, 5] },
};

/** This step's edge: the change it made, the loop cycle detection found, or the edge Bellman-Ford's Run it asks about. */
export const isStepEdge = (kind: MarkKind) => kind === "change" || kind === "loop" || kind === "ask";

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

/** The badges a run hangs on its nodes: the widest value badge (0 for none). */
export interface RunBadges {
  valueWidth: number;
}

/** How far a run's ring reaches out from a node's rim: its gap, and half its widest stroke (see `NODE_RUN_RING`). */
const RING_REACH = NODE_RUN_RING.GAP + NODE_RUN_RING.CURRENT_WIDTH / 2;

/**
 * The box the nodes (with the ring a run draws round them) and their badges cover, in graph units,
 * with badges grown by `k` (see `markScale`).
 */
export function runBounds(nodes: readonly GraphNode[], badges: RunBadges, k: number) {
  const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const add = ({ x, y }: { x: number; y: number }, w: number, h: number) => {
    box.minX = Math.min(box.minX, x - w / 2);
    box.maxX = Math.max(box.maxX, x + w / 2);
    box.minY = Math.min(box.minY, y - h / 2);
    box.maxY = Math.max(box.maxY, y + h / 2);
  };
  for (const node of nodes) {
    add(node, (node.r + RING_REACH) * 2, (node.r + RING_REACH) * 2);
    if (badges.valueWidth > 0) add(VALUE_BADGE.at(node), badges.valueWidth * k, VALUE_BADGE.height * k);
  }
  return box;
}

/** Where a mark's chevron sits: 70% of the way along the walk, with the walk's direction there. */
export interface MarkGeometry {
  /** The edge as the renderers draw it: a straight line between the node rims, or the directed curve. */
  line: { x1: number; y1: number; x2: number; y2: number; cx?: number; cy?: number };
  /** Where the edge's weight label sits, and the weight (null for an unweighted edge). */
  label: { x: number; y: number };
  weight: number | null;
  /** The edge's weight as the algorithm counts it, written or not (a 1 is left unwritten on the graph). */
  cost: number;
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
      label: at(0.5), weight, cost: edge.weight ?? EDGE.DEFAULT_WEIGHT,
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
    label: { x: (edge.x1 + edge.nodeX2) / 2, y: (edge.y1 + edge.nodeY2) / 2 }, weight, cost: edge.weight ?? EDGE.DEFAULT_WEIGHT,
    chevron: { x: s.x + (e.x - s.x) * 0.7, y: s.y + (e.y - s.y) * 0.7, angle: Math.atan2(b.y - a.y, b.x - a.x) },
    directed: false, against: false,
  };
}

/** The SVG path of a mark's line. */
export const linePath = ({ x1, y1, x2, y2, cx, cy }: MarkGeometry["line"]) =>
  cx === undefined ? `M${x1} ${y1} L${x2} ${y2}` : `M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`;

/** Marks in drawing order (this step's edge on top), each with whether it carries a chevron. */
export function orderMarks<T extends DrawnMark>(marks: readonly T[]): Array<{ mark: T; chevron: boolean }> {
  const pair = (m: DrawnMark) => [Math.min(m.from, m.to), Math.max(m.from, m.to)].join("-");
  const changed = new Set(marks.filter((m) => isStepEdge(m.kind)).map(pair));
  return [...marks]
    .sort((a, b) => Number(isStepEdge(a.kind)) - Number(isStepEdge(b.kind)))
    .map((mark) => ({ mark, chevron: isStepEdge(mark.kind) || !changed.has(pair(mark)) }));
}
