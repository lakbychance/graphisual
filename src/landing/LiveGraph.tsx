import { useId } from "react";
import { formatDistance, type Frame, type LabGraph } from "./engine";

export type MaterialName = "paper" | "graphite" | "blueprint";

/** A region of the drawing rendered in one material (viewBox units). */
export interface MaterialRegion { name: MaterialName; x: number; y: number; w: number; h: number }

/**
 * Where to place the drawing inside a container whose size is not known yet:
 * a box given in percentages of the container, showing `viewBox` of the graph.
 */
export interface GraphBox { x: string; y: string; w: string; h: string; viewBox: string }

interface LiveGraphProps {
  graph: LabGraph;
  frame: Frame;
  label: string;
  /** One material for the whole drawing, or regions that split it between several. */
  material: MaterialName | MaterialRegion[];
  /** The drawing's own size in viewBox units. Leave out when `box` places it instead. */
  width?: number;
  height?: number;
  /** Place the drawing by percentages (for markup rendered before the container is measured). */
  box?: GraphBox;
  radius?: number;
  showDistances?: boolean;
  /** Draw edge weights (off for algorithms that ignore them). */
  showWeights?: boolean;
  /** Which stage shape this drawing is for; CSS shows the one that fits the screen. */
  layout?: "wide" | "tall";
}

/**
 * The landing page's graph, driven by one engine frame. With regions it is drawn
 * once per material and clipped to that material's region, so a seam can pass
 * through the drawing and each side is rendered in its own material.
 */
export function LiveGraph({ graph, frame, label, material, width = 0, height = 0, box, radius = 22, showDistances = false, showWeights = true, layout }: LiveGraphProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const regions: MaterialRegion[] = typeof material === "string" ? [{ name: material, x: 0, y: 0, w: width, h: height }] : material;
  const at = (id: number) => graph.nodes.find((n) => n.id === id) ?? graph.nodes[0];

  const drawing = (
    <>
      {graph.edges.map((edge, i) => {
        const a = at(edge.from);
        const b = at(edge.to);
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const ux = (b.x - a.x) / len;
        const uy = (b.y - a.y) / len;
        // The ink line runs in the direction the algorithm walked the edge.
        const [p, q] = frame.reversed.get(i) ? [b, a] : [a, b];
        const state = frame.path.has(i) ? "path" : frame.traversed.has(i) ? "walked" : "idle";
        const tip = { x: b.x - ux * (radius + 4), y: b.y - uy * (radius + 4) };
        const wing = radius * 0.4;
        return (
          <g key={i} className="lp-edge" data-state={state}>
            <line className="lp-edge-base" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
            <line className="lp-edge-ink" x1={p.x} y1={p.y} x2={q.x} y2={q.y} pathLength={1} />
            {edge.directed && (
              <polygon
                className="lp-edge-arrow"
                points={`${tip.x},${tip.y} ${tip.x - ux * wing * 1.7 - uy * wing * 0.85},${tip.y - uy * wing * 1.7 + ux * wing * 0.85} ${tip.x - ux * wing * 1.7 + uy * wing * 0.85},${tip.y - uy * wing * 1.7 - ux * wing * 0.85}`}
              />
            )}
            {showWeights && (
              <g className="lp-weight" transform={`translate(${(a.x + b.x) / 2 - uy * radius * 0.8} ${(a.y + b.y) / 2 + ux * radius * 0.8})`}>
                <circle r={radius * 0.56} />
                <text dy="0.36em">{edge.weight < 0 ? `−${-edge.weight}` : edge.weight}</text>
              </g>
            )}
          </g>
        );
      })}
      {graph.nodes.map((node) => {
        const state = node.id === graph.start ? "start" : node.id === graph.end ? "end"
          : frame.pathNodes.has(node.id) ? "path" : frame.visited.has(node.id) ? "visited" : "idle";
        const reached = frame.visited.has(node.id) || frame.pathNodes.has(node.id);
        const distance = formatDistance(frame.dist.get(node.id));
        const fs = radius * 0.58;
        const badge = (distance.length * 0.62 + 1.1) * fs;
        return (
          <g
            key={node.id} className="lp-node" data-state={state} data-reached={reached ? "" : undefined}
            data-current={frame.current === node.id ? "" : undefined} transform={`translate(${node.x} ${node.y})`}
          >
            <circle className="lp-node-ring" r={radius + 8} />
            <g className="lp-node-body">
              <circle className="lp-node-face" r={radius} />
              <circle className="lp-node-hatch" r={radius - 1} fill={`url(#${uid}-hatch)`} />
              <text dy="0.36em">{node.label}</text>
            </g>
            {showDistances && (
              <g className="lp-node-dist" data-known={frame.dist.has(node.id) ? "" : undefined} transform={`translate(${radius * 0.95} ${-radius * 0.95})`}>
                <rect x={-badge / 2} y={-fs * 0.86} width={badge} height={fs * 1.72} rx={fs * 0.86} />
                <text dy="0.36em" style={{ fontSize: fs }}>{distance}</text>
              </g>
            )}
          </g>
        );
      })}
    </>
  );

  const hatch = (
    <pattern id={`${uid}-hatch`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="5" stroke="currentColor" strokeWidth="1.2" />
    </pattern>
  );

  if (box) {
    return (
      <svg className="lp-graph" width="100%" height="100%" role="img" aria-label={label} data-layout={layout} style={{ fontSize: radius * 0.72 }}>
        <defs>{hatch}</defs>
        <svg x={box.x} y={box.y} width={box.w} height={box.h} viewBox={box.viewBox} overflow="visible">
          <g data-material={regions[0].name}>{drawing}</g>
        </svg>
      </svg>
    );
  }

  return (
    <svg className="lp-graph" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} data-layout={layout} style={{ fontSize: radius * 0.72 }}>
      <defs>
        {hatch}
        {regions.map((r) => (
          <clipPath key={r.name} id={`${uid}-${r.name}`}><rect x={r.x} y={r.y} width={r.w} height={r.h} /></clipPath>
        ))}
      </defs>
      {regions.map((r) => (
        <g key={r.name} data-material={r.name} clipPath={`url(#${uid}-${r.name})`}>{drawing}</g>
      ))}
    </svg>
  );
}
