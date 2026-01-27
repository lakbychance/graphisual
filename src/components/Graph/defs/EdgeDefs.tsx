/**
 * Edge-related SVG definitions (arrow markers for all edge states)
 */
export const EdgeDefs = () => (
  <>
    {/* Arrow marker for drag preview edge */}
    <marker
      id="mockArrowHead"
      markerWidth="10"
      markerHeight="7"
      refX="0"
      refY="3.5"
      orient="auto"
      style={{ fill: 'var(--color-edge-default)' }}
    >
      <polygon points="0 0, 10 3.5, 0 7" />
    </marker>

    {/* Shared arrow markers for directed edges - 3 states */}
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
  </>
);
