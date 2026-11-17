/**
 * Edge-related SVG definitions (arrow markers for all edge states)
 */
export const EdgeDefs = () => (
  <>
    {/* Shared arrow markers for directed edges (the default one is also on the edge being drawn) */}
    <marker
      id="arrowhead-default"
      markerWidth="9"
      markerHeight="7"
      refX="8.7"
      refY="3.5"
      orient="auto"
      style={{ fill: 'var(--color-node-stroke)' }}
    >
      <polygon points="0 0, 10 3.5, 0 7" />
    </marker>
    <marker
      id="arrowhead-traversal"
      markerWidth="9"
      markerHeight="7"
      refX="8.7"
      refY="3.5"
      orient="auto"
      style={{ fill: 'var(--color-arrow-traversal)' }}
    >
      <polygon points="0 0, 10 3.5, 0 7" />
    </marker>
    <marker
      id="arrowhead-path"
      markerWidth="9"
      markerHeight="7"
      refX="8.7"
      refY="3.5"
      orient="auto"
      style={{ fill: 'var(--color-arrow-path)' }}
    >
      <polygon points="0 0, 10 3.5, 0 7" />
    </marker>
    <marker
      id="arrowhead-focused"
      markerWidth="9"
      markerHeight="7"
      refX="8.7"
      refY="3.5"
      orient="auto"
      style={{ fill: 'var(--color-accent-form)' }}
    >
      <polygon points="0 0, 10 3.5, 0 7" />
    </marker>
    <marker
      id="arrowhead-cycle"
      markerWidth="9"
      markerHeight="7"
      refX="8.7"
      refY="3.5"
      orient="auto"
      style={{ fill: 'var(--color-arrow-cycle)' }}
    >
      <polygon points="0 0, 10 3.5, 0 7" />
    </marker>
  </>
);
