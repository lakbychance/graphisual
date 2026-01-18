import { useEffect } from "react";
import { useGraphStore, selectStepIndex, selectStepHistory } from "../store/graphStore";
import { VisualizationState, VisualizationMode, StepType } from "../constants";

/**
 * Hook that synchronizes step-through visualization state.
 *
 * When in manual mode, this hook watches the stepIndex and applies
 * the appropriate trace flags (isVisited, isInShortestPath) to nodes
 * and edges based on all steps up to the current index.
 *
 * USAGE:
 * Call once in Graph.tsx to enable step-through visualization.
 * The hook reads from the store and applies visualization side effects.
 */
export function useStepThroughVisualization(): void {
  const visualizationMode = useGraphStore((state) => state.visualization.mode);
  const stepIndex = useGraphStore(selectStepIndex);
  const stepHistory = useGraphStore(selectStepHistory);

  useEffect(() => {
    // Only run in manual step-through mode with active history
    if (visualizationMode !== VisualizationMode.MANUAL || stepHistory.length === 0) {
      return;
    }

    const { clearVisualization, setTraceNode, setTraceEdge } = useGraphStore.getState();

    // Clear previous visualization (but preserve running state)
    clearVisualization();

    // Restore running state since clearVisualization sets it to idle
    const { visualization } = useGraphStore.getState();
    useGraphStore.setState({
      visualization: { ...visualization, state: VisualizationState.RUNNING },
    });

    // No steps applied yet (index = -1)
    if (stepIndex < 0) return;

    // Apply all steps up to current index
    for (let i = 0; i <= stepIndex; i++) {
      const step = stepHistory[i];
      const targetId = step.edge.to;
      const fromId = step.edge.from;

      // Mark the node based on step type
      if (step.type === StepType.VISIT) {
        setTraceNode(targetId, { isVisited: true });
      } else {
        setTraceNode(targetId, { isInShortestPath: true });
      }

      // Mark the edge (if not from root, indicated by -1)
      if (fromId !== -1) {
        if (step.type === StepType.VISIT) {
          setTraceEdge(fromId, targetId, { isUsedInTraversal: true });
        } else {
          setTraceEdge(fromId, targetId, { isUsedInShortestPath: true });
        }
      }
    }
  }, [visualizationMode, stepIndex, stepHistory]);
}
