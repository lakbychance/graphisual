import { useEffect, useRef } from "react";
import { useGraphStore, selectIsAutoPlaying } from "../store/graphStore";
import { VisualizationMode } from "../constants/visualization";

/**
 * Owns the auto-play interval for step-through mode.
 *
 * Reacts to `isAutoPlaying` in the store: starts the interval when true,
 * cancels it (via effect cleanup) when false. Any store action that sets
 * `isAutoPlaying: false` — stepForward reaching the last step, stopAutoPlay,
 * resetStepThrough — automatically cancels the interval with no extra code.
 */
export function useAutoPlay(): void {
  const isAutoPlaying = useGraphStore(selectIsAutoPlaying);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAutoPlaying) {
      return;
    }

    const speed = useGraphStore.getState().visualization.speed;

    intervalRef.current = window.setInterval(() => {
      const { visualization, stepForward, stopAutoPlay } = useGraphStore.getState();

      if (visualization.mode !== VisualizationMode.MANUAL) {
        stopAutoPlay();
        return;
      }

      const { step } = visualization;
      if (step.isComplete || step.index >= step.history.length - 1) {
        stopAutoPlay();
        return;
      }

      stepForward();
    }, speed);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAutoPlaying]);
}
