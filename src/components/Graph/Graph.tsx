import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Node } from "../Graph/Node/Node";
import { findToNodeForTouchBasedDevices } from "../../utility/calc";
import { DRAG_THRESHOLD, TIMING } from "../../utility/constants";
import { hasNegativeWeights, ALGORITHMS_NO_NEGATIVE_WEIGHTS } from "../../utility/graphUtils";
import { INode, IEdge, GraphSnapshot } from "./IGraph";
import { algorithmRegistry, AlgorithmType, EdgeInfo, AlgorithmStep } from "../../algorithms";
import { EdgePopup } from "./EdgePopup";
import { toast } from "sonner";
import { useGraphStore } from "../../store/graphStore";
import { useShallow } from "zustand/shallow";
import { debounce } from "../../utility/debounce";
import { CanvasDefs } from "./defs/CanvasDefs";
import { NodeDefs } from "./defs/NodeDefs";
import { EdgeDefs } from "./defs/EdgeDefs";
import { GridBackground } from "./GridBackground";
import { DragPreviewEdge } from "./DragPreviewEdge";

export const Graph = () => {
  // Get state from store
  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  // Subscribe to node IDs only for rendering - prevents re-renders when node positions change
  const nodeIds = useGraphStore(
    useShallow((state) => state.nodes.map((n) => n.id))
  );
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId);
  const selectedEdgeForEdit = useGraphStore((state) => state.selectedEdgeForEdit);
  const selectedAlgo = useGraphStore((state) => state.selectedAlgo);
  const algorithmSelection = useGraphStore((state) => state.algorithmSelection);
  const visualizationState = useGraphStore((state) => state.visualizationState);
  const visualizationSpeed = useGraphStore((state) => state.visualizationSpeed);

  // Derive boolean for simpler component logic and Node prop
  const isVisualizing = visualizationState === 'running';
  const zoom = useGraphStore((state) => state.zoom);
  const pan = useGraphStore((state) => state.pan);
  const stepMode = useGraphStore((state) => state.stepMode);
  const stepIndex = useGraphStore((state) => state.stepIndex);
  const stepHistory = useGraphStore((state) => state.stepHistory);

  const addNode = useGraphStore((state) => state.addNode);
  const moveNode = useGraphStore((state) => state.moveNode);
  const addEdge = useGraphStore((state) => state.addEdge);
  const selectNode = useGraphStore((state) => state.selectNode);
  const selectEdgeForEdit = useGraphStore((state) => state.selectEdgeForEdit);
  const clearEdgeSelection = useGraphStore((state) => state.clearEdgeSelection);
  const setAlgorithmSelection = useGraphStore((state) => state.setAlgorithmSelection);
  const setVisualizationState = useGraphStore((state) => state.setVisualizationState);
  const updateVisualizationState = useGraphStore((state) => state.updateVisualizationState);
  const resetAlgorithmState = useGraphStore((state) => state.resetAlgorithmState);
  const pushToPast = useGraphStore((state) => state.pushToPast);
  const updateEdgeTypeAction = useGraphStore((state) => state.updateEdgeType);
  const updateEdgeWeightAction = useGraphStore((state) => state.updateEdgeWeight);
  const reverseEdgeAction = useGraphStore((state) => state.reverseEdge);
  const deleteEdgeAction = useGraphStore((state) => state.deleteEdge);
  const setPan = useGraphStore((state) => state.setPan);
  const initStepThrough = useGraphStore((state) => state.initStepThrough);

  // Local UI state (not shared with other components)
  const [mockEdge, setMockEdge] = useState<IEdge | null>(null);
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });

  // Refs
  const graph = useRef<SVGSVGElement | null>(null);
  const isDraggingEdge = useRef(false);
  const justClosedPopup = useRef(false);
  const isDraggingCanvas = useRef(false);
  const dragStartSnapshot = useRef<GraphSnapshot | null>(null);

  // Refs to track latest state during visualization (for setTimeout callbacks)
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  // Helper to create a snapshot for history
  const createSnapshot = useCallback((
    newNodes: INode[],
    newEdges: Map<number, IEdge[]>,
    newNodeCounter: number
  ): GraphSnapshot => ({
    nodes: newNodes,
    edges: Array.from(newEdges.entries()).map(([k, v]) => [k, v || []]),
    nodeCounter: newNodeCounter,
  }), []);

  // Debounced function to record drag start state to history
  const debouncedRecordDrag = useMemo(
    () => debounce(() => {
      if (dragStartSnapshot.current) {
        pushToPast(dragStartSnapshot.current);
        dragStartSnapshot.current = null;
      }
    }, TIMING.DEBOUNCE),
    [pushToPast]
  );

  // Update SVG dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (graph.current) {
        const rect = graph.current.getBoundingClientRect();
        setSvgDimensions({ width: rect.width, height: rect.height });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Calculate viewBox based on zoom and pan
  const viewBox = useMemo(() => {
    if (svgDimensions.width === 0 || svgDimensions.height === 0) return undefined;
    const viewBoxWidth = svgDimensions.width / zoom;
    const viewBoxHeight = svgDimensions.height / zoom;
    // Center the view and apply pan offset (subtract pan to move view opposite to drag direction)
    const viewBoxMinX = (svgDimensions.width - viewBoxWidth) / 2 - pan.x;
    const viewBoxMinY = (svgDimensions.height - viewBoxHeight) / 2 - pan.y;
    return `${viewBoxMinX} ${viewBoxMinY} ${viewBoxWidth} ${viewBoxHeight}`;
  }, [svgDimensions, zoom, pan]);

  // Convert screen coordinates to SVG coordinates
  const screenToSvgCoords = useCallback((clientX: number, clientY: number) => {
    if (!graph.current) return { x: 0, y: 0 };
    const point = graph.current.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const ctm = graph.current.getScreenCTM()?.inverse();
    if (!ctm) return { x: 0, y: 0 };
    const svgPoint = point.matrixTransform(ctm);
    return { x: svgPoint.x, y: svgPoint.y };
  }, []);

  // Get the current algorithm from registry
  const currentAlgorithm = selectedAlgo?.key
    ? algorithmRegistry.get(selectedAlgo.key)
    : undefined;

  // Prevent touch scroll on SVG
  useEffect(() => {
    const graphEl = graph.current;
    if (graphEl) {
      const preventTouch = (e: TouchEvent) => e.preventDefault();
      graphEl.addEventListener("touchmove", preventTouch);
      return () => graphEl.removeEventListener("touchmove", preventTouch);
    }
  }, []);

  // Apply step-through visualization when stepIndex changes
  useEffect(() => {
    if (stepMode !== 'manual' || stepHistory.length === 0) return;
    if (stepIndex < 0) return;

    // Get cleaned state as base
    const { getCleanedState } = useGraphStore.getState();
    const { cleanedNodes, cleanedEdges } = getCleanedState();

    // Apply all steps up to current index
    const updatedNodes = [...cleanedNodes];
    const updatedEdges = new Map(cleanedEdges);

    for (let i = 0; i <= stepIndex; i++) {
      const step = stepHistory[i];
      const targetId = step.edge.to;
      const fromId = step.edge.from;

      // Mark the node
      const nodeIndex = updatedNodes.findIndex((n) => n.id === targetId);
      if (nodeIndex !== -1) {
        if (step.type === 'visit') {
          updatedNodes[nodeIndex] = { ...updatedNodes[nodeIndex], isVisited: true };
        } else {
          updatedNodes[nodeIndex] = { ...updatedNodes[nodeIndex], isInShortestPath: true };
        }
      }

      // Mark the edge (if not from root)
      if (fromId !== -1) {
        const edgeList = updatedEdges.get(fromId);
        if (edgeList) {
          const newEdgeList = edgeList.map((e) => {
            if (parseInt(e.to) === targetId) {
              if (step.type === 'visit') {
                return { ...e, isUsedInTraversal: true };
              } else {
                return { ...e, isUsedInShortestPath: true };
              }
            }
            return e;
          });
          updatedEdges.set(fromId, newEdgeList);
        }
      }
    }

    updateVisualizationState(updatedNodes, updatedEdges);
  }, [stepMode, stepIndex, stepHistory, updateVisualizationState]);

  // Visualization helper
  const visualizeSetState = useCallback((
    currentEdge: IEdge,
    edgeAttribute: string,
    nodeAttribute: string
  ) => {
    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;

    // Convert currentEdge from/to to strings for comparison (IEdge uses strings, algorithm uses numbers)
    const currentFrom = String(currentEdge.from);
    const currentTo = String(currentEdge.to);

    const updatedEdges = new Map<number, IEdge[]>();

    currentEdges.forEach((list, nodeId) => {
      if (!list) {
        updatedEdges.set(nodeId, []);
        return;
      }

      const newList = list.map((edge) => {
        // Directed edge match
        if (edge.type === "directed" && edge.from === currentFrom && edge.to === currentTo) {
          return { ...edge, [edgeAttribute]: true };
        }
        // Undirected edge match (forward direction)
        if (edge.type === "undirected" && edge.from === currentFrom && edge.to === currentTo) {
          return { ...edge, [edgeAttribute]: true };
        }
        // Undirected edge match (reverse direction)
        if (edge.type === "undirected" && edge.from === currentTo && edge.to === currentFrom) {
          return { ...edge, [edgeAttribute]: true };
        }
        return edge;
      });

      updatedEdges.set(nodeId, newList);
    });

    const updatedNodes = currentNodes.map((node) => {
      if (node.id === parseInt(currentEdge.to)) {
        return { ...node, [nodeAttribute]: true };
      }
      return node;
    });

    updateVisualizationState(updatedNodes, updatedEdges);
  }, [updateVisualizationState]);

  const visualizeShortestPath = useCallback((shortestPath: IEdge[]) => {
    for (let i = 0; i <= shortestPath.length; i++) {
      if (i === shortestPath.length) {
        setTimeout(() => {
          setVisualizationState('done');
          resetAlgorithmState();
        }, visualizationSpeed * i);
        return;
      }
      setTimeout(() => {
        const currentEdge = shortestPath[i];
        const isNodeInShortestPath = nodesRef.current.some((node) => {
          if (node.id === parseInt(currentEdge.to)) {
            return node.isInShortestPath === true;
          }
          return false;
        });
        if (!isNodeInShortestPath) {
          visualizeSetState(currentEdge, "isUsedInShortestPath", "isInShortestPath");
        }
      }, visualizationSpeed * i);
    }
  }, [visualizationSpeed, visualizeSetState, setVisualizationState, resetAlgorithmState]);

  const visualizeGraph = useCallback((visitedEdges: IEdge[], shortestPath: IEdge[] = []) => {
    setVisualizationState('running');

    for (let i = 0; i <= visitedEdges.length; i++) {
      if (i === visitedEdges.length) {
        setTimeout(() => {
          setAlgorithmSelection(null);
          visualizeShortestPath(shortestPath);
        }, visualizationSpeed * i);
        return;
      }
      setTimeout(() => {
        const currentEdge = visitedEdges[i];
        const isNodeTraversed = nodesRef.current.some((node) => {
          if (node.id === parseInt(currentEdge.to)) {
            return node.isVisited === true;
          }
          return false;
        });
        if (!isNodeTraversed) {
          visualizeSetState(currentEdge, "isUsedInTraversal", "isVisited");
        }
      }, visualizationSpeed * i);
    }
  }, [visualizationSpeed, visualizeShortestPath, visualizeSetState, setVisualizationState, setAlgorithmSelection]);

  // Convert edges to algorithm input format
  const convertToAlgorithmInput = useCallback((): Map<number, EdgeInfo[]> => {
    const result = new Map<number, EdgeInfo[]>();
    edges.forEach((edgeList, nodeId) => {
      const converted: EdgeInfo[] = (edgeList || []).map((e) => ({
        from: parseInt(e.from),
        to: parseInt(e.to),
        weight: e.weight,
        type: e.type as "directed" | "undirected",
      }));
      result.set(nodeId, converted);
    });
    return result;
  }, [edges]);

  // Convert algorithm result to visualization format
  const convertToVisualizationEdges = useCallback((edgeRefs: Array<{ from: number; to: number }>): IEdge[] => {
    return edgeRefs.map((ref) => ({
      x1: NaN, x2: NaN, y1: NaN, y2: NaN, nodeX2: NaN, nodeY2: NaN,
      from: ref.from === -1 ? "Infinity" : ref.from.toString(),
      to: ref.to.toString(),
      type: "directed",
      weight: NaN,
      isUsedInTraversal: false,
    }));
  }, []);

  // Run algorithm
  const runAlgorithm = useCallback((startNodeId: number, endNodeId?: number) => {
    if (!currentAlgorithm) return;

    // Check for negative weights with incompatible algorithms
    if (selectedAlgo?.key && ALGORITHMS_NO_NEGATIVE_WEIGHTS.has(selectedAlgo.key) && hasNegativeWeights(edges)) {
      toast.warning(`${selectedAlgo.text} doesn't support negative edge weights. Use Bellman-Ford instead.`);
      setAlgorithmSelection(null);
      resetAlgorithmState();
      return;
    }

    const input = {
      adjacencyList: convertToAlgorithmInput(),
      nodes: nodes.map((n) => ({ id: n.id, x: n.x, y: n.y })),
      startNodeId,
      endNodeId,
    };

    // Check if algorithm has a generator (for step-through mode)
    if (stepMode === 'manual' && currentAlgorithm.generator) {
      // Run execute() first to check for errors (same logic as auto mode)
      const result = currentAlgorithm.execute(input);

      if (result.error) {
        const failureMessage = currentAlgorithm.metadata.failureMessage || "Graph violates the requirements of the algorithm.";
        toast.error(failureMessage);
        setAlgorithmSelection(null);
        resetAlgorithmState();
        return;
      }

      // No error - collect steps from generator for step-through visualization
      const generator = currentAlgorithm.generator(input);
      const steps: AlgorithmStep[] = [...generator];

      // Initialize step-through mode
      initStepThrough(steps);
      return;
    }

    // Auto mode: use existing setTimeout-based visualization
    const result = currentAlgorithm.execute(input);

    if (result.error) {
      const failureMessage = currentAlgorithm.metadata.failureMessage || "Graph violates the requirements of the algorithm.";
      toast.error(failureMessage);
      setAlgorithmSelection(null);
      resetAlgorithmState();
      return;
    }

    const visitedEdges = convertToVisualizationEdges(result.visitedEdges);
    const resultEdges = result.resultEdges ? convertToVisualizationEdges(result.resultEdges) : [];
    visualizeGraph(visitedEdges, resultEdges);
  }, [currentAlgorithm, nodes, edges, selectedAlgo, stepMode, convertToAlgorithmInput, convertToVisualizationEdges, visualizeGraph, setAlgorithmSelection, resetAlgorithmState, initStepThrough]);

  // Store pan at drag start for relative panning
  const panAtDragStart = useRef({ x: 0, y: 0 });

  // Handle canvas pointer down - implements panning
  const handleCanvasPointerDown = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    const target = event.target as SVGElement;
    if (target.tagName !== "svg") return;
    if (isVisualizing) return; // Don't pan during visualization

    const startX = event.clientX;
    const startY = event.clientY;
    panAtDragStart.current = { ...pan };
    isDraggingCanvas.current = false;

    const handlePointerMove = (e: PointerEvent) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      if (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD) {
        isDraggingCanvas.current = true;
        // Scale delta by zoom for consistent feel at different zoom levels
        setPan(panAtDragStart.current.x + deltaX / zoom, panAtDragStart.current.y + deltaY / zoom);
      }
    };

    const handlePointerUp = () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      setTimeout(() => { isDraggingCanvas.current = false; }, TIMING.POPUP_DELAY);
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
  }, [pan, zoom, isVisualizing, setPan]);

  // Handle click on canvas/node
  const handleSelect = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    const target = event.target as SVGSVGElement;
    const isNode = target.tagName === "circle";

    // Algorithm mode
    if (currentAlgorithm && isNode && !isVisualizing) {
      const nodeId = parseInt(target.id);
      const algoType = currentAlgorithm.metadata.type;

      if (algoType === AlgorithmType.PATHFINDING) {
        if (!algorithmSelection) {
          setAlgorithmSelection({ startNodeId: nodeId, endNodeId: -1 });
        } else {
          setAlgorithmSelection({ ...algorithmSelection, endNodeId: nodeId });
          runAlgorithm(algorithmSelection.startNodeId, nodeId);
        }
      } else {
        runAlgorithm(nodeId);
      }
      return;
    }

    // Deselect node when clicking canvas
    if (!isNode && selectedNodeId !== null) {
      selectNode(null);
    }

    // Create node on empty canvas (not during visualization or algorithm selection)
    if (!isNode && selectedNodeId === null && !selectedEdgeForEdit && !isDraggingEdge.current && !justClosedPopup.current && !isDraggingCanvas.current && !isVisualizing && !currentAlgorithm) {
      const { x, y } = screenToSvgCoords(event.clientX, event.clientY);
      addNode(x, y);
    }
  }, [currentAlgorithm, isVisualizing, algorithmSelection, selectedNodeId, selectedEdgeForEdit, screenToSvgCoords, runAlgorithm, setAlgorithmSelection, selectNode, addNode]);

  // Handle edge click
  const handleEdge = useCallback((edge: IEdge, fromNodeId: number, clickPosition: { x: number; y: number }) => {
    if (isVisualizing) return;
    const { nodes } = useGraphStore.getState();
    const fromNode = nodes.find(n => n.id === fromNodeId);
    if (!fromNode) return;
    selectEdgeForEdit(edge, fromNode, clickPosition);
  }, [isVisualizing, selectEdgeForEdit]);

  // Close edge popup
  const closeEdgePopup = useCallback(() => {
    justClosedPopup.current = true;
    clearEdgeSelection();
    setTimeout(() => { justClosedPopup.current = false; }, TIMING.POPUP_DELAY);
  }, [clearEdgeSelection]);

  // Update edge type
  const updateEdgeType = useCallback((newType: "directed" | "undirected") => {
    if (!selectedEdgeForEdit) return;
    const { edge, sourceNode } = selectedEdgeForEdit;
    updateEdgeTypeAction(sourceNode.id, parseInt(edge.to), newType);
  }, [selectedEdgeForEdit, updateEdgeTypeAction]);

  // Update edge weight
  const updateEdgeWeight = useCallback((newWeight: number) => {
    if (!selectedEdgeForEdit) return;
    const { edge, sourceNode } = selectedEdgeForEdit;
    updateEdgeWeightAction(sourceNode.id, parseInt(edge.to), newWeight);
  }, [selectedEdgeForEdit, updateEdgeWeightAction]);

  // Reverse edge
  const reverseEdge = useCallback(() => {
    if (!selectedEdgeForEdit) return;
    const { edge, sourceNode } = selectedEdgeForEdit;
    reverseEdgeAction(sourceNode.id, parseInt(edge.to));
  }, [selectedEdgeForEdit, reverseEdgeAction]);

  // Delete edge
  const deleteEdge = useCallback(() => {
    if (!selectedEdgeForEdit) return;
    const { edge, sourceNode } = selectedEdgeForEdit;
    deleteEdgeAction(sourceNode.id, parseInt(edge.to));
  }, [selectedEdgeForEdit, deleteEdgeAction]);

  // Handle node movement
  const handleNodeMove = useCallback((nodeId: number, x: number, y: number) => {
    // Get current state at call-time instead of closing over nodes/edges
    const { nodes, edges, nodeCounter } = useGraphStore.getState();

    // Capture state before first move
    if (!dragStartSnapshot.current) {
      dragStartSnapshot.current = createSnapshot(nodes, edges, nodeCounter);
    }
    moveNode(nodeId, x, y);
    debouncedRecordDrag();
  }, [createSnapshot, debouncedRecordDrag, moveNode]);

  // Handle connector drag start
  const handleConnectorDragStart = useCallback(
    (sourceNodeId: number, _position: string, startX: number, startY: number) => {
      if (!graph.current) return;
      isDraggingEdge.current = true;

      const handlePointerMove = (e: PointerEvent) => {
        const { x: endX, y: endY } = screenToSvgCoords(e.clientX, e.clientY);
        setMockEdge({
          x1: startX, y1: startY, x2: endX, y2: endY,
          nodeX2: 0, nodeY2: 0,
          from: sourceNodeId.toString(), to: "",
          weight: 0, type: "directed",
        });
      };

      const handlePointerUp = (e: PointerEvent) => {
        document.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerup", handlePointerUp);

        // Get current state at call-time
        const { nodes, edges } = useGraphStore.getState();
        const sourceNode = nodes.find(n => n.id === sourceNodeId);
        if (!sourceNode) { setMockEdge(null); return; }

        const target = e.target as SVGElement;
        let targetNode: INode | undefined;

        if (target.tagName === "circle" && target.id) {
          const targetNodeId = parseInt(target.id);
          if (!isNaN(targetNodeId)) {
            targetNode = nodes.find((n) => n.id === targetNodeId);
          }
        }

        if (!targetNode) {
          const { x: endX, y: endY } = screenToSvgCoords(e.clientX, e.clientY);
          targetNode = findToNodeForTouchBasedDevices(endX, endY, nodes);
        }

        if (targetNode && targetNode.id !== sourceNodeId) {
          const existingEdges = edges.get(sourceNodeId) || [];
          const edgeExists = existingEdges.some((edge) => parseInt(edge.to) === targetNode!.id);

          if (!edgeExists) {
            addEdge(sourceNode, targetNode);
          }
        }

        setMockEdge(null);
        setTimeout(() => { isDraggingEdge.current = false; }, TIMING.POPUP_DELAY);
      };

      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerUp);
    },
    [screenToSvgCoords, addEdge]
  );

  return (
    <div className="relative flex-1 w-full h-full flex flex-col">
      <svg
        ref={graph}
        className="flex-1 w-full h-full cursor-crosshair"
        onPointerDown={handleCanvasPointerDown}
        onClick={handleSelect}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <CanvasDefs />
          <NodeDefs />
          <EdgeDefs />
        </defs>

        <GridBackground />

        {nodeIds.map((nodeId) => (
          <Node
            key={nodeId}
            nodeId={nodeId}
            onNodeMove={handleNodeMove}
            onEdgeClick={handleEdge}
            onConnectorDragStart={handleConnectorDragStart}
            isVisualizing={isVisualizing}
            isAlgorithmSelected={!!currentAlgorithm}
            svgRef={graph}
            onNodeSelect={selectNode}
            screenToSvgCoords={screenToSvgCoords}
          />
        ))}

        <DragPreviewEdge edge={mockEdge} />

      </svg>

      {/* Edge popup - rendered outside SVG using Popover */}
      {selectedEdgeForEdit && (() => {
        const { edge, clickPosition } = selectedEdgeForEdit;
        return (
          <EdgePopup
            edge={edge}
            anchorPosition={clickPosition}
            onClose={closeEdgePopup}
            onUpdateType={updateEdgeType}
            onUpdateWeight={updateEdgeWeight}
            onReverse={reverseEdge}
            onDelete={deleteEdge}
          />
        );
      })()}
    </div>
  );
};
