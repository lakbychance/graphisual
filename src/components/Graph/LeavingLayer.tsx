import { draftPath, useLeaving } from "@/physics/graphMotion";

/**
 * What is on its way out of the graph: deleted nodes fading in the manner of
 * the theme, and the edges they held drawing back into the nodes that remain.
 * Purely visual and short-lived; the store has already forgotten them.
 */
export const LeavingLayer = () => {
  const leaving = useLeaving();
  if (!leaving) return null;

  return (
    <g className="pointer-events-none" aria-hidden="true">
      {leaving.edges.map((shape, index) => (
        <path
          key={index}
          d={draftPath(shape)}
          fill="none"
          strokeLinecap="round"
          style={{ stroke: "var(--color-edge-default)", strokeWidth: 2 }}
        />
      ))}
      {leaving.nodes.map((node) => (
        <g key={node.id} transform={`translate(${node.x} ${node.y}) scale(${node.scale})`} opacity={node.opacity}>
          <circle r={node.r} style={{ fill: "var(--gradient-default-mid)", stroke: "var(--color-node-stroke)", strokeWidth: 1.5 }} />
          <circle r={node.r} fill="url(#crosshatch)" mask="url(#sphereMask)" />
          <text
            className="select-none font-bold text-sm [text-anchor:middle] [dominant-baseline:central] lg:text-xs"
            style={{ fill: "var(--color-text)" }}
          >
            {node.label}
          </text>
        </g>
      ))}
    </g>
  );
};
