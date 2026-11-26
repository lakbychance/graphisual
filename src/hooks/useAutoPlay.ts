import { useEffect } from "react";
import { useGraphStore, selectIsPlaying, selectShowsReply } from "../store/graphStore";
import { VisualizationMode } from "../constants/visualization";
import { TIMING } from "../constants/ui";

/**
 * Advances the current run one step per `speed` ms while it is playing. The step that shows
 * Bellman-Ford's reply to a Run it answer is held longer (`TIMING.REPLY_HOLD`), long enough to read
 * before the run's next sentence takes its place.
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
    const delay = () => (selectShowsReply(useGraphStore.getState()) ? Math.max(speed, TIMING.REPLY_HOLD) : speed);
    let id = 0;
    const tick = () => {
      const store = useGraphStore.getState();
      const { mode, step } = store.visualization;

      if (step.index < step.run.ends.length - 1) {
        store.stepForward();
      } else if (mode === VisualizationMode.AUTO) {
        store.finishVisualization();
      } else {
        store.stopAutoPlay();
      }
      id = window.setTimeout(tick, delay());
    };
    id = window.setTimeout(tick, delay());

    return () => clearTimeout(id);
  }, [isPlaying]);
}
