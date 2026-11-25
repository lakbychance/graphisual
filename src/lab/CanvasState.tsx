/**
 * Run state drawn on the graph itself, inside the real SVG renderer (`Graph`'s layers):
 * values with what changed, queue places, depth-first times, edge classes and the parent links.
 * Who waits, who is being worked on and who is done is the app's own drawing (the renderers read
 * it from `rolesAt`). Only what this step changed is emphasised.
 *
 * Badges keep a readable size on screen whatever the zoom (they scale by 1 / zoom, within limits).
 */
import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import type { GraphEdge, GraphNode } from "@/components/Graph/types";
import type { GraphLayers } from "@/components/Graph/Graph";
import { EDGE, EDGE_TYPE } from "@/constants/graph";
import { getControlPoint } from "@/utils/geometry/calc";
import { num, type EdgeMark, type NodeState, type StepView } from "./model";

/** What a variant puts on the canvas. */
export interface CanvasOptions {
  /** Value badges: on every node (∞ included), only on reached nodes, or none. */
  values: "all" | "reached" | "none";
  /** Depth-first discovery / finish times under each node. */
  times: boolean;
  /** Queue or stack place on each waiting node. */
  slots: boolean;
  /** Words on classified edges (back, forward, cross). */
  classWords: boolean;
}

const MARK_STYLE: Record<EdgeMark["kind"], { stroke: string; width: number; dash?: string; opacity?: number }> = {
  change: { stroke: "var(--color-state-change)", width: 5, opacity: 0.9 },
  tentative: { stroke: "var(--color-edge-traversal)", width: 2.5, dash: "7 6" },
  tree: { stroke: "var(--color-edge-traversal)", width: 2.5, opacity: 0 },
  branch: { stroke: "var(--color-edge-traversal)", width: 6, opacity: 0.85 },
  back: { stroke: "var(--color-edge-back)", width: 3.5, dash: "10 5" },
  forward: { stroke: "var(--color-edge-forward)", width: 3.5, dash: "3 5" },
  cross: { stroke: "var(--color-edge-cross)", width: 3.5, dash: "1 6" },
};

const CLASS_WORD: Partial<Record<EdgeMark["kind"], string>> = { back: "back", forward: "forward", cross: "cross" };

/**
 * The drawn path of the edge from -> to, as the renderer draws it; where its weight label sits;
 * and a point 70% of the way along the walk, with the walk's direction there.
 */
function geometry(mark: EdgeMark, nodes: Map<number, GraphNode>, edges: Map<number, GraphEdge[]>) {
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
    // Walked against its arrow (a backtrack up a directed edge): the same curve, read from its end.
    const t = out ? 0.7 : 0.3;
    const p = at(t);
    const q = at(out ? t + 0.01 : t - 0.01);
    const mid = at(0.5);
    return {
      d: `M${edge.x1} ${edge.y1} Q${cx} ${cy} ${edge.x2} ${edge.y2}`,
      label: { x: mid.x, y: mid.y }, weight,
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
    d: `M${s.x} ${s.y} L${e.x} ${e.y}`,
    label: { x: (edge.x1 + edge.nodeX2) / 2, y: (edge.y1 + edge.nodeY2) / 2 }, weight,
    chevron: { x: s.x + (e.x - s.x) * 0.7, y: s.y + (e.y - s.y) * 0.7, angle: Math.atan2(b.y - a.y, b.x - a.x) },
    directed: false, against: false,
  };
}

/** A small arrowhead at (x, y) pointing along `angle`. */
const Chevron = ({ x, y, angle, size, color }: { x: number; y: number; angle: number; size: number; color: string }) => (
  <path
    d={`M${-size} ${-size * 0.8} L${size * 0.6} 0 L${-size} ${size * 0.8}`}
    transform={`translate(${x} ${y}) rotate(${(angle * 180) / Math.PI})`}
    fill="none"
    stroke={color}
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);

interface Props {
  view: StepView;
  nodes: GraphNode[];
  edges: Map<number, GraphEdge[]>;
  options: CanvasOptions;
  zoom: number;
}

/** The lab's two drawing layers for `Graph`. */
export function canvasLayers(props: Props): GraphLayers {
  return { under: <EdgeLayer {...props} />, over: <NodeLayer {...props} /> };
}

function EdgeLayer({ view, nodes, edges, options, zoom }: Props) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const k = Math.min(1.8, Math.max(1, 1 / zoom));
  // Classified and parent edges first, this step's change on top.
  const marks = [...view.marks].sort((a, b) => Number(a.kind === "change") - Number(b.kind === "change"));
  const pair = (m: EdgeMark) => [Math.min(m.from, m.to), Math.max(m.from, m.to)].join("-");
  const changed = new Set(marks.filter((m) => m.kind === "change").map(pair));
  return (
    <g className="pointer-events-none" aria-hidden="true">
      {marks.map((mark) => {
        const g = geometry(mark, byId, edges);
        if (!g) return null;
        const style = MARK_STYLE[mark.kind];
        const word = options.classWords ? CLASS_WORD[mark.kind] : undefined;
        const walked = mark.kind === "tree" || mark.kind === "tentative" || mark.kind === "branch" || mark.kind === "change";
        const change = mark.kind === "change";
        const chevron = walked && (!g.directed || g.against) && (change || !changed.has(pair(mark)));
        const chevronColor = change ? "var(--color-state-change)" : "var(--color-edge-traversal)";
        return (
          <g key={`${mark.kind}-${mark.from}-${mark.to}`}>
            {/* A dashed mark hides the plain edge under it, so its dashes read cleanly. */}
            {style.dash && mark.kind !== "tentative" && <path d={g.d} fill="none" stroke="var(--color-paper)" strokeWidth={style.width + 1} />}
            <path
              d={g.d}
              fill="none"
              stroke={style.stroke}
              strokeWidth={style.width}
              strokeDasharray={style.dash}
              strokeOpacity={style.opacity ?? 1}
              strokeLinecap={style.dash ? "butt" : "round"}
            />
            {chevron && <Chevron x={g.chevron.x} y={g.chevron.y} angle={g.chevron.angle} size={5 * k} color={chevronColor} />}
            {/* The weight stays readable over the drawn edge; on this step's edge it is part of the change. */}
            {g.weight !== null && mark.kind !== "tree" && (
              <g transform={`translate(${g.label.x} ${g.label.y})`}>
                <rect x={-12} y={-10} width={24} height={20} rx={4} fill={change ? "var(--color-state-change)" : "var(--color-paper)"} />
                <text textAnchor="middle" dominantBaseline="central" className="font-semibold text-sm lg:text-xs"
                  fill={change ? "var(--color-state-change-text)" : "var(--color-text)"}>{g.weight}</text>
              </g>
            )}
            {word && (
              <g transform={`translate(${g.label.x} ${g.label.y + 16 * k}) scale(${k})`}>
                <rect x={-22} y={-8} width={44} height={16} rx={8} fill="var(--color-badge)" stroke={style.stroke} strokeWidth={1.25} />
                <text textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={600} fill="var(--color-badge-text)">{word}</text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}

function NodeLayer({ view, nodes, options, zoom }: Props) {
  const reduced = useReducedMotion();
  const k = Math.min(1.8, Math.max(1, 1 / zoom));
  return (
    <g className="pointer-events-none select-none" aria-hidden="true">
      {nodes.map((node) => {
        const state = view.nodes.get(node.id);
        if (!state) return null;
        return <NodeMarks key={node.id} node={node} state={state} options={options} k={k} reduced={!!reduced} step={view.index} valued={view.valued} />;
      })}
    </g>
  );
}

function NodeMarks({ node, state, options, k, reduced, step, valued }: {
  node: GraphNode; state: NodeState; options: CanvasOptions; k: number; reduced: boolean; step: number; valued: boolean;
}) {
  const { x, y, r } = node;
  const pop = state.changed && !reduced
    ? { initial: { opacity: 0, scale: 0.6 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.18, ease: "easeOut" as const } }
    : {};
  const showValue = valued && (options.values === "all" || (options.values === "reached" && state.value !== undefined));
  const valueText = num(state.value);

  return (
    <g>
      {showValue && (
        <m.g key={`v-${step}-${state.changed}`} {...pop} style={{ transformOrigin: `${x + r * 0.75}px ${y - r * 0.95}px` }}>
          <g transform={`translate(${x + r * 0.75} ${y - r * 0.95}) scale(${k})`}>
            <ValueBadge text={valueText} old={state.old} changed={state.changed && state.old !== undefined} muted={state.value === undefined} />
          </g>
        </m.g>
      )}

      {options.slots && state.slot !== undefined && (
        <g transform={`translate(${x - r * 0.85} ${y - r * 0.85}) scale(${k})`}>
          <circle r={8.5} fill="var(--color-badge)" stroke="var(--color-state-waiting)" strokeWidth={1.25} />
          <text textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700} fill="var(--color-badge-text)">{state.slot}</text>
        </g>
      )}

      {options.times && state.d !== undefined && (
        <g transform={`translate(${x - r * 0.8} ${y + r * 0.95}) scale(${k})`}>
          <rect x={-17} y={-9} width={34} height={18} rx={9} fill="var(--color-badge)" stroke={state.changed ? "var(--color-state-change)" : "var(--color-badge-line)"} strokeWidth={state.changed ? 1.5 : 1} />
          <text textAnchor="middle" dominantBaseline="central" fontSize={10.5} fontWeight={600} className="font-mono" fill="var(--color-badge-text)">
            {state.d}/{state.f ?? "·"}
          </text>
        </g>
      )}
    </g>
  );
}

/** A value beside a node; when this step lowered it, the old value struck through, then the new one. */
function ValueBadge({ text, old, changed, muted }: { text: string; old?: number; changed: boolean; muted: boolean }) {
  const oldText = old === undefined ? "" : num(old);
  const width = changed ? 18 + (oldText.length + text.length) * 7 + 14 : 14 + text.length * 7;
  return (
    <g>
      <rect
        x={-width / 2}
        y={-10}
        width={width}
        height={20}
        rx={10}
        fill={changed ? "var(--color-state-change)" : "var(--color-badge)"}
        stroke={changed ? "none" : "var(--color-badge-line)"}
        strokeWidth={1}
      />
      <text textAnchor="middle" dominantBaseline="central" fontSize={11.5} fontWeight={700} className="font-mono"
        fill={changed ? "var(--color-state-change-text)" : muted ? "var(--color-text-muted)" : "var(--color-badge-text)"}>
        {changed ? (
          <>
            <tspan textDecoration="line-through" fontWeight={500} opacity={0.75}>{oldText}</tspan>
            <tspan> → {text}</tspan>
          </>
        ) : text}
      </text>
    </g>
  );
}
