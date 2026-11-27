import { useEffect } from "react";
import { useGraphStore } from "../store/graphStore";
import { algorithmRegistry } from "../algorithms";
import { VisualizationMode } from "../constants/visualization";
import { buildRun } from "../utils/visualization/buildRun";
import { sayProblem } from "../utils/visualization/sayProblem";
import { decodeStepLink, needsDestination } from "../utils/visualization/stepLink";

/**
 * Opens the moment a link carries (see `stepLink.ts`) on mount, and cleans the URL.
 *
 * `?algorithm=` selects the algorithm and loads the linked graph (or the algorithm's own). With
 * `from` (and `to` where the algorithm needs one) the run starts, at the linked step, as if the
 * learner had tapped the nodes and stepped there. Whatever the link cannot honour leaves the app
 * waiting for the taps it still needs.
 */
export function useAlgorithmFromUrl() {
  useEffect(() => {
    const moment = decodeStepLink(window.location.search);
    if (!moment) return;
    const { algorithm, graph, from, to, step } = moment;

    const store = useGraphStore.getState();
    store.setVisualizationAlgorithm({ key: algorithm, text: algorithmRegistry.get(algorithm)!.metadata.name });
    store.setVisualizationMode(VisualizationMode.MANUAL);
    store.setGraph(graph.nodes, graph.edges, graph.nodeCounter);

    if (from !== null && needsDestination(algorithm) && to === null) {
      // As after the first tap: waiting for the destination.
      store.setVisualizationInput({ startNodeId: from, endNodeId: -1 });
    } else if (from !== null) {
      const built = buildRun(algorithm, graph.nodes, graph.edges, from, to ?? undefined, { stepMode: true });
      if (built && "run" in built) {
        if (to !== null) store.setVisualizationInput({ startNodeId: from, endNodeId: to });
        store.startVisualization(built.run);
        store.jumpToStep((step ?? 1) - 1);
      } else if (built) {
        // The message tapping these nodes would show; the algorithm stays selected for another try.
        // Sent once this first render's effects are done, so the toaster is listening.
        window.setTimeout(() => sayProblem(built));
      }
    }

    window.history.replaceState({}, "", "/");
  }, []);
}
