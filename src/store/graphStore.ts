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
import { INode, IEdge, GraphSnapshot, SelectedOption, NodeVisualizationFlags, EdgeVisualizationFlags } from "../components/Graph/IGraph";
import { calculateAccurateCoords } from "../utility/calc";
import { NODE, TIMING } from "../utility/constants";

// ============================================================================
// Types
// ============================================================================

// Visualization trace - which nodes/edges are highlighted
interface VisualizationTrace {
  nodes: Map<number, NodeVisualizationFlags>;
  edges: Map<string, EdgeVisualizationFlags>; // key: "fromId-toId"
}

// Step-through state (only exists in manual mode)
interface StepState {
  index: number;
  history: Array<{ type: 'visit' | 'result'; edge: { from: number; to: number } }>;
  isComplete: boolean;
}

// Base visualization properties (shared by both modes)
interface VisualizationBase {
  algorithm: SelectedOption | undefined;
  trace: VisualizationTrace;
  state: 'idle' | 'running' | 'done';
  input: { startNodeId: number; endNodeId: number } | null;
  speed: number;
}

// Auto mode - step state doesn't exist
interface AutoVisualization extends VisualizationBase {
  mode: 'auto';
}

// Manual mode - step state required
interface ManualVisualization extends VisualizationBase {
  mode: 'manual';
  step: StepState;
}

// Discriminated union
type Visualization = AutoVisualization | ManualVisualization;

// Viewport state (zoom + pan)
interface Viewport {
  zoom: number;
  pan: { x: number; y: number };
}

interface GraphState {
  // === Graph Data ===
  nodes: INode[];
  edges: Map<number, IEdge[]>;
  nodeCounter: number;

  // === Unified Visualization State ===
  visualization: Visualization;

  // === History ===
  past: GraphSnapshot[];
  future: GraphSnapshot[];

  // === Selection State ===
  selectedNodeId: number | null;
  selectedEdgeForEdit: { edge: IEdge; sourceNode: INode; clickPosition: { x: number; y: number } } | null;

  // === UI State ===
  viewport: Viewport;
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

  // === Visualization Actions ===
  setVisualizationAlgorithm: (algo: SelectedOption | undefined) => void;
  setVisualizationInput: (input: { startNodeId: number; endNodeId: number } | null) => void;
  setVisualizationState: (state: 'idle' | 'running' | 'done') => void;
  setVisualizationSpeed: (speed: number) => void;
  setVisualizationMode: (mode: 'auto' | 'manual') => void;
  resetVisualization: () => void;

  // === Trace Actions (node/edge visualization) ===
  setTraceNode: (nodeId: number, flags: NodeVisualizationFlags) => void;
  setTraceEdge: (fromId: number, toId: number, flags: EdgeVisualizationFlags) => void;
  clearVisualization: () => void;

  // === UI Actions ===
  setViewportZoom: (zoom: number) => void;
  setViewportPan: (x: number, y: number) => void;

  // === Step-Through Actions ===
  initStepThrough: (steps: Array<{ type: 'visit' | 'result'; edge: { from: number; to: number } }>) => void;
  stepForward: () => void;
  stepBackward: () => void;
  jumpToStep: (index: number) => void;
  resetStepThrough: () => void;

  // === Computed ===
  canUndo: () => boolean;
  canRedo: () => boolean;
  createSnapshot: () => GraphSnapshot;
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

const initialVisualization: AutoVisualization = {
  algorithm: { key: 'select', text: 'Select Algorithm' },
  trace: {
    nodes: new Map(),
    edges: new Map(),
  },
  state: 'idle',
  input: null,
  speed: TIMING.DEFAULT_VISUALIZATION_SPEED,
  mode: 'auto',
};

const initialViewport: Viewport = {
  zoom: 1,
  pan: { x: 0, y: 0 },
};

const initialState: GraphState = {
  // Graph data
  nodes: [],
  edges: new Map(),
  nodeCounter: 0,

  // Unified visualization state
  visualization: initialVisualization,

  // History
  past: [],
  future: [],

  // Selection
  selectedNodeId: null,
  selectedEdgeForEdit: null,

  // UI
  viewport: initialViewport,
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

      // ========================================
      // Graph Mutations
      // ========================================

      addNode: (x, y) => {
        get().clearVisualization();
        const { nodes, edges, nodeCounter, past, visualization } = get();
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
          visualization: { ...visualization, input: null },
        });
      },

      moveNode: (nodeId, x, y) => {
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
        get().clearVisualization();
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
        get().clearVisualization();
        const { nodes, edges, nodeCounter, past, visualization } = get();
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
          visualization: { ...visualization, input: null },
        });
      },

      setGraph: (nodes, edges, nodeCounter) => {
        get().clearVisualization();
        const { nodes: currentNodes, edges: currentEdges, nodeCounter: currentCounter, visualization } = get();
        const currentSnapshot = createSnapshot(currentNodes, currentEdges, currentCounter);

        set({
          nodes,
          edges,
          nodeCounter,
          past: [...get().past, currentSnapshot],
          future: [],
          selectedNodeId: null,
          selectedEdgeForEdit: null,
          visualization: { ...visualization, input: null },
        });
      },

      updateEdgeType: (fromNodeId, toNodeId, newType) => {
        get().clearVisualization();
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
        get().clearVisualization();
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
        get().clearVisualization();
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
        get().clearVisualization();
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
        get().clearVisualization();
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
        get().clearVisualization();
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
        const { visualization } = get();
        set({
          ...initialState,
          visualization: { ...initialVisualization, speed: visualization.speed }, // Preserve speed setting
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
      // Visualization Actions
      // ========================================

      setVisualizationAlgorithm: (algo) => {
        const { visualization } = get();

        // Clear visualization if previous visualization was completed
        if (visualization.state === 'done' && algo?.key && algo.key !== "select") {
          set({
            visualization: {
              ...visualization,
              algorithm: algo,
              input: null,
              trace: { nodes: new Map(), edges: new Map() },
              state: 'idle',
            },
          });
        } else {
          set({
            visualization: {
              ...visualization,
              algorithm: algo,
              input: null,
            },
          });
        }
      },

      setVisualizationInput: (input) => {
        const { visualization } = get();
        set({
          visualization: { ...visualization, input },
        });
      },

      setVisualizationState: (state) => {
        const { visualization } = get();
        set({
          visualization: { ...visualization, state },
        });
      },

      setVisualizationSpeed: (speed) => {
        const { visualization } = get();
        set({
          visualization: { ...visualization, speed },
        });
      },

      setVisualizationMode: (mode) => {
        const { visualization } = get();
        if (mode === 'manual') {
          set({
            visualization: {
              ...visualization,
              mode: 'manual',
              step: { index: -1, history: [], isComplete: false },
            } as ManualVisualization,
          });
        } else {
          // When switching to auto, remove step state
          const { algorithm, trace, state, input, speed } = visualization;
          set({
            visualization: {
              algorithm,
              trace,
              state,
              input,
              speed,
              mode: 'auto',
            } as AutoVisualization,
          });
        }
      },

      resetVisualization: () => {
        const { visualization } = get();
        set({
          visualization: {
            ...visualization,
            algorithm: { key: 'select', text: 'Select Algorithm' },
            input: null,
          },
        });
      },

      // ========================================
      // Trace Actions (node/edge visualization)
      // ========================================

      setTraceNode: (nodeId, flags) => {
        const { visualization } = get();
        const newNodes = new Map(visualization.trace.nodes);
        const existing = newNodes.get(nodeId) || {};
        newNodes.set(nodeId, { ...existing, ...flags });
        set({
          visualization: {
            ...visualization,
            trace: { ...visualization.trace, nodes: newNodes },
          },
        });
      },

      setTraceEdge: (fromId, toId, flags) => {
        const { visualization } = get();
        const key = `${fromId}-${toId}`;
        const newEdges = new Map(visualization.trace.edges);
        const existing = newEdges.get(key) || {};
        newEdges.set(key, { ...existing, ...flags });
        set({
          visualization: {
            ...visualization,
            trace: { ...visualization.trace, edges: newEdges },
          },
        });
      },

      clearVisualization: () => {
        const { visualization } = get();
        set({
          visualization: {
            ...visualization,
            trace: { nodes: new Map(), edges: new Map() },
            state: 'idle',
            input: null,
          },
        });
      },

      // ========================================
      // UI Actions
      // ========================================

      setViewportZoom: (zoom) => {
        const { viewport } = get();
        set({ viewport: { ...viewport, zoom } });
      },

      setViewportPan: (x, y) => {
        const { viewport } = get();
        set({ viewport: { ...viewport, pan: { x, y } } });
      },

      // ========================================
      // Step-Through Actions
      // ========================================

      initStepThrough: (steps) => {
        const { visualization } = get();
        set({
          visualization: {
            ...visualization,
            mode: 'manual',
            state: 'running',
            step: { index: -1, history: steps, isComplete: false },
          } as ManualVisualization,
        });
      },

      stepForward: () => {
        const { visualization } = get();
        if (visualization.mode !== 'manual') return;

        const { step } = visualization;
        const nextIndex = step.index + 1;
        if (nextIndex < step.history.length) {
          set({
            visualization: {
              ...visualization,
              step: {
                ...step,
                index: nextIndex,
                isComplete: nextIndex === step.history.length - 1,
              },
            } as ManualVisualization,
          });
        }
      },

      stepBackward: () => {
        const { visualization } = get();
        if (visualization.mode !== 'manual') return;

        const { step } = visualization;
        if (step.index > 0) {
          set({
            visualization: {
              ...visualization,
              step: {
                ...step,
                index: step.index - 1,
                isComplete: false,
              },
            } as ManualVisualization,
          });
        }
      },

      jumpToStep: (index) => {
        const { visualization } = get();
        if (visualization.mode !== 'manual') return;

        const { step } = visualization;
        const clampedIndex = Math.max(-1, Math.min(index, step.history.length - 1));
        set({
          visualization: {
            ...visualization,
            step: {
              ...step,
              index: clampedIndex,
              isComplete: clampedIndex === step.history.length - 1,
            },
          } as ManualVisualization,
        });
      },

      resetStepThrough: () => {
        const { visualization } = get();
        // Switch back to auto mode and clear
        const { algorithm, input, speed } = visualization;
        set({
          visualization: {
            algorithm,
            trace: { nodes: new Map(), edges: new Map() },
            state: 'idle',
            input,
            speed,
            mode: 'auto',
          } as AutoVisualization,
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
export const selectViewportZoom = (state: GraphStore) => state.viewport.zoom;
export const selectViewportPan = (state: GraphStore) => state.viewport.pan;

// Visualization selectors
export const selectVisualization = (state: GraphStore) => state.visualization;
export const selectVisualizationAlgorithm = (state: GraphStore) => state.visualization.algorithm;
export const selectVisualizationInput = (state: GraphStore) => state.visualization.input;
export const selectVisualizationState = (state: GraphStore) => state.visualization.state;
export const selectVisualizationSpeed = (state: GraphStore) => state.visualization.speed;
export const selectVisualizationMode = (state: GraphStore) => state.visualization.mode;
export const selectVisualizationTrace = (state: GraphStore) => state.visualization.trace;
export const selectTraceNodes = (state: GraphStore) => state.visualization.trace.nodes;
export const selectTraceEdges = (state: GraphStore) => state.visualization.trace.edges;

// Derived visualization selectors
export const selectIsVisualizing = (state: GraphStore) => state.visualization.state === 'running';
export const selectIsVisualizationDone = (state: GraphStore) => state.visualization.state === 'done';

// Stable empty array for selectors (prevents infinite re-renders)
const EMPTY_STEP_HISTORY: Array<{ type: 'visit' | 'result'; edge: { from: number; to: number } }> = [];

// Step-through selectors (only available in manual mode)
export const selectStepIndex = (state: GraphStore) =>
  state.visualization.mode === 'manual' ? state.visualization.step.index : -1;
export const selectStepHistory = (state: GraphStore) =>
  state.visualization.mode === 'manual' ? state.visualization.step.history : EMPTY_STEP_HISTORY;
export const selectIsStepComplete = (state: GraphStore) =>
  state.visualization.mode === 'manual' ? state.visualization.step.isComplete : false;
