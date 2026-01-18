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
import { useGraphHistoryStore, createGraphSnapshot, withGraphAutoHistory, withGraphBatchedAutoHistory } from "./graphHistoryStore";

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

// Graph data structure (exported for use in graphHistoryStore)
export interface GraphData {
  nodes: INode[];
  edges: Map<number, IEdge[]>;
  nodeCounter: number;
}

// Selection state
interface Selection {
  nodeId: number | null;
  edge: { edge: IEdge; sourceNode: INode; clickPosition: { x: number; y: number } } | null;
}

interface GraphState {
  data: GraphData;
  visualization: Visualization;
  selection: Selection;
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

  // === Selection Actions ===
  selectNode: (nodeId: number | null) => void;
  selectEdge: (edge: IEdge, sourceNode: INode, clickPosition: { x: number; y: number }) => void;
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
}

type GraphStore = GraphState & GraphActions;

// ============================================================================
// Helper Functions
// ============================================================================

const snapshotToData = (snapshot: GraphSnapshot): GraphData => ({
  nodes: snapshot.nodes,
  edges: new Map<number, IEdge[]>(snapshot.edges),
  nodeCounter: snapshot.nodeCounter,
});

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

const initialData: GraphData = {
  nodes: [],
  edges: new Map(),
  nodeCounter: 0,
};

const initialSelection: Selection = {
  nodeId: null,
  edge: null,
};

const initialState: GraphState = {
  data: initialData,
  visualization: initialVisualization,
  selection: initialSelection,
  viewport: initialViewport,
};

// ============================================================================
// Store
// ============================================================================

export const useGraphStore = create<GraphStore>()(
  devtools(
    (set, get) => {
      const autoHistory = <TArgs extends unknown[], TReturn>(
        mutation: (...args: TArgs) => TReturn
      ) => withGraphAutoHistory(get, mutation);

      const batchedAutoHistory = <TArgs extends unknown[], TReturn>(
        mutation: (...args: TArgs) => TReturn,
        debounceMs?: number
      ) => withGraphBatchedAutoHistory(get, mutation, debounceMs);

      return {
        ...initialState,

        // ========================================
        // Computed
        // ========================================

        canUndo: () => useGraphHistoryStore.getState().canUndo(),
        canRedo: () => useGraphHistoryStore.getState().canRedo(),

        // ========================================
        // Graph Mutations
        // ========================================

        addNode: autoHistory((x: number, y: number) => {
          get().clearVisualization();
          const { data, visualization } = get();
          const { nodes, edges, nodeCounter } = data;
          const newNodeId = nodeCounter + 1;
          const newNode: INode = { id: newNodeId, x, y, r: NODE.RADIUS };

          // Keep existing node references, just add the new one
          const newNodes = [...nodes, newNode];
          const newEdges = new Map(edges);
          newEdges.set(newNodeId, []);

          set({
            data: { nodes: newNodes, edges: newEdges, nodeCounter: newNodeId },
            visualization: { ...visualization, input: null },
          });
        }),

        moveNode: batchedAutoHistory((nodeId: number, x: number, y: number) => {
          const { data } = get();
          const { nodes, edges } = data;

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
            data: { ...data, nodes: newNodes, edges: newEdges },
          });
        }),

        deleteNode: autoHistory((nodeId: number) => {
          get().clearVisualization();
          const { data } = get();
          const { nodes, edges, nodeCounter } = data;

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
            data: { nodes: newNodes, edges: newEdges, nodeCounter },
            selection: { nodeId: null, edge: null },
          });
        }),

        addEdge: autoHistory((fromNode: INode, toNode: INode) => {
          get().clearVisualization();
          const { data, visualization } = get();
          const { nodes, edges, nodeCounter } = data;

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
            data: { nodes, edges: newEdges, nodeCounter },
            visualization: { ...visualization, input: null },
          });
        }),

        setGraph: autoHistory((nodes: INode[], edges: Map<number, IEdge[]>, nodeCounter: number) => {
          get().clearVisualization();
          const { visualization } = get();

          set({
            data: { nodes, edges, nodeCounter },
            selection: { nodeId: null, edge: null },
            visualization: { ...visualization, input: null },
          });
        }),

        updateEdgeType: autoHistory((fromNodeId: number, toNodeId: number, newType: "directed" | "undirected") => {
          get().clearVisualization();
          const { data, selection } = get();
          const { nodes, edges, nodeCounter } = data;
          const selectedEdge = selection.edge;

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

          // Update selection.edge if it exists
          const updatedEdge = { ...currentEdge, type: newType };

          set({
            data: { nodes, edges: newEdges, nodeCounter },
            selection: {
              ...selection,
              edge: selectedEdge
                ? { edge: updatedEdge, sourceNode, clickPosition: selectedEdge.clickPosition }
                : null,
            },
          });
        }),

        updateEdgeWeight: autoHistory((fromNodeId: number, toNodeId: number, newWeight: number) => {
          get().clearVisualization();
          const { data, selection } = get();
          const { nodes, edges, nodeCounter } = data;
          const selectedEdge = selection.edge;

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
            data: { nodes, edges: newEdges, nodeCounter },
            selection: {
              ...selection,
              edge: selectedEdge
                ? { edge: updatedEdge, sourceNode, clickPosition: selectedEdge.clickPosition }
                : null,
            },
          });
        }),

        reverseEdge: autoHistory((fromNodeId: number, toNodeId: number) => {
          get().clearVisualization();
          const { data, selection } = get();
          const { nodes, edges, nodeCounter } = data;

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
            data: { nodes, edges: newEdges, nodeCounter },
            selection: { ...selection, edge: null },
          });
        }),

        deleteEdge: autoHistory((fromNodeId: number, toNodeId: number) => {
          get().clearVisualization();
          const { data, selection } = get();
          const { nodes, edges, nodeCounter } = data;

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
            data: { nodes, edges: newEdges, nodeCounter },
            selection: { ...selection, edge: null },
          });
        }),

        // ========================================
        // History Actions
        // ========================================

        undo: () => {
          get().clearVisualization();
          const historyStore = useGraphHistoryStore.getState();
          const { data } = get();
          historyStore.undo(
            () => createGraphSnapshot(data.nodes, data.edges, data.nodeCounter),
            (snapshot) => set({
              data: snapshotToData(snapshot),
              selection: { nodeId: null, edge: null },
            })
          );
        },

        redo: () => {
          get().clearVisualization();
          const historyStore = useGraphHistoryStore.getState();
          const { data } = get();
          historyStore.redo(
            () => createGraphSnapshot(data.nodes, data.edges, data.nodeCounter),
            (snapshot) => set({
              data: snapshotToData(snapshot),
              selection: { nodeId: null, edge: null },
            })
          );
        },

        resetGraph: () => {
          const { visualization } = get();
          useGraphHistoryStore.getState().clear();
          set({
            ...initialState,
            visualization: { ...initialVisualization, speed: visualization.speed }, // Preserve speed setting
          });
        },

        // ========================================
        // Selection Actions
        // ========================================

        selectNode: (nodeId) => {
          const { selection } = get();
          set({ selection: { ...selection, nodeId } });
        },

        selectEdge: (edge, sourceNode, clickPosition) => {
          const { selection } = get();
          set({ selection: { ...selection, edge: { edge, sourceNode, clickPosition } } });
        },

        clearEdgeSelection: () => {
          const { selection } = get();
          set({ selection: { ...selection, edge: null } });
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
      };
    },
    { name: "GraphStore" }
  )
);

// ============================================================================
// Selectors (for optimized re-renders)
// ============================================================================

export const selectNodes = (state: GraphStore) => state.data.nodes;
export const selectEdges = (state: GraphStore) => state.data.edges;
export const selectSelectedNodeId = (state: GraphStore) => state.selection.nodeId;
export const selectSelectedEdge = (state: GraphStore) => state.selection.edge;
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
