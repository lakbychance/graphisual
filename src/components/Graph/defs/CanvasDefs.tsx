/**
 * Canvas-related SVG definitions (grid patterns)
 */
export const CanvasDefs = () => (
  <>
    {/* Grid pattern - minor lines (24px spacing) */}
    <pattern id="gridMinor" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="var(--color-grid-line)" strokeWidth="1"/>
    </pattern>

    {/* Grid pattern - major lines (120px spacing, every 5 cells) */}
    <pattern id="gridMajor" width="120" height="120" patternUnits="userSpaceOnUse">
      <path d="M 120 0 L 0 0 0 120" fill="none" stroke="var(--color-grid-line-major)" strokeWidth="1"/>
    </pattern>
  </>
);
