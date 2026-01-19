import { useState, useEffect } from "react";
import { useSpring } from "motion/react";

interface UseSpringViewportOptions {
  zoomTarget: number;
  panTarget: { x: number; y: number };
  stiffness?: number;
  damping?: number;
}

/**
 * Hook to animate viewport zoom and pan using springs
 * Returns smoothly animated values that track the target values
 */
export function useSpringViewport({
  zoomTarget,
  panTarget,
  stiffness = 1500,
  damping = 80,
}: UseSpringViewportOptions) {
  const springConfig = { stiffness, damping };

  // Springs for zoom and pan - animating together prevents focal point drift
  const springZoom = useSpring(zoomTarget, springConfig);
  const springPanX = useSpring(panTarget.x, springConfig);
  const springPanY = useSpring(panTarget.y, springConfig);

  const [zoom, setZoom] = useState(zoomTarget);
  const [pan, setPan] = useState(panTarget);

  // Update spring targets
  useEffect(() => {
    springZoom.set(zoomTarget);
  }, [zoomTarget, springZoom]);

  useEffect(() => {
    springPanX.set(panTarget.x);
    springPanY.set(panTarget.y);
  }, [panTarget, springPanX, springPanY]);

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
