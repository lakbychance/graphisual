import { useEffect } from "react";
import { useGraphStore, selectIsPlaying } from "../store/graphStore";
import { VisualizationMode } from "../constants/visualization";

/**
 * Advances the current run one step per `speed` ms while it is playing.
 *
 * Auto mode plays from the moment the run starts; manual mode plays while the user
 * has pressed Play. This is the only place the two modes behave differently: when the
 * last step is on screen, auto mode ends the run and manual mode simply stops.
 */
export function useAutoPlay(): void {
  const isPlaying = useGraphStore(selectIsPlaying);

  useEffect(() => {
    if (!isPlaying) return;

    const speed = useGraphStore.getState().visualization.speed;
    const id = window.setInterval(() => {
      const store = useGraphStore.getState();
      const { mode, step } = store.visualization;

      if (step.index < step.history.length - 1) {
        store.stepForward();
      } else if (mode === VisualizationMode.AUTO) {
        store.finishVisualization();
      } else {
        store.stopAutoPlay();
      }
    }, speed);

    return () => clearInterval(id);
  }, [isPlaying]);
}
