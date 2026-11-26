/**
 * A run's state drawn on the graph by the SVG renderer: value badges (the old value struck through
 * when this step lowered it), best-so-far parent links and the edge this step used; for a
 * depth-first search, the branch it is on. Who waits, who is being worked on and who is done is the
 * nodes' own drawing (`rolesAt`). Only what this step changed is emphasised: a badge it changed and
 * the edge it used carry the change colour (the cycle colour for the edge that closes cycle
 * detection's loop). The Canvas renderer draws the same (`runRenderer.ts`).
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
  MARK_STYLE, VALUE_BADGE, isStepEdge, linePath, markGeometry, markScale, num, orderMarks, type DrawnMark,
} from "./runMarkShapes";

/** What the graph carries during a run. */
export interface MarkOptions {
  /** Value badges: on every node (∞ included), only on reached nodes, or none. */
  values: "all" | "reached" | "none";
}

/** The app's set: a value on every node from the start. */
export const APP_MARKS: MarkOptions = { values: "all" };

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
  badges: ReadonlyMap<number, NodeBadge>;
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

function EdgeMarks({ marks, nodes, edges, zoom }: MarkLayerProps) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const k = markScale(zoom);
  const drawn = orderMarks(marks).flatMap(({ mark, chevron }) => {
    const g = markGeometry(mark, byId, edges);
    return g ? [{ mark, chevron, g }] : [];
  });
  return (
    <g className="pointer-events-none" aria-hidden="true">
      {drawn.map(({ mark, chevron, g }) => {
        const style = MARK_STYLE[mark.kind];
        const d = linePath(g.line);
        const change = mark.kind === "change";
        const stroke = `var(${style.stroke})`;
        return (
          <g key={`${mark.kind}-${mark.from}-${mark.to}`}>
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
                color={isStepEdge(mark.kind) ? stroke : "var(--color-edge-traversal)"} />
            )}
            {/* The weight stays readable over the drawn edge; on this step's edge it is part of the change. */}
            {g.weight !== null && mark.kind !== "tree" && (
              <g transform={`translate(${g.label.x} ${g.label.y})`}>
                <rect x={-12} y={-10} width={24} height={20} rx={4} fill={change ? "var(--color-state-change)" : "var(--color-paper)"} />
                <text textAnchor="middle" dominantBaseline="central" className="font-semibold text-sm lg:text-xs"
                  fill={change ? "var(--color-state-change-text)" : "var(--color-text)"}>{g.weight}</text>
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
  node: GraphNode; badge: NodeBadge; options: MarkOptions; k: number; reduced: boolean; step: number; valued: boolean;
}) {
  const pop = badge.changed && !reduced
    ? { initial: { opacity: 0, scale: 0.6 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.18, ease: "easeOut" as const } }
    : {};
  const showValue = valued && (options.values === "all" || (options.values === "reached" && badge.value !== undefined));
  const at = VALUE_BADGE.at(node);

  return (
    <g>
      {showValue && (
        <m.g key={`v-${step}-${badge.changed}`} {...pop} style={{ transformOrigin: `${at.x}px ${at.y}px` }}>
          <g transform={`translate(${at.x} ${at.y}) scale(${k})`}>
            <ValueBadge text={num(badge.value)} old={badge.changed ? badge.old : undefined} muted={badge.value === undefined} />
          </g>
        </m.g>
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
