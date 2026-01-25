import { useCallback, useEffect, useRef } from "react";
import { ZOOM } from "../utility/constants";

interface UseGestureZoomOptions {
  svgRef: React.RefObject<SVGSVGElement | null>;
  zoom: number;
  setZoom: (zoom: number) => void;
  pan: { x: number; y: number };
  setPan: (x: number, y: number) => void;
  minZoom?: number;
  maxZoom?: number;
}

interface UseGestureZoomReturn {
  isGestureActive: () => boolean;
}

/**
 * Hook to handle both pinch-to-zoom (touch) and trackpad pinch (wheel) gestures on an SVG element
 * Zooms toward the focal point for both gesture types
 */
export function useGestureZoom({
  svgRef,
  zoom,
  setZoom,
  pan,
  setPan,
  minZoom = ZOOM.MIN,
  maxZoom = ZOOM.MAX,
}: UseGestureZoomOptions): UseGestureZoomReturn {
  // Keep current values in refs so handlers always have latest values
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  zoomRef.current = zoom;
  panRef.current = pan;

  // Internal gesture state - exposed via isGestureActive function
  const gestureActiveRef = useRef(false);

  // Track previous frame values for incremental touch calculation
  const prevDistance = useRef<number | null>(null);
  const prevCenter = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    // Core focal zoom logic (shared by touch + wheel)
    const zoomAtPoint = (newZoom: number, focalX: number, focalY: number) => {
      const rect = svg.getBoundingClientRect();
      const svgCenterX = rect.width / 2;
      const svgCenterY = rect.height / 2;

      const zoomDelta = 1 / zoomRef.current - 1 / newZoom;
      const newPanX = panRef.current.x + zoomDelta * (svgCenterX - focalX);
      const newPanY = panRef.current.y + zoomDelta * (svgCenterY - focalY);

      setZoom(newZoom);
      setPan(newPanX, newPanY);
    };

    // === Touch pinch handlers ===

    // Calculate distance between two touch points
    const getDistance = (t1: Touch, t2: Touch): number =>
      Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

    // Calculate midpoint between two touch points (in client coords relative to SVG)
    const getMidpoint = (t1: Touch, t2: Touch): { x: number; y: number } => {
      const rect = svg.getBoundingClientRect();
      return {
        x: (t1.clientX + t2.clientX) / 2 - rect.left,
        y: (t1.clientY + t2.clientY) / 2 - rect.top,
      };
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Initialize tracking for incremental updates
        prevDistance.current = getDistance(e.touches[0], e.touches[1]);
        prevCenter.current = getMidpoint(e.touches[0], e.touches[1]);
        gestureActiveRef.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // Prevent page scroll on touch
      if (e.touches.length === 2 && prevDistance.current !== null) {
        const currentDistance = getDistance(e.touches[0], e.touches[1]);
        const currentCenter = getMidpoint(e.touches[0], e.touches[1]);

        // Calculate zoom change from previous frame
        const scale = currentDistance / prevDistance.current;
        const prevZoom = zoomRef.current;
        const newZoom = Math.min(maxZoom, Math.max(minZoom, prevZoom * scale));

        // Only update if zoom actually changed (not clamped at limits)
        if (newZoom !== prevZoom) {
          zoomAtPoint(newZoom, currentCenter.x, currentCenter.y);
        }

        // Update previous values for next frame
        prevDistance.current = currentDistance;
        prevCenter.current = currentCenter;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        prevDistance.current = null;
        gestureActiveRef.current = false;
      }
    };

    // === Wheel handler (trackpad pinch) ===

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      // Calculate zoom change (deltaY is negative when zooming in)
      const zoomSensitivity = 0.01;
      const zoomDelta = -e.deltaY * zoomSensitivity;
      const currentZoom = zoomRef.current;
      const newZoom = Math.min(maxZoom, Math.max(minZoom, currentZoom + zoomDelta));

      if (newZoom === currentZoom) return;

      // Calculate focal point (cursor position relative to SVG)
      const rect = svg.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      zoomAtPoint(newZoom, cursorX, cursorY);
    };

    // Attach all event listeners
    svg.addEventListener("touchstart", handleTouchStart, { passive: true });
    svg.addEventListener("touchmove", handleTouchMove, { passive: false });
    svg.addEventListener("touchend", handleTouchEnd, { passive: true });
    svg.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      svg.removeEventListener("touchstart", handleTouchStart);
      svg.removeEventListener("touchmove", handleTouchMove);
      svg.removeEventListener("touchend", handleTouchEnd);
      svg.removeEventListener("wheel", handleWheel);
    };
  }, [svgRef, setZoom, setPan, minZoom, maxZoom]);

  // Stable function reference - reads from ref so always returns current value
  const isGestureActive = useCallback(() => gestureActiveRef.current, []);

  return { isGestureActive };
}
