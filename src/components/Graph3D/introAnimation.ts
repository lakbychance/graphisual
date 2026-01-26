import { useState, useRef, useCallback, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Starting z-position for intro animation (below grid)
const INTRO_START_Z = -80;

// Clipping plane to hide geometry below the grid (z < -5)
const gridClippingPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 5);

// Clipping planes array for materials
const clippingPlanes = [gridClippingPlane];

// Shared animation state - driven externally via setProgress
const sharedState = {
  progress: 0, // 0 to 1
};

// Hook for intro animation
export function useIntroAnimation(): {
  animationRef: React.RefObject<THREE.Group | null>;
  opacity: number;
  clippingPlanes: THREE.Plane[];
  setProgress: (progress: number) => void;
} {
  const animationRef = useRef<THREE.Group>(null);
  const [opacity, setOpacity] = useState(0);

  // Reset on mount (idempotent - multiple hooks resetting to 0 is fine)
  useEffect(() => {
    sharedState.progress = 0;
  }, []);

  const setProgress = useCallback((progress: number) => {
    sharedState.progress = Math.min(Math.max(progress, 0), 1);
  }, []);

  useFrame(() => {
    // Ease out cubic
    const eased = 1 - Math.pow(1 - sharedState.progress, 3);

    // Update z-position if ref is attached
    if (animationRef.current) {
      animationRef.current.position.z = INTRO_START_Z * (1 - eased);
    }

    // Update opacity
    if (opacity !== eased) {
      setOpacity(eased);
    }
  });

  return { animationRef, opacity, clippingPlanes, setProgress };
}
