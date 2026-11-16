import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { drop, wake } from "@/components/ui-sdk/physics/engine";
import { GraphSim, type GraphPhysics } from "@/components/ui-sdk/physics/graph";
import { edgeOf, glideOf, springOf } from "@/components/ui-sdk/physics/material";
import { playPressSound } from "@/components/ui-sdk/press-sound";
import { EDGES, NODES, type BfsStep, type MockEdge } from "./mock";

const W = 520;
const H = 300;
const R = 24;
/** Connector handles sit this far from the node's centre, as in the app. */
const HANDLE = R + 9;
const HANDLES = [[0, -HANDLE], [HANDLE, 0], [0, HANDLE], [-HANDLE, 0]] as const;
/** How close the pen has to come to a node before the line jumps onto it. */
const SNAP = R + 18;
/** How far the middle of a line may bow, as a fraction of its length. */
const MAX_BOW = 0.22;

const keyOf = (a: string, b: string) => [a, b].sort().join("-");
const f = (n: number) => n.toFixed(2);

/** With physics switched off (or reduced motion) everything is exact: no weight, no slack, no slide. */
const EXACT: GraphPhysics = {
  node: { response: 0.02, damping: 1, bounce: 0 },
  glide: 0,
  edge: { model: "pen", spring: { response: 0.02, damping: 1, bounce: 0 }, slack: 0, gravity: 0, intensity: 0 },
};

function physicsOf(svg: SVGSVGElement): GraphPhysics {
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduced || !svg.closest("[data-physics]")) return EXACT;
  return { node: springOf(svg, "node"), glide: glideOf(svg), edge: edgeOf(svg) };
}

type Gesture = { kind: "node"; id: string; dx: number; dy: number } | { kind: "edge" } | null;

/**
 * A small live graph: drag a node to move it, drag one of its handles to draw
 * an edge to another node. Nodes, edges and the line being drawn are simulated
 * (physics/graph.ts) in the material of the skin they sit in; React only owns
 * which nodes and edges exist, and the simulation writes positions straight to
 * the SVG each frame.
 */
export function GraphLab({ step, width = W, height = H, className }: { step?: BfsStep; width?: number | string; height?: number | string; className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<GraphSim | null>(null);
  const gesture = useRef<Gesture>(null);
  const [edges, setEdges] = useState<MockEdge[]>(EDGES);
  const [active, setActive] = useState<string | null>(null);

  useLayoutEffect(() => {
    const svg = svgRef.current!;
    const sim = new GraphSim(physicsOf(svg), { minX: R + 2, minY: R + 2, maxX: W - R - 2, maxY: H - R - 2 }, SNAP);
    for (const node of NODES) sim.addNode(node.id, node.x, node.y);
    for (const edge of EDGES) sim.addEdge(edge.from, edge.to);
    simRef.current = sim;

    const draftPath = svg.querySelector<SVGPathElement>("[data-draft]")!;
    const draftTip = svg.querySelector<SVGCircleElement>("[data-draft-tip]")!;

    sim.onRender = () => {
      const gain = Math.min(1, sim.physics.edge.intensity);
      for (const node of sim.nodes.values()) {
        svg.querySelector(`[data-node="${node.id}"]`)?.setAttribute("transform", `translate(${f(node.mass.x)} ${f(node.mass.y)})`);
      }
      for (const edge of sim.edges.values()) {
        const group = svg.querySelector(`[data-edge="${edge.key}"]`);
        if (!group) continue;
        const a = sim.nodes.get(edge.from)!.mass;
        const b = sim.nodes.get(edge.to)!.mass;
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        // The middle of the line arrives late; draw the curve that passes through where it is.
        let bx = (edge.mid.x - mx) * gain;
        let by = (edge.mid.y - my) * gain;
        const limit = Math.hypot(b.x - a.x, b.y - a.y) * MAX_BOW;
        const bow = Math.hypot(bx, by);
        if (bow > limit) { bx *= limit / bow; by *= limit / bow; }
        group.firstElementChild!.setAttribute("d", `M${f(a.x)} ${f(a.y)}Q${f(mx + 2 * bx)} ${f(my + 2 * by)} ${f(b.x)} ${f(b.y)}`);
        group.lastElementChild!.setAttribute("transform", `translate(${f(mx + bx)} ${f(my + by)})`);
      }

      const draft = sim.draft;
      svg.toggleAttribute("data-drawing", !!draft);
      for (const el of svg.querySelectorAll("[data-node][data-target]")) el.removeAttribute("data-target");
      if (!draft) {
        draftPath.setAttribute("d", "");
        draftTip.setAttribute("visibility", "hidden");
        return;
      }
      if (draft.snap) svg.querySelector(`[data-node="${draft.snap}"]`)?.setAttribute("data-target", "");
      const from = sim.nodes.get(draft.from)!.mass;
      const tip = draft.tip;
      let d = `M${f(from.x)} ${f(from.y)}`;
      if (draft.rope) {
        const { x, y, n } = draft.rope;
        for (let i = 1; i < n - 1; i++) d += `Q${f(x[i])} ${f(y[i])} ${f((x[i] + x[i + 1]) / 2)} ${f((y[i] + y[i + 1]) / 2)}`;
        d += `L${f(tip.x)} ${f(tip.y)}`;
      } else if (draft.mid) {
        const mx = (from.x + tip.x) / 2;
        const my = (from.y + tip.y) / 2;
        d += `Q${f(mx + 2 * (draft.mid.x - mx) * gain)} ${f(my + 2 * (draft.mid.y - my) * gain)} ${f(tip.x)} ${f(tip.y)}`;
      } else {
        d += `L${f(tip.x)} ${f(tip.y)}`;
      }
      draftPath.setAttribute("d", d);
      draftTip.setAttribute("visibility", draft.snap ? "hidden" : "visible");
      draftTip.setAttribute("cx", f(tip.x));
      draftTip.setAttribute("cy", f(tip.y));
    };

    // Contacts sound in the skin's own kit, as loud as they were hard.
    sim.onKnock = (speed) => { if (speed > 60) playPressSound(svg, "tick", Math.min(1.2, speed / 500)); };
    sim.onSnap = (caught) => { if (caught) playPressSound(svg, "tick", 0.8); };
    sim.onConnect = (from, to, speed) => {
      playPressSound(svg, "latch", Math.max(0.6, Math.min(1.2, 0.6 + speed / 1500)));
      setEdges((list) => [...list, { from, to, weight: 1 + Math.floor(Math.random() * 9) }]);
    };

    sim.render();
    return () => {
      drop(sim);
      simRef.current = null;
    };
  }, []);

  // A new edge has just been given its element: draw it where the simulation has it.
  useLayoutEffect(() => { simRef.current?.render(); }, [edges]);

  // Releasing outside the SVG still ends the gesture.
  useEffect(() => {
    const end = () => {
      const sim = simRef.current;
      const current = gesture.current;
      if (!sim || !current) return;
      if (current.kind === "node") sim.drop(current.id);
      else sim.end();
      gesture.current = null;
      wake(sim);
    };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, []);

  const point = (event: ReactPointerEvent | PointerEvent) => {
    const svg = svgRef.current!;
    const matrix = svg.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: p.x, y: p.y };
  };

  const start = (event: ReactPointerEvent<SVGElement>, id: string, handle: boolean) => {
    const sim = simRef.current;
    if (!sim || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    svgRef.current!.setPointerCapture(event.pointerId);
    sim.retune(physicsOf(svgRef.current!));
    setActive(id);
    const p = point(event);
    if (handle) {
      sim.begin(id, p.x, p.y);
      gesture.current = { kind: "edge" };
    } else {
      const node = sim.nodes.get(id)!;
      sim.grab(id);
      gesture.current = { kind: "node", id, dx: node.mass.x - p.x, dy: node.mass.y - p.y };
    }
    wake(sim);
  };

  const move = (event: ReactPointerEvent<SVGSVGElement>) => {
    const sim = simRef.current;
    const current = gesture.current;
    if (!sim || !current) return;
    const p = point(event);
    if (current.kind === "node") sim.drag(current.id, p.x + current.dx, p.y + current.dy);
    else sim.aim(p.x, p.y);
    wake(sim);
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      width={width}
      height={height}
      className={`pg-graph ${className ?? ""}`}
      role="application"
      aria-label="Graph. Drag a node to move it; drag a handle beside a node to draw an edge to another node."
      onPointerMove={move}
    >
      {edges.map((edge) => {
        const key = keyOf(edge.from, edge.to);
        const traversed = step?.traversedEdges.includes(key) ?? false;
        return (
          <g key={key} data-edge={key}>
            <path fill="none" stroke={traversed ? "var(--edge-traversal)" : "var(--edge-default)"} strokeWidth={traversed ? 3 : 2} strokeLinecap="round" style={{ transition: "stroke 240ms, stroke-width 240ms" }} />
            <g>
              <rect x="-11" y="-9" width="22" height="18" rx="3" fill="var(--color-surface)" stroke="var(--color-divider)" />
              <text y="4" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--color-text)" fontFamily="var(--value-font)">{edge.weight}</text>
            </g>
          </g>
        );
      })}
      <path data-draft="" fill="none" stroke="var(--edge-default)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
      <circle data-draft-tip="" r="3.5" fill="var(--color-node-stroke)" visibility="hidden" pointerEvents="none" />
      {NODES.map((node) => {
        const current = step?.current === node.id;
        const visited = step?.visited.includes(node.id) ?? false;
        const fill = node.id === "A" ? "var(--node-start)" : visited ? "var(--node-visited)" : "var(--node-default)";
        return (
          <g key={node.id} data-node={node.id} data-active={active === node.id || undefined} className="pg-node">
            {HANDLES.map(([x, y]) => (
              <g key={`${x},${y}`} className="pg-connector" onPointerDown={(event) => start(event, node.id, true)}>
                <circle cx={x} cy={y} r="12" fill="transparent" />
                <circle cx={x} cy={y} r="4" fill="var(--node-default)" stroke="var(--color-node-stroke)" strokeWidth="1" pointerEvents="none" />
              </g>
            ))}
            <circle className="pg-node-target" r={R + 5} fill="none" stroke="var(--color-accent-form)" strokeWidth="2" pointerEvents="none" />
            <circle r={R} fill={fill} stroke={current ? "var(--color-accent-form)" : "var(--node-stroke)"} strokeWidth={current ? 3 : 1.5} style={{ transition: "fill 240ms, stroke 160ms" }} onPointerDown={(event) => start(event, node.id, false)} />
            <text y="5" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--color-text)" pointerEvents="none">{node.id}</text>
          </g>
        );
      })}
    </svg>
  );
}
