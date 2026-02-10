import { useCallback, useRef } from "react";
import { DRAG_THRESHOLD, TIMING } from "../constants/ui";

interface UseCanvasPanProps {
  pan: { x: number; y: number };
  zoom: number;
  isGestureActive: () => boolean;
  setViewportPan: (x: number, y: number) => void;
}

export function useSVGCanvasPan({
  pan,
  zoom,
  isGestureActive,
  setViewportPan,
}: UseCanvasPanProps) {
  const isDraggingCanvas = useRef(false);
  const panAtDragStart = useRef({ x: 0, y: 0 });

  const handleCanvasPointerDown = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const target = event.target as SVGElement;
      if (target.tagName !== "svg") return;

      const svgElement = event.currentTarget;
      const startX = event.clientX;
      const startY = event.clientY;
      panAtDragStart.current = { ...pan };
      isDraggingCanvas.current = false;

      const handlePointerMove = (e: PointerEvent) => {
        if (isGestureActive()) return;
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        if (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD) {
          // Set cursor to grabbing when pan actually starts
          if (!isDraggingCanvas.current) {
            svgElement.style.cursor = 'grabbing';
          }
          isDraggingCanvas.current = true;
          setViewportPan(
            panAtDragStart.current.x + deltaX / zoom,
            panAtDragStart.current.y + deltaY / zoom
          );
        }
      };

      const handlePointerUp = () => {
        document.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerup", handlePointerUp);
        // Reset cursor
        svgElement.style.cursor = '';
        setTimeout(() => { isDraggingCanvas.current = false; }, TIMING.POPUP_DELAY);
      };

      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerUp);
    },
    [pan, zoom, isGestureActive, setViewportPan]
  );

  return { handleCanvasPointerDown, isDraggingCanvas };
}
