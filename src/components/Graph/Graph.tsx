import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Node } from "../Graph/Node/Node";
import { findToNodeForTouchBasedDevices } from "../../utility/calc";
import { isModKey } from "../../utility/keyboard";
import { ZOOM, DRAG_THRESHOLD, TIMING } from "../../utility/constants";
import { INode, IEdge, GraphSnapshot } from "./IGraph";
import { algorithmRegistry, AlgorithmType, EdgeInfo, AlgorithmStep } from "../../algorithms";
import { EdgePopup } from "./EdgePopup";
import { toast } from "sonner";
import { useGraphStore } from "../../store/graphStore";
import debounce from "lodash-es/debounce";

export const Graph = () => {
  // Get state from store
  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const nodeCounter = useGraphStore((state) => state.nodeCounter);
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId);
  const selectedEdgeForEdit = useGraphStore((state) => state.selectedEdgeForEdit);
  const selectedAlgo = useGraphStore((state) => state.selectedAlgo);
  const nodeSelection = useGraphStore((state) => state.nodeSelection);
  const pathFindingNode = useGraphStore((state) => state.pathFindingNode);
  const isVisualizing = useGraphStore((state) => state.isVisualizing);
  const visualizationSpeed = useGraphStore((state) => state.visualizationSpeed);
  const zoom = useGraphStore((state) => state.zoom);
  const pan = useGraphStore((state) => state.pan);
  const stepMode = useGraphStore((state) => state.stepMode);
  const stepIndex = useGraphStore((state) => state.stepIndex);
  const stepHistory = useGraphStore((state) => state.stepHistory);
  const canUndo = useGraphStore((state) => state.canUndo());
  const canRedo = useGraphStore((state) => state.canRedo());

  // Get actions from store
  const addNodeAction = useGraphStore((state) => state.addNode);
  const moveNodeAction = useGraphStore((state) => state.moveNode);
  const deleteNodeAction = useGraphStore((state) => state.deleteNode);
  const addEdgeAction = useGraphStore((state) => state.addEdge);
  const selectNode = useGraphStore((state) => state.selectNode);
  const selectEdgeForEditAction = useGraphStore((state) => state.selectEdgeForEdit);
  const clearEdgeSelection = useGraphStore((state) => state.clearEdgeSelection);
  const setPathFindingNode = useGraphStore((state) => state.setPathFindingNode);
  const setVisualizing = useGraphStore((state) => state.setVisualizing);
  const setVisualizationDone = useGraphStore((state) => state.setVisualizationDone);
  const setNodeSelection = useGraphStore((state) => state.setNodeSelection);
  const updateVisualizationState = useGraphStore((state) => state.updateVisualizationState);
  const resetAlgorithmState = useGraphStore((state) => state.resetAlgorithmState);
  const undo = useGraphStore((state) => state.undo);
  const redo = useGraphStore((state) => state.redo);
  const pushToPast = useGraphStore((state) => state.pushToPast);
  const updateEdgeTypeAction = useGraphStore((state) => state.updateEdgeType);
  const updateEdgeWeightAction = useGraphStore((state) => state.updateEdgeWeight);
  const reverseEdgeAction = useGraphStore((state) => state.reverseEdge);
  const deleteEdgeAction = useGraphStore((state) => state.deleteEdge);
  const setPan = useGraphStore((state) => state.setPan);
  const setZoom = useGraphStore((state) => state.setZoom);
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

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo
      if (isModKey(e) && e.key === "z" && !e.shiftKey && !isVisualizing) {
        e.preventDefault();
        if (canUndo) undo();
        return;
      }
      // Redo
      if (isModKey(e) && ((e.key === "z" && e.shiftKey) || e.key === "y") && !isVisualizing) {
        e.preventDefault();
        if (canRedo) redo();
        return;
      }
      // Delete selected node
      if ((e.key === "Delete" || e.key === "Backspace") && selectedNodeId !== null && !isVisualizing) {
        e.preventDefault();
        deleteNodeAction(selectedNodeId);
        return;
      }
      // Escape to deselect
      if (e.key === "Escape") {
        selectNode(null);
      }
      // Zoom in (Cmd/Ctrl + Plus or Cmd/Ctrl + Equals)
      if (isModKey(e) && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        const currentZoom = useGraphStore.getState().zoom;
        setZoom(Math.min(currentZoom + ZOOM.STEP, ZOOM.MAX));
        return;
      }
      // Zoom out (Cmd/Ctrl + Minus)
      if (isModKey(e) && e.key === "-") {
        e.preventDefault();
        const currentZoom = useGraphStore.getState().zoom;
        setZoom(Math.max(currentZoom - ZOOM.STEP, ZOOM.MIN));
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedNodeId, isVisualizing, canUndo, canRedo, undo, redo, deleteNodeAction, selectNode, setZoom]);

  // Visualization helper
  const visualizeSetState = useCallback((
    currentEdge: IEdge,
    edgeAttribute: string,
    nodeAttribute: string
  ) => {
    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;

    const updatedEdges = new Map(currentEdges);
    updatedEdges.forEach((list) => {
      list?.forEach((edge) => {
        if (edge.type === "directed" && edge.from === currentEdge.from && edge.to === currentEdge.to) {
          (edge as Record<string, unknown>)[edgeAttribute] = true;
        }
        if (edge.type === "undirected") {
          if (edge.from === currentEdge.from && edge.to === currentEdge.to) {
            (edge as Record<string, unknown>)[edgeAttribute] = true;
            updatedEdges.get(parseInt(currentEdge.to))?.forEach((e) => {
              if (e.to === currentEdge.from) {
                (e as Record<string, unknown>)[edgeAttribute] = true;
              }
            });
          }
        }
      });
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
          setVisualizing(false);
          setVisualizationDone(true);
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
  }, [visualizationSpeed, setVisualizing, setVisualizationDone, resetAlgorithmState, visualizeSetState]);

  const visualizeGraph = useCallback((visitedEdges: IEdge[], shortestPath: IEdge[] = []) => {
    setNodeSelection({
      ...nodeSelection,
      isStartNodeSelected: false,
      isEndNodeSelected: false,
    });
    setVisualizing(true);

    for (let i = 0; i <= visitedEdges.length; i++) {
      if (i === visitedEdges.length) {
        setTimeout(() => {
          setPathFindingNode(null);
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
  }, [visualizationSpeed, nodeSelection, setVisualizing, setNodeSelection, setPathFindingNode, visualizeShortestPath, visualizeSetState]);

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

    const input = {
      adjacencyList: convertToAlgorithmInput(),
      nodes: nodes.map((n) => ({ id: n.id })),
      startNodeId,
      endNodeId,
    };

    // Check if algorithm has a generator (for step-through mode)
    if (stepMode === 'manual' && currentAlgorithm.generator) {
      // Collect all steps from generator
      const generator = currentAlgorithm.generator(input);
      const steps: AlgorithmStep[] = [...generator];

      if (steps.length === 0) {
        const failureMessage = currentAlgorithm.metadata.failureMessage || "Graph violates the requirements of the algorithm.";
        toast.error(failureMessage);
        setPathFindingNode(null);
        resetAlgorithmState();
        return;
      }

      // Initialize step-through mode
      setNodeSelection({
        ...nodeSelection,
        isStartNodeSelected: false,
        isEndNodeSelected: false,
      });
      initStepThrough(steps);
      return;
    }

    // Auto mode: use existing setTimeout-based visualization
    const result = currentAlgorithm.execute(input);

    if (result.error) {
      const failureMessage = currentAlgorithm.metadata.failureMessage || "Graph violates the requirements of the algorithm.";
      toast.error(failureMessage);
      setPathFindingNode(null);
      resetAlgorithmState();
      return;
    }

    const visitedEdges = convertToVisualizationEdges(result.visitedEdges);
    const resultEdges = result.resultEdges ? convertToVisualizationEdges(result.resultEdges) : [];
    visualizeGraph(visitedEdges, resultEdges);
  }, [currentAlgorithm, nodes, stepMode, nodeSelection, convertToAlgorithmInput, convertToVisualizationEdges, visualizeGraph, setPathFindingNode, resetAlgorithmState, setNodeSelection, initStepThrough]);

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
        if (!pathFindingNode) {
          setPathFindingNode({ startNodeId: nodeId, endNodeId: -1 });
        } else {
          setPathFindingNode({ ...pathFindingNode, endNodeId: nodeId });
          runAlgorithm(pathFindingNode.startNodeId, nodeId);
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
    if (!isNode && !selectedEdgeForEdit && !isDraggingEdge.current && !justClosedPopup.current && !isDraggingCanvas.current && !isVisualizing && !currentAlgorithm) {
      const { x, y } = screenToSvgCoords(event.clientX, event.clientY);
      addNodeAction(x, y);
    }
  }, [currentAlgorithm, isVisualizing, pathFindingNode, selectedNodeId, selectedEdgeForEdit, screenToSvgCoords, addNodeAction, selectNode, setPathFindingNode, runAlgorithm]);

  // Handle edge click
  const handleEdge = useCallback((edge: IEdge, fromNode: INode, clickPosition: { x: number; y: number }) => {
    if (isVisualizing) return;
    selectEdgeForEditAction(edge, fromNode, clickPosition);
  }, [isVisualizing, selectEdgeForEditAction]);

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
    // Capture state before first move
    if (!dragStartSnapshot.current) {
      dragStartSnapshot.current = createSnapshot(nodes, edges, nodeCounter);
    }
    moveNodeAction(nodeId, x, y);
    debouncedRecordDrag();
  }, [nodes, edges, nodeCounter, createSnapshot, moveNodeAction, debouncedRecordDrag]);

  // Handle connector drag start
  const handleConnectorDragStart = useCallback(
    (sourceNode: INode, _position: string, startX: number, startY: number) => {
      if (!graph.current) return;
      isDraggingEdge.current = true;

      const handlePointerMove = (e: PointerEvent) => {
        const { x: endX, y: endY } = screenToSvgCoords(e.clientX, e.clientY);
        setMockEdge({
          x1: startX, y1: startY, x2: endX, y2: endY,
          nodeX2: 0, nodeY2: 0,
          from: sourceNode.id.toString(), to: "",
          weight: 0, type: "directed",
        });
      };

      const handlePointerUp = (e: PointerEvent) => {
        document.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerup", handlePointerUp);

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

        if (targetNode && targetNode.id !== sourceNode.id) {
          const existingEdges = edges.get(sourceNode.id) || [];
          const edgeExists = existingEdges.some((edge) => parseInt(edge.to) === targetNode!.id);

          if (!edgeExists) {
            addEdgeAction(sourceNode, targetNode);
          }
        }

        setMockEdge(null);
        setTimeout(() => { isDraggingEdge.current = false; }, TIMING.POPUP_DELAY);
      };

      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerUp);
    },
    [nodes, edges, screenToSvgCoords, addEdgeAction]
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
          {/* Grid pattern - minor lines (24px spacing) */}
          <pattern id="gridMinor" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="var(--color-grid-line)" strokeWidth="1"/>
          </pattern>

          {/* Grid pattern - major lines (120px spacing, every 5 cells) */}
          <pattern id="gridMajor" width="120" height="120" patternUnits="userSpaceOnUse">
            <path d="M 120 0 L 0 0 0 120" fill="none" stroke="var(--color-grid-line-major)" strokeWidth="1"/>
          </pattern>

          {/* Crosshatch pattern for node shading */}
          <pattern id="crosshatch" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="3" stroke="var(--color-text)" strokeWidth="0.8" opacity="0.25" />
          </pattern>

          {/* Radial gradient for sphere mask - white=visible, black=hidden */}
          {/* Offset to top-left (35%) for lighting effect */}
          <radialGradient id="sphereMaskGradient" cx="35%" cy="35%" r="60%">
            <stop offset="0%" stopColor="black" />
            <stop offset="40%" stopColor="#444" />
            <stop offset="100%" stopColor="white" />
          </radialGradient>

          {/* Mask using objectBoundingBox so it scales to each element */}
          <mask id="sphereMask" maskContentUnits="objectBoundingBox">
            <circle cx="0.5" cy="0.5" r="0.5" fill="url(#sphereMaskGradient)" />
          </mask>

          <linearGradient id="nodeGradientDefault" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: 'var(--gradient-default-start)' }} />
            <stop offset="50%" style={{ stopColor: 'var(--gradient-default-mid)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--gradient-default-end)' }} />
          </linearGradient>
          <linearGradient id="nodeGradientVisited" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: 'var(--gradient-visited-start)' }} />
            <stop offset="50%" style={{ stopColor: 'var(--gradient-visited-mid)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--gradient-visited-end)' }} />
          </linearGradient>
          <linearGradient id="nodeGradientPath" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: 'var(--gradient-path-start)' }} />
            <stop offset="50%" style={{ stopColor: 'var(--gradient-path-mid)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--gradient-path-end)' }} />
          </linearGradient>
          <linearGradient id="nodeGradientStart" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: 'var(--gradient-start-start)' }} />
            <stop offset="50%" style={{ stopColor: 'var(--gradient-start-mid)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--gradient-start-end)' }} />
          </linearGradient>
          <linearGradient id="nodeGradientEnd" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: 'var(--gradient-end-start)' }} />
            <stop offset="50%" style={{ stopColor: 'var(--gradient-end-mid)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--gradient-end-end)' }} />
          </linearGradient>
        </defs>

        {/* Grid background - renders in SVG space so it pans/zooms with content */}
        <rect x="-10000" y="-10000" width="20000" height="20000" fill="url(#gridMinor)" pointerEvents="none" />
        <rect x="-10000" y="-10000" width="20000" height="20000" fill="url(#gridMajor)" pointerEvents="none" />

        {nodes.map((node) => (
          <Node
            key={node.id}
            node={node}
            edges={edges}
            onNodeMove={handleNodeMove}
            onEdgeClick={handleEdge}
            onConnectorDragStart={handleConnectorDragStart}
            isVisualizing={isVisualizing}
            isAlgorithmSelected={!!currentAlgorithm}
            pathFindingNode={pathFindingNode}
            svgRef={graph}
            isSelected={selectedNodeId === node.id}
            onNodeSelect={selectNode}
            screenToSvgCoords={screenToSvgCoords}
          />
        ))}

        {mockEdge && (
          <>
            <marker
              id="mockArrowHead"
              markerWidth="10"
              markerHeight="7"
              refX="0"
              refY="3.5"
              orient="auto"
              style={{ fill: 'var(--color-edge-default)' }}
            >
              <polygon points="0 0, 10 3.5, 0 7" />
            </marker>
            <line
              className="stroke-[2px] [stroke-dasharray:8_4] pointer-events-none"
              style={{ stroke: 'var(--color-edge-default)' }}
              x1={mockEdge.x1}
              y1={mockEdge.y1}
              x2={mockEdge.x2}
              y2={mockEdge.y2}
              markerEnd="url(#mockArrowHead)"
            />
          </>
        )}

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
