import { useEffect, useRef } from "react";
import { debounce } from "@/utils/debounce";

interface UseScrollPanOptions {
  elementRef: React.RefObject<HTMLElement | SVGSVGElement | null>;
  zoom: number;
  pan: { x: number; y: number };
  setPan: (x: number, y: number) => void;
}

const debouncedSetCursor = debounce((el: HTMLElement, cursor: string) => {
  el.style.cursor = cursor;
}, 750);

/**
 * Hook to handle two-finger trackpad scroll and mouse wheel scroll as canvas panning.
 * Only handles non-ctrlKey wheel events — ctrlKey events are left for useGestureZoom.
 */
export function useScrollPan({
  elementRef,
  zoom,
  pan,
  setPan,
}: UseScrollPanOptions): void {
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  zoomRef.current = zoom;
  panRef.current = pan;

  useEffect(() => {
    const el = elementRef.current as HTMLElement | null;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return; // Let useGestureZoom handle pinch-to-zoom

      e.preventDefault();

      const panSensitivity = 1 / zoomRef.current;
      setPan(
        panRef.current.x - e.deltaX * panSensitivity,
        panRef.current.y - e.deltaY * panSensitivity,
      );
      el.style.cursor = "grabbing";
      debouncedSetCursor(el, "");
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [elementRef, setPan]);
}
