import { EDGES, NODES, type BfsStep } from "./mock";

/** Static graph drawn purely from skin tokens, lit by a BFS step. */
export function GraphPreview({ step, width = 520, height = 300, className }: { step: BfsStep; width?: number; height?: number; className?: string }) {
  const key = (a: string, b: string) => [a, b].sort().join("-");
  return (
    <svg viewBox="0 0 520 300" width={width} height={height} className={className} role="img" aria-label="Preview graph">
      {EDGES.map((e) => {
        const a = NODES.find((n) => n.id === e.from)!;
        const b = NODES.find((n) => n.id === e.to)!;
        const traversed = step.traversedEdges.includes(key(e.from, e.to));
        const mx = (a.x + b.x) / 2; const my = (a.y + b.y) / 2;
        return (
          <g key={key(e.from, e.to)}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={traversed ? "var(--edge-traversal)" : "var(--edge-default)"} strokeWidth={traversed ? 3 : 2} style={{ transition: "stroke 240ms, stroke-width 240ms" }} />
            <rect x={mx - 11} y={my - 9} width="22" height="18" rx="3" fill="var(--color-surface)" stroke="var(--color-divider)" />
            <text x={mx} y={my + 4} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--color-text)" fontFamily="var(--value-font)">{e.weight}</text>
          </g>
        );
      })}
      {NODES.map((n) => {
        const isCurrent = step.current === n.id;
        const visited = step.visited.includes(n.id);
        const fill = n.id === "A" ? "var(--node-start)" : visited ? "var(--node-visited)" : "var(--node-default)";
        return (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r="24" fill={fill} stroke={isCurrent ? "var(--color-accent-form)" : "var(--node-stroke)"} strokeWidth={isCurrent ? 3 : 1.5} style={{ transition: "fill 240ms, stroke 160ms" }} />
            <text x={n.x} y={n.y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--color-text)">{n.id}</text>
          </g>
        );
      })}
    </svg>
  );
}
