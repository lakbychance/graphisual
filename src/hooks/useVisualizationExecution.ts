import { useCallback } from "react";
import { toast } from "sonner";
import { useGraphStore } from "../store/graphStore";
import { algorithmRegistry, AlgorithmAdapter, AlgorithmInput, EdgeInfo } from "../algorithms";
import { hasNegativeWeights, ALGORITHMS_NO_NEGATIVE_WEIGHTS } from "../utils/graph/graphUtils";
import { VisualizationState } from "../constants/visualization";
import { type EdgeType } from "../constants/graph";
import { useAppHaptics } from "./useAppHaptics";

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
 * Both modes share one pipeline: the algorithm runs once and produces the step list,
 * the store holds it, and `useAutoPlay` advances through it (from the start in auto
 * mode, on Play in manual mode).
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
    const { data, resetVisualization, selectNode, startVisualization } = useGraphStore.getState();
    const { id, name } = currentAlgorithm.metadata;

    if (ALGORITHMS_NO_NEGATIVE_WEIGHTS.has(id) && hasNegativeWeights(data.edges)) {
      toast.warning(`${name} doesn't support negative edge weights. Use Bellman-Ford instead.`);
      resetVisualization();
      return;
    }

    const adjacencyList = new Map<number, EdgeInfo[]>();
    data.edges.forEach((edgeList, nodeId) => {
      adjacencyList.set(nodeId, (edgeList || []).map((e) => ({
        from: e.from,
        to: e.to,
        weight: e.weight,
        type: e.type as EdgeType,
      })));
    });
    const input: AlgorithmInput = {
      adjacencyList,
      nodes: data.nodes.map((n) => ({ id: n.id })),
      startNodeId,
      endNodeId,
    };

    const { error, steps } = currentAlgorithm.execute(input);
    if (error) {
      toast.error(error);
      haptics.error();
      resetVisualization();
      return;
    }

    selectNode(null);
    startVisualization(steps);
  }, [currentAlgorithm, haptics]);

  return {
    runAlgorithm,
    currentAlgorithm,
    isVisualizing,
    visualizationInput,
    setVisualizationInput,
  };
}
