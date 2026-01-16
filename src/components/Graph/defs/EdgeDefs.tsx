/**
 * Edge-related SVG definitions (mock arrow marker for drag preview)
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
  </>
);
