import { useState, useEffect } from "react";
import { useReducedMotion, useSpring } from "motion/react";

interface UseSpringViewportOptions {
  zoomTarget: number;
  panTarget: { x: number; y: number };
  stiffness?: number;
  damping?: number;
}

/**
 * Hook to animate viewport zoom and pan using springs
 * Returns smoothly animated values that track the target values.
 * With reduced motion the view jumps straight to its target instead.
 */
export function useSpringViewport({
  zoomTarget,
  panTarget,
  stiffness = 1500,
  damping = 80,
}: UseSpringViewportOptions) {
  const springConfig = { stiffness, damping };
  const reduced = !!useReducedMotion();

  // Springs for zoom and pan - animating together prevents focal point drift
  const springZoom = useSpring(zoomTarget, springConfig);
  const springPanX = useSpring(panTarget.x, springConfig);
  const springPanY = useSpring(panTarget.y, springConfig);

  const [zoom, setZoom] = useState(zoomTarget);
  const [pan, setPan] = useState(panTarget);

  // Update spring targets
  useEffect(() => {
    if (reduced) springZoom.jump(zoomTarget);
    else springZoom.set(zoomTarget);
  }, [zoomTarget, springZoom, reduced]);

  useEffect(() => {
    if (reduced) {
      springPanX.jump(panTarget.x);
      springPanY.jump(panTarget.y);
    } else {
      springPanX.set(panTarget.x);
      springPanY.set(panTarget.y);
    }
  }, [panTarget, springPanX, springPanY, reduced]);

  // Subscribe to spring changes
  useEffect(() => {
    const unsubZoom = springZoom.on("change", setZoom);
    const unsubPanX = springPanX.on("change", (x) => setPan((p) => ({ ...p, x })));
    const unsubPanY = springPanY.on("change", (y) => setPan((p) => ({ ...p, y })));
    return () => {
      unsubZoom();
      unsubPanX();
      unsubPanY();
    };
  }, [springZoom, springPanX, springPanY]);

  return { zoom, pan };
}
