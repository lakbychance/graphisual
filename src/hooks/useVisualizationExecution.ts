import { useCallback } from "react";
import { useGraphStore } from "../store/graphStore";
import { algorithmRegistry, AlgorithmAdapter } from "../algorithms";
import { VisualizationMode, VisualizationState } from "../constants/visualization";
import { buildRun } from "../utils/visualization/buildRun";
import { sayProblem } from "../utils/visualization/sayProblem";
import { useAppHaptics } from "./useAppHaptics";
import { phoneNodeLimit } from "./useMediaQuery";

interface UseVisualizationExecutionReturn {
  runAlgorithm: (startNodeId: number, endNodeId?: number) => void;
  currentAlgorithm: AlgorithmAdapter | undefined;
  isVisualizing: boolean;
  visualizationInput: { startNodeId: number; endNodeId: number } | null;
  setVisualizationInput: (input: { startNodeId: number; endNodeId: number } | null) => void;
}

/**
 * Starts a visualization run for the selected algorithm.
 *
 * Both modes share one pipeline: the algorithm runs once and reports its events, the
 * store holds them as a run of steps (one change each), and `useAutoPlay` advances through it
 * (from the start in auto mode, on Play in manual mode). A run the adapter refuses
 * (no route, no cycle, ...) shows its message instead.
 */
export function useVisualizationExecution(): UseVisualizationExecutionReturn {
  const haptics = useAppHaptics();
  const visualizationAlgorithm = useGraphStore((state) => state.visualization.algorithm);
  const isVisualizing = useGraphStore((state) => state.visualization.state === VisualizationState.RUNNING);
  const visualizationInput = useGraphStore((state) => state.visualization.input);
  const setVisualizationInput = useGraphStore((state) => state.setVisualizationInput);

  const currentAlgorithm = visualizationAlgorithm?.key
    ? algorithmRegistry.get(visualizationAlgorithm.key)
    : undefined;

  const runAlgorithm = useCallback((startNodeId: number, endNodeId?: number) => {
    if (!currentAlgorithm) return;
    const { data, visualization, resetVisualization, selectNode, startVisualization } = useGraphStore.getState();
    const stepMode = visualization.mode === VisualizationMode.MANUAL;
    const built = buildRun(currentAlgorithm.metadata.id, data.nodes, data.edges, startNodeId, endNodeId, { stepMode, nodeLimit: phoneNodeLimit() });
    if (!built) return;

    if ("problem" in built) {
      resetVisualization();
      // The graph lacks a fact the algorithm needs (the toast names it and the canvas lights it), or the run found nothing.
      sayProblem(built);
      if (built.severity === "error") haptics.error();
      return;
    }

    selectNode(null);
    startVisualization(built.run);
  }, [currentAlgorithm, haptics]);

  return {
    runAlgorithm,
    currentAlgorithm,
    isVisualizing,
    visualizationInput,
    setVisualizationInput,
  };
}
