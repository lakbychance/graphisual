/**
 * A run's state drawn on the graph by the SVG renderer: value badges (the old value struck through
 * when this step lowered it), queue or stack places, best-so-far parent links and the edge this step
 * used. Who waits, who is being worked on and who is done is the nodes' own drawing (`rolesAt`).
 * Only what this step changed is emphasised. The Canvas renderer draws the same (`runRenderer.ts`).
 *
 * Badges keep a readable size on screen whatever the zoom (they scale by 1 / zoom, within limits).
 */
import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import type { GraphEdge, GraphNode } from "./types";
import type { GraphLayers } from "./Graph";
import { selectStepIndex, selectStepRun, useGraphStore } from "@/store/graphStore";
import { VisualizationState } from "@/constants/visualization";
import { runMarksAt, type NodeBadge, type RunMarks } from "@/utils/visualization/runView";
import {
  MARK_STYLE, SLOT_BADGE, VALUE_BADGE, linePath, markGeometry, markScale, num, orderMarks, type DrawnMark,
} from "./runMarkShapes";

/** What the graph carries during a run. */
export interface MarkOptions {
  /** Value badges: on every node (∞ included), only on reached nodes, or none. */
  values: "all" | "reached" | "none";
  /** Depth-first discovery / finish times under each node. */
  times: boolean;
  /** Queue or stack place on each waiting node. */
  slots: boolean;
  /** Words on classified edges (back, forward, cross). */
  classWords: boolean;
}

/** The app's set: a value on every node from the start, and queue or stack places. */
export const APP_MARKS: MarkOptions = { values: "all", times: false, slots: true, classWords: false };

/** A node's badges, with a depth-first search's discovery and finish times where it keeps them. */
export type DrawnBadge = NodeBadge & { d?: number; f?: number };

/** The step on screen's marks, or null outside a run (badges are never shown while editing) or when not `wanted`. */
export function useRunMarks(wanted = true): { index: number; marks: RunMarks } | null {
  const run = useGraphStore(selectStepRun);
  const index = useGraphStore(selectStepIndex);
  const running = useGraphStore((s) => s.visualization.state === VisualizationState.RUNNING);
  if (!wanted || !running || run.ends.length === 0) return null;
  return { index, marks: runMarksAt(run, index) };
}

export interface MarkLayerProps {
  /** The step shown, so a changed badge pops in again on every step. */
  step: number;
  valued: boolean;
  badges: ReadonlyMap<number, DrawnBadge>;
  marks: readonly DrawnMark[];
  nodes: GraphNode[];
  edges: Map<number, GraphEdge[]>;
  options: MarkOptions;
  zoom: number;
}

/** The two drawing layers for `Graph`: edge marks under the nodes, badges over them. */
export function markLayers(props: MarkLayerProps): GraphLayers {
  return { under: <EdgeMarks {...props} />, over: <NodeMarks {...props} /> };
}

const CLASS_WORD: Partial<Record<DrawnMark["kind"], string>> = { back: "back", forward: "forward", cross: "cross" };

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

function EdgeMarks({ marks, nodes, edges, options, zoom }: MarkLayerProps) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const k = markScale(zoom);
  return (
    <g className="pointer-events-none" aria-hidden="true">
      {orderMarks(marks).map(({ mark, chevron }) => {
        const g = markGeometry(mark, byId, edges);
        if (!g) return null;
        const style = MARK_STYLE[mark.kind];
        const d = linePath(g.line);
        const word = options.classWords ? CLASS_WORD[mark.kind] : undefined;
        const change = mark.kind === "change";
        const stroke = `var(${style.stroke})`;
        return (
          <g key={`${mark.kind}-${mark.from}-${mark.to}`}>
            {/* A dashed mark hides the plain edge under it, so its dashes read cleanly. */}
            {style.dash && mark.kind !== "tentative" && <path d={d} fill="none" stroke="var(--color-paper)" strokeWidth={style.width + 1} />}
            <path
              d={d}
              fill="none"
              stroke={stroke}
              strokeWidth={style.width}
              strokeDasharray={style.dash?.join(" ")}
              strokeOpacity={style.opacity ?? 1}
              strokeLinecap={style.dash ? "butt" : "round"}
            />
            {chevron && (!g.directed || g.against) && (
              <Chevron x={g.chevron.x} y={g.chevron.y} angle={g.chevron.angle} size={5 * k}
                color={change ? "var(--color-state-change)" : "var(--color-edge-traversal)"} />
            )}
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
                <rect x={-22} y={-8} width={44} height={16} rx={8} fill="var(--color-badge)" stroke={stroke} strokeWidth={1.25} />
                <text textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={600} fill="var(--color-badge-text)">{word}</text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}

function NodeMarks({ step, valued, badges, nodes, options, zoom }: MarkLayerProps) {
  const reduced = !!useReducedMotion();
  const k = markScale(zoom);
  return (
    <g className="pointer-events-none select-none" aria-hidden="true">
      {nodes.map((node) => (
        <NodeBadges key={node.id} node={node} badge={badges.get(node.id) ?? { changed: false }} options={options}
          k={k} reduced={reduced} step={step} valued={valued} />
      ))}
    </g>
  );
}

function NodeBadges({ node, badge, options, k, reduced, step, valued }: {
  node: GraphNode; badge: DrawnBadge; options: MarkOptions; k: number; reduced: boolean; step: number; valued: boolean;
}) {
  const { x, y, r } = node;
  const pop = badge.changed && !reduced
    ? { initial: { opacity: 0, scale: 0.6 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.18, ease: "easeOut" as const } }
    : {};
  const showValue = valued && (options.values === "all" || (options.values === "reached" && badge.value !== undefined));
  const at = VALUE_BADGE.at(node);
  const slotAt = SLOT_BADGE.at(node);

  return (
    <g>
      {showValue && (
        <m.g key={`v-${step}-${badge.changed}`} {...pop} style={{ transformOrigin: `${at.x}px ${at.y}px` }}>
          <g transform={`translate(${at.x} ${at.y}) scale(${k})`}>
            <ValueBadge text={num(badge.value)} old={badge.changed ? badge.old : undefined} muted={badge.value === undefined} />
          </g>
        </m.g>
      )}

      {options.slots && badge.slot !== undefined && (
        <g transform={`translate(${slotAt.x} ${slotAt.y}) scale(${k})`}>
          <circle r={SLOT_BADGE.r} fill="var(--color-badge)" stroke="var(--color-state-waiting)" strokeWidth={1.25} />
          <text textAnchor="middle" dominantBaseline="central" fontSize={SLOT_BADGE.fontSize} fontWeight={700} fill="var(--color-badge-text)">{badge.slot}</text>
        </g>
      )}

      {options.times && badge.d !== undefined && (
        <g transform={`translate(${x - r * 0.8} ${y + r * 0.95}) scale(${k})`}>
          <rect x={-17} y={-9} width={34} height={18} rx={9} fill="var(--color-badge)" stroke={badge.changed ? "var(--color-state-change)" : "var(--color-badge-line)"} strokeWidth={badge.changed ? 1.5 : 1} />
          <text textAnchor="middle" dominantBaseline="central" fontSize={10.5} fontWeight={600} className="font-mono" fill="var(--color-badge-text)">
            {badge.d}/{badge.f ?? "·"}
          </text>
        </g>
      )}
    </g>
  );
}

/** A value beside a node; when this step lowered it, the old value struck through, then the new one. */
function ValueBadge({ text, old, muted }: { text: string; old?: number; muted: boolean }) {
  const oldText = old === undefined ? undefined : num(old);
  const changed = oldText !== undefined;
  const width = VALUE_BADGE.width(text, oldText);
  const h = VALUE_BADGE.height;
  return (
    <g>
      <rect
        x={-width / 2}
        y={-h / 2}
        width={width}
        height={h}
        rx={h / 2}
        fill={changed ? "var(--color-state-change)" : "var(--color-badge)"}
        stroke={changed ? "none" : "var(--color-badge-line)"}
        strokeWidth={1}
      />
      <text textAnchor="middle" dominantBaseline="central" fontSize={VALUE_BADGE.fontSize} fontWeight={700} className="font-mono"
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
