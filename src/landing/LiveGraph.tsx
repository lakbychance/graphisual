import { useEffect, useId, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { formatDistance, type Frame, type LabGraph } from "./engine";

export type MaterialName = "paper" | "graphite" | "blueprint";

/** A region of the drawing rendered in one material (viewBox units). */
export interface MaterialRegion { name: MaterialName; x: number; y: number; w: number; h: number }

interface LiveGraphProps {
  graph: LabGraph;
  frame: Frame;
  width: number;
  height: number;
  label: string;
  /** One material for the whole drawing, or regions that split it between several. */
  material: MaterialName | MaterialRegion[];
  radius?: number;
  showDistances?: boolean;
  /** Draw edge weights (off for algorithms that ignore them). */
  showWeights?: boolean;
  /** Which hero layout this drawing is for; CSS shows the one that fits the screen. */
  layout?: "wide" | "tall";
  onMove?: (id: number, x: number, y: number) => void;
  onWeight?: (edgeIndex: number) => void;
  /** Play the one-off entrance: edges fade up, then nodes land one by one. */
  intro?: boolean;
}

/**
 * The landing page's graph, driven by one engine frame. It is drawn once per
 * material and clipped to that material's region, so a node dragged across a
 * seam is redrawn in the material it lands on.
 */
export function LiveGraph({ graph, frame, width, height, label, material, radius = 22, showDistances = false, showWeights = true, layout, onMove, onWeight, intro = false }: LiveGraphProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: number; dx: number; dy: number } | null>(null);
  const regions: MaterialRegion[] = typeof material === "string" ? [{ name: material, x: 0, y: 0, w: width, h: height }] : material;

  const toSvg = (event: ReactPointerEvent) => {
    const matrix = svgRef.current?.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  };
  const onDown = (event: ReactPointerEvent<SVGGElement>, id: number, x: number, y: number) => {
    if (!onMove) return;
    const p = toSvg(event);
    drag.current = { id, dx: p.x - x, dy: p.y - y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onDrag = (event: ReactPointerEvent<SVGGElement>) => {
    const d = drag.current;
    if (!d) return;
    const p = toSvg(event);
    const pad = radius + 6;
    onMove?.(d.id, Math.max(pad, Math.min(width - pad, p.x - d.dx)), Math.max(pad + 12, Math.min(height - pad, p.y - d.dy)));
  };
  const onUp = () => { drag.current = null; };

  // A touch that starts on a node drags it instead of scrolling the page. Browsers that
  // ignore `touch-action` on SVG shapes need the touch cancelled by hand, which React's
  // passive touch listeners cannot do.
  const draggable = Boolean(onMove);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !draggable) return;
    const hold = (event: TouchEvent) => {
      if (drag.current || (event.target as Element).closest(".lp-node")) event.preventDefault();
    };
    svg.addEventListener("touchstart", hold, { passive: false });
    svg.addEventListener("touchmove", hold, { passive: false });
    return () => { svg.removeEventListener("touchstart", hold); svg.removeEventListener("touchmove", hold); };
  }, [draggable]);

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
            {showWeights && <g
              className="lp-weight" data-editable={onWeight ? "" : undefined}
              transform={`translate(${(a.x + b.x) / 2 - uy * radius * 0.8} ${(a.y + b.y) / 2 + ux * radius * 0.8})`}
              onClick={onWeight ? () => onWeight(i) : undefined}
            >
              <circle r={radius * 0.56} />
              <text dy="0.36em">{edge.weight < 0 ? `−${-edge.weight}` : edge.weight}</text>
            </g>}
          </g>
        );
      })}
      {graph.nodes.map((node, order) => {
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
            style={{ "--i": order } as React.CSSProperties}
            onPointerDown={(event) => onDown(event, node.id, node.x, node.y)} onPointerMove={onDrag} onPointerUp={onUp} onPointerCancel={onUp}
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

  return (
    <svg ref={svgRef} className="lp-graph" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} data-draggable={onMove ? "" : undefined} data-layout={layout} data-intro={intro ? "" : undefined} style={{ fontSize: radius * 0.72 }}>
      <defs>
        <pattern id={`${uid}-hatch`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke="currentColor" strokeWidth="1.2" />
        </pattern>
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
