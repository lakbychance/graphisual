import { useCallback } from "react";
import { useVisualizationExecution } from "./useVisualizationExecution";
import { AlgorithmType } from "../algorithms";

/**
 * Return type for the useAlgorithmNodeClick hook.
 */
export interface UseAlgorithmNodeClickReturn {
  handleNodeClick: (nodeId: number) => void;
  isWaitingForEndNode: boolean;
}

/**
 * Hook that encapsulates algorithm node click handling logic.
 *
 * This abstracts the shared click handling behavior between 2D and 3D views:
 * - For pathfinding algorithms: first click selects start node, second click selects end node and runs
 * - For traversal/tree algorithms: single click runs the algorithm from that node
 *
 * USAGE:
 * Call in Graph.tsx and Graph3D.tsx to get consistent click handling.
 */
export function useAlgorithmNodeClick(): UseAlgorithmNodeClickReturn {
  const {
    runAlgorithm,
    currentAlgorithm,
    isVisualizing,
    visualizationInput,
    setVisualizationInput,
  } = useVisualizationExecution();

  const handleNodeClick = useCallback((nodeId: number) => {
    if (!currentAlgorithm || isVisualizing) return;

    const algoType = currentAlgorithm.metadata.type;

    if (algoType === AlgorithmType.PATHFINDING) {
      if (!visualizationInput) {
        // First click: set start node
        setVisualizationInput({ startNodeId: nodeId, endNodeId: -1 });
      } else {
        // Second click: set end node and run algorithm
        setVisualizationInput({ ...visualizationInput, endNodeId: nodeId });
        runAlgorithm(visualizationInput.startNodeId, nodeId);
      }
    } else {
      // Traversal/Tree algorithms: single click runs the algorithm
      runAlgorithm(nodeId);
    }
  }, [currentAlgorithm, isVisualizing, visualizationInput, setVisualizationInput, runAlgorithm]);

  const isWaitingForEndNode = !!visualizationInput && visualizationInput.endNodeId === -1;

  return { handleNodeClick, isWaitingForEndNode };
}
