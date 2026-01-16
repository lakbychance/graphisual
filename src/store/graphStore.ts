/**
 * Zustand Store for Graph State Management
 *
 * Consolidates all graph-related state that was previously:
 * - Scattered across Board.tsx and Graph.tsx
 * - Communicated via window object pollution
 * - Synchronized via custom window events
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { INode, IEdge, GraphSnapshot, SelectedOption, INodeSelection } from "../components/Graph/IGraph";
import { calculateAccurateCoords } from "../utility/calc";
import { NODE, TIMING } from "../utility/constants";

// ============================================================================
// Types
// ============================================================================

type VisualizationState = 'idle' | 'running' | 'done';

interface GraphState {
  // === Graph Data ===
  nodes: INode[];
  edges: Map<number, IEdge[]>;
  nodeCounter: number;

  // === History ===
  past: GraphSnapshot[];
  future: GraphSnapshot[];

  // === Selection State ===
  selectedNodeId: number | null;
  selectedEdgeForEdit: { edge: IEdge; sourceNode: INode; clickPosition: { x: number; y: number } } | null;

  // === Algorithm State ===
  selectedAlgo: SelectedOption | undefined;
  nodeSelection: INodeSelection;
  pathFindingNode: { startNodeId: number; endNodeId: number } | null;
  visualizationState: VisualizationState;
  visualizationSpeed: number;

  // === UI State ===
  zoom: number;
  pan: { x: number; y: number };

  // === Step-Through Mode ===
  stepMode: 'auto' | 'manual';
  stepIndex: number;
  stepHistory: Array<{ type: 'visit' | 'result'; edge: { from: number; to: number } }>;
  isStepComplete: boolean;
}

interface GraphActions {
  // === Graph Mutations ===
  addNode: (x: number, y: number) => void;
  moveNode: (nodeId: number, x: number, y: number) => void;
  deleteNode: (nodeId: number) => void;
  addEdge: (fromNode: INode, toNode: INode) => void;
  setGraph: (nodes: INode[], edges: Map<number, IEdge[]>, nodeCounter: number) => void;
  updateEdgeType: (fromNodeId: number, toNodeId: number, newType: "directed" | "undirected") => void;
  updateEdgeWeight: (fromNodeId: number, toNodeId: number, newWeight: number) => void;
  reverseEdge: (fromNodeId: number, toNodeId: number) => void;
  deleteEdge: (fromNodeId: number, toNodeId: number) => void;

  // === History Actions ===
  undo: () => void;
  redo: () => void;
  resetGraph: () => void;
  pushToPast: (snapshot: GraphSnapshot) => void;
  setPresent: (snapshot: GraphSnapshot) => void;

  // === Selection Actions ===
  selectNode: (nodeId: number | null) => void;
  selectEdgeForEdit: (edge: IEdge, sourceNode: INode, clickPosition: { x: number; y: number }) => void;
  clearEdgeSelection: () => void;

  // === Algorithm Actions ===
  setAlgorithm: (algo: SelectedOption | undefined) => void;
  setNodeSelection: (selection: INodeSelection) => void;
  setPathFindingNode: (node: { startNodeId: number; endNodeId: number } | null) => void;
  setVisualizationState: (state: VisualizationState) => void;
  setVisualizationSpeed: (speed: number) => void;
  resetAlgorithmState: () => void;

  // === Visualization State (no history) ===
  updateVisualizationState: (nodes: INode[], edges: Map<number, IEdge[]>) => void;
  resetVisualizationFlags: () => void;
  clearVisualizationState: () => void;  // Clear visualization without creating new references

  // === UI Actions ===
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;

  // === Step-Through Actions ===
  setStepMode: (mode: 'auto' | 'manual') => void;
  initStepThrough: (steps: Array<{ type: 'visit' | 'result'; edge: { from: number; to: number } }>) => void;
  stepForward: () => void;
  stepBackward: () => void;
  jumpToStep: (index: number) => void;
  resetStepThrough: () => void;

  // === Computed ===
  canUndo: () => boolean;
  canRedo: () => boolean;
  createSnapshot: () => GraphSnapshot;
  getCleanedState: () => { cleanedNodes: INode[]; cleanedEdges: Map<number, IEdge[]> };
}

type GraphStore = GraphState & GraphActions;

// ============================================================================
// Helper Functions
// ============================================================================

const createSnapshot = (
  nodes: INode[],
  edges: Map<number, IEdge[]>,
  nodeCounter: number
): GraphSnapshot => ({
  nodes,
  edges: Array.from(edges.entries()).map(([k, v]) => [k, v || []]),
  nodeCounter,
});

const snapshotToState = (snapshot: GraphSnapshot) => ({
  nodes: snapshot.nodes,
  edges: new Map<number, IEdge[]>(snapshot.edges),
  nodeCounter: snapshot.nodeCounter,
});

const areSnapshotsEqual = (a: GraphSnapshot, b: GraphSnapshot): boolean => {
  return JSON.stringify(a) === JSON.stringify(b);
};

// ============================================================================
// Initial State
// ============================================================================

const initialState: GraphState = {
  // Graph data
  nodes: [],
  edges: new Map(),
  nodeCounter: 0,

  // History
  past: [],
  future: [],

  // Selection
  selectedNodeId: null,
  selectedEdgeForEdit: null,

  // Algorithm
  selectedAlgo: { key: "select", text: "Select Algorithm" },
  nodeSelection: { isStartNodeSelected: false, isEndNodeSelected: false },
  pathFindingNode: null,
  visualizationState: 'idle',
  visualizationSpeed: TIMING.DEFAULT_VISUALIZATION_SPEED,

  // UI
  zoom: 1,
  pan: { x: 0, y: 0 },

  // Step-through mode
  stepMode: 'auto',
  stepIndex: -1,
  stepHistory: [],
  isStepComplete: false,
};

// ============================================================================
// Store
// ============================================================================

export const useGraphStore = create<GraphStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ========================================
      // Computed
      // ========================================

      canUndo: () => get().past.length > 0,
      canRedo: () => get().future.length > 0,

      createSnapshot: () => {
        const { nodes, edges, nodeCounter } = get();
        return createSnapshot(nodes, edges, nodeCounter);
      },

      getCleanedState: () => {
        const { nodes, edges } = get();

        const cleanedNodes = nodes.map((node) => ({
          ...node,
          isInShortestPath: false,
          isVisited: false,
        }));

        const cleanedEdges = new Map<number, IEdge[]>();
        edges.forEach((list, nodeId) => {
          const newList = (list || []).map((edge) => ({
            ...edge,
            isUsedInTraversal: false,
            isUsedInShortestPath: false,
          }));
          cleanedEdges.set(nodeId, newList);
        });

        return { cleanedNodes, cleanedEdges };
      },

      // ========================================
      // Graph Mutations
      // ========================================

      addNode: (x, y) => {
        get().clearVisualizationState();
        const { nodes, edges, nodeCounter, past } = get();
        const newNodeId = nodeCounter + 1;
        const newNode: INode = { id: newNodeId, x, y, r: NODE.RADIUS };

        // Keep existing node references, just add the new one
        const newNodes = [...nodes, newNode];
        const newEdges = new Map(edges);
        newEdges.set(newNodeId, []);

        const currentSnapshot = createSnapshot(nodes, edges, nodeCounter);

        set({
          nodes: newNodes,
          edges: newEdges,
          nodeCounter: newNodeId,
          past: [...past, currentSnapshot],
          future: [],
          pathFindingNode: null,
        });
      },

      moveNode: (nodeId, x, y) => {
        get().clearVisualizationState();
        const { nodes, edges } = get();

        // Only create new object for the moved node, keep same references for others
        const newNodes = nodes.map((node) =>
          node.id === nodeId ? { ...node, x, y } : node
        );

        const newEdges = new Map(edges);

        // Update edges starting from this node
        const nodeEdges = edges.get(nodeId);
        if (nodeEdges) {
          const updatedNodeEdges = nodeEdges.map((edge) => {
            const { tempX, tempY } = calculateAccurateCoords(x, y, edge.nodeX2, edge.nodeY2);
            return { ...edge, x1: x, y1: y, x2: tempX, y2: tempY };
          });
          newEdges.set(nodeId, updatedNodeEdges);
        }

        // Update edges pointing to this node (only if they actually have edges to this node)
        edges.forEach((list, fromNodeId) => {
          if (list && fromNodeId !== nodeId) {
            let hasChanges = false;
            const updatedList = list.map((edge) => {
              if (parseInt(edge.to) === nodeId) {
                hasChanges = true;
                const { tempX, tempY } = calculateAccurateCoords(edge.x1, edge.y1, x, y);
                return { ...edge, x2: tempX, y2: tempY, nodeX2: x, nodeY2: y };
              }
              return edge;
            });
            // Only update if edges actually changed
            if (hasChanges) {
              newEdges.set(fromNodeId, updatedList);
            }
          }
        });

        set({
          nodes: newNodes,
          edges: newEdges,
        });
      },

      deleteNode: (nodeId) => {
        get().clearVisualizationState();
        const { nodes, edges, nodeCounter, past } = get();
        const currentSnapshot = createSnapshot(nodes, edges, nodeCounter);

        const newNodes = nodes.filter((n) => n.id !== nodeId);
        const newEdges = new Map(edges);
        newEdges.delete(nodeId);

        // Only update edge arrays that actually have edges to the deleted node
        edges.forEach((edgeList, nId) => {
          if (edgeList && nId !== nodeId) {
            const hasEdgeToDeleted = edgeList.some((edge) => edge.to === String(nodeId));
            if (hasEdgeToDeleted) {
              const filtered = edgeList.filter((edge) => edge.to !== String(nodeId));
              newEdges.set(nId, filtered);
            }
          }
        });

        set({
          nodes: newNodes,
          edges: newEdges,
          past: [...past, currentSnapshot],
          future: [],
          selectedNodeId: null,
        });
      },

      addEdge: (fromNode, toNode) => {
        get().clearVisualizationState();
        const { nodes, edges, nodeCounter, past } = get();
        const currentSnapshot = createSnapshot(nodes, edges, nodeCounter);

        const { tempX, tempY } = calculateAccurateCoords(
          fromNode.x,
          fromNode.y,
          toNode.x,
          toNode.y
        );

        const newEdge: IEdge = {
          x1: fromNode.x,
          y1: fromNode.y,
          x2: tempX,
          y2: tempY,
          nodeX2: toNode.x,
          nodeY2: toNode.y,
          from: fromNode.id.toString(),
          to: toNode.id.toString(),
          weight: 0,
          type: "directed",
        };

        // Only update the source node's edge array
        const newEdges = new Map(edges);
        const sourceEdges = edges.get(fromNode.id) || [];
        newEdges.set(fromNode.id, [...sourceEdges, newEdge]);

        set({
          nodes,  // Keep same node references
          edges: newEdges,
          past: [...past, currentSnapshot],
          future: [],
          pathFindingNode: null,
        });
      },

      setGraph: (nodes, edges, nodeCounter) => {
        const { nodes: currentNodes, edges: currentEdges, nodeCounter: currentCounter } = get();
        const currentSnapshot = createSnapshot(currentNodes, currentEdges, currentCounter);

        set({
          nodes,
          edges,
          nodeCounter,
          past: [...get().past, currentSnapshot],
          future: [],
          selectedNodeId: null,
          selectedEdgeForEdit: null,
          pathFindingNode: null,
        });
      },

      updateEdgeType: (fromNodeId, toNodeId, newType) => {
        get().clearVisualizationState();
        const { nodes, edges, nodeCounter, past, selectedEdgeForEdit } = get();
        const currentSnapshot = createSnapshot(nodes, edges, nodeCounter);

        const sourceNode = nodes.find((n) => n.id === fromNodeId);
        const targetNode = nodes.find((n) => n.id === toNodeId);

        if (!sourceNode || !targetNode) return;

        // Get the current edge
        const sourceEdges = edges.get(fromNodeId) || [];
        const currentEdge = sourceEdges.find((e) => parseInt(e.to) === toNodeId);
        if (!currentEdge) return;

        // Only update affected edge arrays
        const newEdges = new Map(edges);

        if (newType === "undirected" && currentEdge.type === "directed") {
          // Update original edge
          const updatedSourceEdges = sourceEdges.map((e) =>
            parseInt(e.to) === toNodeId ? { ...e, type: "undirected" } : e
          );
          newEdges.set(fromNodeId, updatedSourceEdges);

          // Add reverse edge
          const targetEdges = edges.get(toNodeId) || [];
          const reverseExists = targetEdges.some((e) => parseInt(e.to) === fromNodeId);
          if (!reverseExists) {
            const { tempX, tempY } = calculateAccurateCoords(
              targetNode.x,
              targetNode.y,
              sourceNode.x,
              sourceNode.y
            );
            const reverseEdge: IEdge = {
              x1: targetNode.x,
              y1: targetNode.y,
              x2: tempX,
              y2: tempY,
              nodeX2: sourceNode.x,
              nodeY2: sourceNode.y,
              from: toNodeId.toString(),
              to: fromNodeId.toString(),
              weight: currentEdge.weight,
              type: "undirected",
            };
            newEdges.set(toNodeId, [...targetEdges, reverseEdge]);
          }
        } else if (newType === "directed" && currentEdge.type === "undirected") {
          // Update original edge
          const updatedSourceEdges = sourceEdges.map((e) =>
            parseInt(e.to) === toNodeId ? { ...e, type: "directed" } : e
          );
          newEdges.set(fromNodeId, updatedSourceEdges);

          // Remove reverse edge
          const targetEdges = edges.get(toNodeId) || [];
          const filteredTargetEdges = targetEdges.filter((e) => parseInt(e.to) !== fromNodeId);
          newEdges.set(toNodeId, filteredTargetEdges);
        }

        // Update selectedEdgeForEdit if it exists
        const updatedEdge = { ...currentEdge, type: newType };

        set({
          nodes,  // Keep same node references
          edges: newEdges,
          past: [...past, currentSnapshot],
          future: [],
          selectedEdgeForEdit: selectedEdgeForEdit
            ? { edge: updatedEdge, sourceNode, clickPosition: selectedEdgeForEdit.clickPosition }
            : null,
        });
      },

      updateEdgeWeight: (fromNodeId, toNodeId, newWeight) => {
        get().clearVisualizationState();
        const { nodes, edges, nodeCounter, past, selectedEdgeForEdit } = get();
        const currentSnapshot = createSnapshot(nodes, edges, nodeCounter);

        const sourceNode = nodes.find((n) => n.id === fromNodeId);

        // Update edge weight
        const sourceEdges = edges.get(fromNodeId) || [];
        const currentEdge = sourceEdges.find((e) => parseInt(e.to) === toNodeId);
        if (!currentEdge || !sourceNode) return;

        // Only update affected edge arrays
        const newEdges = new Map(edges);

        const updatedSourceEdges = sourceEdges.map((e) =>
          parseInt(e.to) === toNodeId ? { ...e, weight: newWeight } : e
        );
        newEdges.set(fromNodeId, updatedSourceEdges);

        // If undirected, update reverse edge too
        if (currentEdge.type === "undirected") {
          const targetEdges = edges.get(toNodeId) || [];
          const updatedTargetEdges = targetEdges.map((e) =>
            parseInt(e.to) === fromNodeId ? { ...e, weight: newWeight } : e
          );
          newEdges.set(toNodeId, updatedTargetEdges);
        }

        const updatedEdge = { ...currentEdge, weight: newWeight };

        set({
          nodes,  // Keep same node references
          edges: newEdges,
          past: [...past, currentSnapshot],
          future: [],
          selectedEdgeForEdit: selectedEdgeForEdit
            ? { edge: updatedEdge, sourceNode, clickPosition: selectedEdgeForEdit.clickPosition }
            : null,
        });
      },

      reverseEdge: (fromNodeId, toNodeId) => {
        get().clearVisualizationState();
        const { nodes, edges, nodeCounter, past } = get();
        const currentSnapshot = createSnapshot(nodes, edges, nodeCounter);

        const sourceNode = nodes.find((n) => n.id === fromNodeId);
        const targetNode = nodes.find((n) => n.id === toNodeId);
        if (!sourceNode || !targetNode) return;

        // Get the current edge
        const sourceEdges = edges.get(fromNodeId) || [];
        const currentEdge = sourceEdges.find((e) => parseInt(e.to) === toNodeId);
        if (!currentEdge) return;

        // Only update affected edge arrays
        const newEdges = new Map(edges);

        // Remove original edge
        const filteredSourceEdges = sourceEdges.filter((e) => parseInt(e.to) !== toNodeId);
        newEdges.set(fromNodeId, filteredSourceEdges);

        // Add reversed edge
        const { tempX, tempY } = calculateAccurateCoords(
          targetNode.x,
          targetNode.y,
          sourceNode.x,
          sourceNode.y
        );
        const reversedEdge: IEdge = {
          x1: targetNode.x,
          y1: targetNode.y,
          x2: tempX,
          y2: tempY,
          nodeX2: sourceNode.x,
          nodeY2: sourceNode.y,
          from: toNodeId.toString(),
          to: fromNodeId.toString(),
          weight: currentEdge.weight,
          type: "directed",
        };
        const targetEdges = edges.get(toNodeId) || [];
        newEdges.set(toNodeId, [...targetEdges, reversedEdge]);

        set({
          nodes,  // Keep same node references
          edges: newEdges,
          past: [...past, currentSnapshot],
          future: [],
          selectedEdgeForEdit: null,
        });
      },

      deleteEdge: (fromNodeId, toNodeId) => {
        get().clearVisualizationState();
        const { nodes, edges, nodeCounter, past } = get();
        const currentSnapshot = createSnapshot(nodes, edges, nodeCounter);

        // Get the edge to check if undirected
        const sourceEdges = edges.get(fromNodeId) || [];
        const currentEdge = sourceEdges.find((e) => parseInt(e.to) === toNodeId);

        // Only update affected edge arrays
        const newEdges = new Map(edges);

        // Remove the edge
        const filteredSourceEdges = sourceEdges.filter((e) => parseInt(e.to) !== toNodeId);
        newEdges.set(fromNodeId, filteredSourceEdges);

        // If undirected, also remove reverse edge
        if (currentEdge?.type === "undirected") {
          const targetEdges = edges.get(toNodeId) || [];
          const filteredTargetEdges = targetEdges.filter((e) => parseInt(e.to) !== fromNodeId);
          newEdges.set(toNodeId, filteredTargetEdges);
        }

        set({
          nodes,  // Keep same node references
          edges: newEdges,
          past: [...past, currentSnapshot],
          future: [],
          selectedEdgeForEdit: null,
        });
      },

      // ========================================
      // History Actions
      // ========================================

      undo: () => {
        const { past, nodes, edges, nodeCounter, future } = get();
        if (past.length === 0) return;

        const previous = past[past.length - 1];
        const newPast = past.slice(0, -1);
        const currentSnapshot = createSnapshot(nodes, edges, nodeCounter);

        set({
          ...snapshotToState(previous),
          past: newPast,
          future: [currentSnapshot, ...future],
          selectedNodeId: null,
          selectedEdgeForEdit: null,
        });
      },

      redo: () => {
        const { past, nodes, edges, nodeCounter, future } = get();
        if (future.length === 0) return;

        const next = future[0];
        const newFuture = future.slice(1);
        const currentSnapshot = createSnapshot(nodes, edges, nodeCounter);

        set({
          ...snapshotToState(next),
          past: [...past, currentSnapshot],
          future: newFuture,
          selectedNodeId: null,
          selectedEdgeForEdit: null,
        });
      },

      resetGraph: () => {
        set({
          ...initialState,
          visualizationSpeed: get().visualizationSpeed, // Preserve speed setting
        });
      },

      pushToPast: (snapshot) => {
        const { past } = get();
        // Don't add duplicate
        if (past.length > 0 && areSnapshotsEqual(snapshot, past[past.length - 1])) {
          return;
        }
        set({
          past: [...past, snapshot],
          future: [],
        });
      },

      setPresent: (snapshot) => {
        set(snapshotToState(snapshot));
      },

      // ========================================
      // Selection Actions
      // ========================================

      selectNode: (nodeId) => {
        set({ selectedNodeId: nodeId });
      },

      selectEdgeForEdit: (edge, sourceNode, clickPosition) => {
        set({ selectedEdgeForEdit: { edge, sourceNode, clickPosition } });
      },

      clearEdgeSelection: () => {
        set({ selectedEdgeForEdit: null });
      },

      // ========================================
      // Algorithm Actions
      // ========================================

      setAlgorithm: (algo) => {
        const { visualizationState } = get();

        // Reset visualization flags if previous visualization was completed
        if (visualizationState === 'done' && algo?.key && algo.key !== "select") {
          const { cleanedNodes, cleanedEdges } = get().getCleanedState();
          set({
            selectedAlgo: algo,
            pathFindingNode: null,
            nodes: cleanedNodes,
            edges: cleanedEdges,
            visualizationState: 'idle',
          });
        } else {
          set({
            selectedAlgo: algo,
            pathFindingNode: null,
          });
        }
      },

      setNodeSelection: (selection) => {
        set({ nodeSelection: selection });
      },

      setPathFindingNode: (node) => {
        set({ pathFindingNode: node });
      },

      setVisualizationState: (state) => {
        set({ visualizationState: state });
      },

      setVisualizationSpeed: (speed) => {
        set({ visualizationSpeed: speed });
      },

      resetAlgorithmState: () => {
        set({
          selectedAlgo: { key: "select", text: "Select Algorithm" },
          nodeSelection: { isStartNodeSelected: false, isEndNodeSelected: false },
          pathFindingNode: null,
        });
      },

      // ========================================
      // Visualization State (no history)
      // ========================================

      updateVisualizationState: (nodes, edges) => {
        set({ nodes, edges });
      },

      resetVisualizationFlags: () => {
        const { nodes, edges } = get();

        const cleanedNodes = nodes.map((node) => ({
          ...node,
          isInShortestPath: false,
          isVisited: false,
        }));

        const cleanedEdges = new Map<number, IEdge[]>();
        edges.forEach((list, nodeId) => {
          const newList = (list || []).map((edge) => ({
            ...edge,
            isUsedInTraversal: false,
            isUsedInShortestPath: false,
          }));
          cleanedEdges.set(nodeId, newList);
        });

        set({
          nodes: cleanedNodes,
          edges: cleanedEdges,
          pathFindingNode: null,
        });
      },

      clearVisualizationState: () => {
        const { nodes, edges, visualizationState } = get();

        // Only clear if there's visualization state to clear
        if (visualizationState === 'idle') {
          // Check if any node/edge has visualization flags set
          const hasVisualizationState = nodes.some(n => n.isVisited || n.isInShortestPath) ||
            Array.from(edges.values()).some(list =>
              list?.some(e => e.isUsedInTraversal || e.isUsedInShortestPath)
            );
          if (!hasVisualizationState) return;
        }

        // Create new objects with cleared flags (required for React shallow comparison to detect changes)
        const cleanedNodes = nodes.map(node => ({
          ...node,
          isVisited: false,
          isInShortestPath: false,
        }));

        const cleanedEdges = new Map<number, IEdge[]>();
        edges.forEach((list, nodeId) => {
          if (!list) {
            cleanedEdges.set(nodeId, []);
            return;
          }
          const newList = list.map(edge => ({
            ...edge,
            isUsedInTraversal: false,
            isUsedInShortestPath: false,
          }));
          cleanedEdges.set(nodeId, newList);
        });

        set({
          nodes: cleanedNodes,
          edges: cleanedEdges,
          visualizationState: 'idle',
          pathFindingNode: null,
        });
      },

      // ========================================
      // UI Actions
      // ========================================

      setZoom: (zoom) => {
        set({ zoom });
      },

      setPan: (x, y) => {
        set({ pan: { x, y } });
      },

      // ========================================
      // Step-Through Actions
      // ========================================

      setStepMode: (mode) => {
        set({ stepMode: mode });
      },

      initStepThrough: (steps) => {
        set({
          stepHistory: steps,
          stepIndex: -1,
          isStepComplete: false,
          visualizationState: 'running',
        });
      },

      stepForward: () => {
        const { stepIndex, stepHistory } = get();
        const nextIndex = stepIndex + 1;
        if (nextIndex < stepHistory.length) {
          set({
            stepIndex: nextIndex,
            isStepComplete: nextIndex === stepHistory.length - 1,
          });
        }
      },

      stepBackward: () => {
        const { stepIndex } = get();
        if (stepIndex > 0) {
          set({
            stepIndex: stepIndex - 1,
            isStepComplete: false,
          });
        }
      },

      jumpToStep: (index) => {
        const { stepHistory } = get();
        const clampedIndex = Math.max(-1, Math.min(index, stepHistory.length - 1));
        set({
          stepIndex: clampedIndex,
          isStepComplete: clampedIndex === stepHistory.length - 1,
        });
      },

      resetStepThrough: () => {
        set({
          stepHistory: [],
          stepIndex: -1,
          isStepComplete: false,
          visualizationState: 'idle',
        });
      },
    }),
    { name: "GraphStore" }
  )
);

// ============================================================================
// Selectors (for optimized re-renders)
// ============================================================================

export const selectNodes = (state: GraphStore) => state.nodes;
export const selectEdges = (state: GraphStore) => state.edges;
export const selectSelectedNodeId = (state: GraphStore) => state.selectedNodeId;
export const selectSelectedEdgeForEdit = (state: GraphStore) => state.selectedEdgeForEdit;
export const selectSelectedAlgo = (state: GraphStore) => state.selectedAlgo;
export const selectVisualizationState = (state: GraphStore) => state.visualizationState;
// Derived selectors for convenience
export const selectIsVisualizing = (state: GraphStore) => state.visualizationState === 'running';
export const selectIsVisualizationDone = (state: GraphStore) => state.visualizationState === 'done';
export const selectVisualizationSpeed = (state: GraphStore) => state.visualizationSpeed;
export const selectZoom = (state: GraphStore) => state.zoom;
export const selectPan = (state: GraphStore) => state.pan;
export const selectPathFindingNode = (state: GraphStore) => state.pathFindingNode;
export const selectNodeSelection = (state: GraphStore) => state.nodeSelection;
export const selectStepMode = (state: GraphStore) => state.stepMode;
export const selectStepIndex = (state: GraphStore) => state.stepIndex;
export const selectStepHistory = (state: GraphStore) => state.stepHistory;
export const selectIsStepComplete = (state: GraphStore) => state.isStepComplete;
