import { useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useGraphStore } from "../store/graphStore";
import { algorithmRegistry, EdgeInfo, AlgorithmStep, AlgorithmAdapter } from "../algorithms";
import { hasNegativeWeights, ALGORITHMS_NO_NEGATIVE_WEIGHTS } from "../utils/graph/graphUtils";
import { VisualizationState, VisualizationMode, StepType } from "../constants/visualization";
import { EDGE_TYPE, type EdgeType } from "../constants/graph";
import { animateSequence, AnimationController } from "../utils/animation/animateSequence";
import { applyVisualizationStep } from "../utils/visualization/applyVisualizationStep";
import { GraphEdge } from "../components/Graph/types";

/**
 * Return type for the useVisualizationExecution hook.
 */
export interface UseVisualizationExecutionReturn {
  runAlgorithm: (startNodeId: number, endNodeId?: number) => void;
  currentAlgorithm: AlgorithmAdapter | undefined;
  isVisualizing: boolean;
  visualizationInput: { startNodeId: number; endNodeId: number } | null;
  setVisualizationInput: (input: { startNodeId: number; endNodeId: number } | null) => void;
}

/**
 * Hook that encapsulates all visualization execution logic.
 *
 * Handles:
 * - Algorithm execution (auto and manual modes)
 * - Animation sequencing for traversal and result paths
 * - Edge/node marking during visualization
 * - Negative weight validation
 *
 * USAGE:
 * Call in Graph.tsx to get visualization controls.
 * Use runAlgorithm in click handlers to start visualization.
 */
export function useVisualizationExecution(): UseVisualizationExecutionReturn {
  // Get state from store
  const nodes = useGraphStore((state) => state.data.nodes);
  const edges = useGraphStore((state) => state.data.edges);
  const visualizationAlgorithm = useGraphStore((state) => state.visualization.algorithm);
  const visualizationState = useGraphStore((state) => state.visualization.state);
  const visualizationSpeed = useGraphStore((state) => state.visualization.speed);
  const visualizationMode = useGraphStore((state) => state.visualization.mode);
  const visualizationInput = useGraphStore((state) => state.visualization.input);

  // Get actions from store
  const setVisualizationInput = useGraphStore((state) => state.setVisualizationInput);
  const setVisualizationState = useGraphStore((state) => state.setVisualizationState);
  const resetVisualization = useGraphStore((state) => state.resetVisualization);
  const initStepThrough = useGraphStore((state) => state.initStepThrough);
  const selectNode = useGraphStore((state) => state.selectNode);

  // Derive boolean for simpler logic
  const isVisualizing = visualizationState === VisualizationState.RUNNING;

  // Refs to track latest state during visualization (for setTimeout callbacks)
  const edgesRef = useRef(edges);
  edgesRef.current = edges;

  // Animation controller for cancellation
  const animationRef = useRef<AnimationController | null>(null);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      animationRef.current?.cancel();
    };
  }, []);

  // Get the current algorithm from registry
  const currentAlgorithm = visualizationAlgorithm?.key
    ? algorithmRegistry.get(visualizationAlgorithm.key)
    : undefined;

  // Marks an edge and its target node for visualization (using shared utility)
  const markEdgeAndNode = useCallback((currentEdge: GraphEdge, stepType: StepType) => {
    applyVisualizationStep(currentEdge, stepType, edgesRef.current);
  }, []);

  // Animates the result/shortest path
  const visualizeResultPath = useCallback((resultEdges: GraphEdge[]) => {
    animationRef.current = animateSequence({
      items: resultEdges,
      delayMs: visualizationSpeed,
      onStep: (edge) => {
        // Always mark edge and node - setTraceNode/setTraceEdge are idempotent
        markEdgeAndNode(edge, StepType.RESULT);
      },
      onComplete: () => {
        setVisualizationState(VisualizationState.DONE);
        resetVisualization();
      },
    });
  }, [visualizationSpeed, markEdgeAndNode, setVisualizationState, resetVisualization]);

  // Animates traversal, then chains to result path visualization
  const visualizeTraversedEdges = useCallback((visitedEdges: GraphEdge[], resultEdges: GraphEdge[] = []) => {
    animationRef.current?.cancel();
    setVisualizationState(VisualizationState.RUNNING);

    animationRef.current = animateSequence({
      items: visitedEdges,
      delayMs: visualizationSpeed,
      onStep: (edge) => {
        // Always mark edge and node - setTraceNode/setTraceEdge are idempotent
        markEdgeAndNode(edge, StepType.VISIT);
      },
      onComplete: () => {
        setVisualizationInput(null);
        visualizeResultPath(resultEdges);
      },
    });
  }, [visualizationSpeed, visualizeResultPath, markEdgeAndNode, setVisualizationState, setVisualizationInput]);

  // Convert edges to algorithm input format
  const convertToAlgorithmInput = useCallback((): Map<number, EdgeInfo[]> => {
    const result = new Map<number, EdgeInfo[]>();
    edges.forEach((edgeList, nodeId) => {
      const converted: EdgeInfo[] = (edgeList || []).map((e) => ({
        from: e.from,
        to: e.to,
        weight: e.weight,
        type: e.type as EdgeType,
      }));
      result.set(nodeId, converted);
    });
    return result;
  }, [edges]);

  // Convert algorithm result to visualization format
  const convertToVisualizationEdges = useCallback((edgeRefs: Array<{ from: number; to: number }>): GraphEdge[] => {
    return edgeRefs.map((ref) => ({
      x1: NaN, x2: NaN, y1: NaN, y2: NaN, nodeX2: NaN, nodeY2: NaN,
      from: ref.from,
      to: ref.to,
      type: EDGE_TYPE.DIRECTED,
      weight: NaN,
    }));
  }, []);

  // Run algorithm
  const runAlgorithm = useCallback((startNodeId: number, endNodeId?: number) => {
    if (!currentAlgorithm) return;

    // Check for negative weights with incompatible algorithms
    if (visualizationAlgorithm?.key && ALGORITHMS_NO_NEGATIVE_WEIGHTS.has(visualizationAlgorithm.key) && hasNegativeWeights(edges)) {
      toast.warning(`${visualizationAlgorithm.text} doesn't support negative edge weights. Use Bellman-Ford instead.`);
      setVisualizationInput(null);
      resetVisualization();
      return;
    }

    const input = {
      adjacencyList: convertToAlgorithmInput(),
      nodes: nodes.map((n) => ({ id: n.id, x: n.x, y: n.y })),
      startNodeId,
      endNodeId,
    };

    // Check if algorithm has a generator (for step-through mode)
    if (visualizationMode === VisualizationMode.MANUAL && currentAlgorithm.generator) {
      // Run execute() first to check for errors (same logic as auto mode)
      const result = currentAlgorithm.execute(input);

      if (result.error) {
        const failureMessage = currentAlgorithm.metadata.failureMessage || "Graph violates the requirements of the algorithm.";
        toast.error(failureMessage);
        setVisualizationInput(null);
        resetVisualization();
        return;
      }

      // No error - collect steps from generator for step-through visualization
      const generator = currentAlgorithm.generator(input);
      const steps: AlgorithmStep[] = [...generator];

      // Clear node selection when visualization starts
      selectNode(null);

      // Initialize step-through mode
      initStepThrough(steps);
      return;
    }

    // Auto mode: use existing setTimeout-based visualization
    const result = currentAlgorithm.execute(input);

    if (result.error) {
      const failureMessage = currentAlgorithm.metadata.failureMessage || "Graph violates the requirements of the algorithm.";
      toast.error(failureMessage);
      setVisualizationInput(null);
      resetVisualization();
      return;
    }

    // Clear node selection when visualization starts
    selectNode(null);

    const visitedEdges = convertToVisualizationEdges(result.visitedEdges);
    const resultEdges = result.resultEdges ? convertToVisualizationEdges(result.resultEdges) : [];
    visualizeTraversedEdges(visitedEdges, resultEdges);
  }, [currentAlgorithm, nodes, edges, visualizationAlgorithm, visualizationMode, convertToAlgorithmInput, convertToVisualizationEdges, visualizeTraversedEdges, setVisualizationInput, resetVisualization, initStepThrough, selectNode]);

  return {
    runAlgorithm,
    currentAlgorithm,
    isVisualizing,
    visualizationInput,
    setVisualizationInput,
  };
}
