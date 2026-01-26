import { useCallback, useState } from "react";
import * as THREE from "three";

// Starting z-position for intro animation (below grid)
const INTRO_START_Z = -80;

// Clipping plane to hide geometry below the grid (z < -5)
const gridClippingPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 5);

// Clipping planes array for materials
export const introClippingPlanes = [gridClippingPlane];

// Easing function - ease out cubic for smooth deceleration
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// Computed animation values
interface IntroAnimationValues {
  opacity: number;
  zOffset: number;
}

// Compute derived values from progress
function computeValues(progress: number): IntroAnimationValues {
  const eased = easeOutCubic(progress);
  return {
    opacity: eased,
    zOffset: INTRO_START_Z * (1 - eased),
  };
}

// Hook for intro animation - only use once in Graph3D (inside Canvas)
export function useIntroAnimation() {
  const [progress, setProgressState] = useState(0);
  const values = computeValues(progress);

  const setProgress = useCallback((p: number) => {
    setProgressState(Math.min(Math.max(p, 0), 1));
  }, []);

  return {
    values,
    setProgress,
  };
}
