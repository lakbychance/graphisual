import { memo } from "react";
import { NODE_GRADIENT } from "../../../constants";

/**
 * Node-related SVG definitions (crosshatch pattern, sphere mask, gradients)
 */
export const NodeDefs = memo(() => (
  <>
    {/* Crosshatch pattern for node shading */}
    <pattern id="crosshatch" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="3" stroke="var(--color-text)" strokeWidth="0.8" opacity="0.25" />
    </pattern>

    {/* Radial gradient for sphere mask - white=visible, black=hidden */}
    {/* Offset to top-left (35%) for lighting effect */}
    <radialGradient id="sphereMaskGradient" cx="35%" cy="35%" r="60%">
      <stop offset="0%" stopColor="black" />
      <stop offset="40%" stopColor="#444" />
      <stop offset="100%" stopColor="white" />
    </radialGradient>

    {/* Mask using objectBoundingBox so it scales to each element */}
    <mask id="sphereMask" maskContentUnits="objectBoundingBox">
      <circle cx="0.5" cy="0.5" r="0.5" fill="url(#sphereMaskGradient)" />
    </mask>

    {/* Node gradients for different states */}
    <linearGradient id={NODE_GRADIENT.DEFAULT} x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style={{ stopColor: 'var(--gradient-default-start)' }} />
      <stop offset="50%" style={{ stopColor: 'var(--gradient-default-mid)' }} />
      <stop offset="100%" style={{ stopColor: 'var(--gradient-default-end)' }} />
    </linearGradient>

    <linearGradient id={NODE_GRADIENT.VISITED} x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style={{ stopColor: 'var(--gradient-visited-start)' }} />
      <stop offset="50%" style={{ stopColor: 'var(--gradient-visited-mid)' }} />
      <stop offset="100%" style={{ stopColor: 'var(--gradient-visited-end)' }} />
    </linearGradient>

    <linearGradient id={NODE_GRADIENT.PATH} x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style={{ stopColor: 'var(--gradient-path-start)' }} />
      <stop offset="50%" style={{ stopColor: 'var(--gradient-path-mid)' }} />
      <stop offset="100%" style={{ stopColor: 'var(--gradient-path-end)' }} />
    </linearGradient>

    <linearGradient id={NODE_GRADIENT.START} x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style={{ stopColor: 'var(--gradient-start-start)' }} />
      <stop offset="50%" style={{ stopColor: 'var(--gradient-start-mid)' }} />
      <stop offset="100%" style={{ stopColor: 'var(--gradient-start-end)' }} />
    </linearGradient>

    <linearGradient id={NODE_GRADIENT.END} x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style={{ stopColor: 'var(--gradient-end-start)' }} />
      <stop offset="50%" style={{ stopColor: 'var(--gradient-end-mid)' }} />
      <stop offset="100%" style={{ stopColor: 'var(--gradient-end-end)' }} />
    </linearGradient>
  </>
));
