import { useCallback } from "react";
import { useVisualizationExecution } from "./useVisualizationExecution";
import { AlgorithmType } from "../algorithms";
import { useAppHaptics } from "./useAppHaptics";
import { selectIsAwaitingPick, useGraphStore } from "../store/graphStore";
import { tooBigToRun } from "../utils/visualization/buildRun";
import { sayProblem } from "../utils/visualization/sayProblem";
import { phoneNodeLimit } from "./useMediaQuery";

/**
 * Return type for the useAlgorithmNodeClick hook.
 */
interface UseAlgorithmNodeClickReturn {
  handleNodeClick: (nodeId: number) => void;
  isWaitingForEndNode: boolean;
}

/**
 * Hook that encapsulates algorithm node click handling logic.
 *
 * This abstracts the shared click handling behavior between 2D and 3D views:
 * - For pathfinding algorithms: first click selects start node, second click selects end node and runs
 * - For traversal/tree algorithms: single click runs the algorithm from that node
 * - During a run, in Run it: a click picks the node the run waits for (`pickNode`); otherwise nothing
 *
 * USAGE:
 * Call in Graph.tsx and Graph3D.tsx to get consistent click handling.
 */
export function useAlgorithmNodeClick(): UseAlgorithmNodeClickReturn {
  const haptics = useAppHaptics();
  const {
    runAlgorithm,
    currentAlgorithm,
    isVisualizing,
    visualizationInput,
    setVisualizationInput,
  } = useVisualizationExecution();

  const handleNodeClick = useCallback((nodeId: number) => {
    if (isVisualizing) {
      const store = useGraphStore.getState();
      if (selectIsAwaitingPick(store)) {
        haptics.light();
        store.pickNode(nodeId);
      }
      return;
    }
    if (!currentAlgorithm) return;

    const algoType = currentAlgorithm.metadata.type;

    if (algoType === AlgorithmType.PATHFINDING) {
      if (!visualizationInput) {
        // A graph too big for a phone is refused at the first tap, as the second tap would be (D71).
        const store = useGraphStore.getState();
        const tooBig = tooBigToRun(store.data.nodes.length, phoneNodeLimit());
        if (tooBig) {
          store.resetVisualization();
          sayProblem(tooBig);
          return;
        }
        // First click: set start node
        setVisualizationInput({ startNodeId: nodeId, endNodeId: -1 });
        haptics.light();
      } else {
        // Second click: set end node and run algorithm
        setVisualizationInput({ ...visualizationInput, endNodeId: nodeId });
        haptics.light();
        runAlgorithm(visualizationInput.startNodeId, nodeId);
      }
    } else {
      // Traversal/Tree algorithms: single click runs the algorithm
      haptics.light();
      runAlgorithm(nodeId);
    }
  }, [currentAlgorithm, isVisualizing, visualizationInput, setVisualizationInput, runAlgorithm, haptics]);

  const isWaitingForEndNode = !!visualizationInput && visualizationInput.endNodeId === -1;

  return { handleNodeClick, isWaitingForEndNode };
}
