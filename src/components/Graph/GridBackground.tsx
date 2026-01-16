import { memo } from "react";

/**
 * Infinite grid background that pans/zooms with the canvas
 */
export const GridBackground = memo(() => (
  <>
    <rect x="-10000" y="-10000" width="20000" height="20000" fill="url(#gridMinor)" pointerEvents="none" />
    <rect x="-10000" y="-10000" width="20000" height="20000" fill="url(#gridMajor)" pointerEvents="none" />
  </>
));
