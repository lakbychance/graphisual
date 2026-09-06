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
import { GraphNode, GraphEdge, GraphSnapshot, SelectedOption, VisualizationTrace } from "../components/Graph/types";
import type { AlgorithmStep } from "../algorithms/types";
import { calculateAccurateCoords } from "../utils/geometry/calc";
import { buildTrace, emptyTrace } from "../utils/visualization/buildTrace";
import { resolveNodeVisState, type NodeVisState } from "../utils/visualization/nodeVisState";
import { TIMING } from "../constants/ui";
import { NODE, EDGE, EDGE_TYPE, type EdgeType } from "../constants/graph";
import { VisualizationState, VisualizationMode } from "../constants/visualization";
import { STORE_NAME } from "../constants/store";
import { useGraphHistoryStore, createGraphSnapshot, withGraphAutoHistory, withGraphBatchedAutoHistory } from "./graphHistoryStore";

// ============================================================================
// Types
// ============================================================================

// The steps of the current run and how far through them we are.
// `index` is -1 before the first step is applied. `trace` is always buildTrace(history[0..index]).
interface StepState {
  index: number;
  history: AlgorithmStep[];
  isAutoPlaying: boolean;
}

interface Visualization {
  algorithm: SelectedOption | undefined;
  trace: VisualizationTrace;
  state: VisualizationState;
  input: { startNodeId: number; endNodeId: number } | null;
  speed: number;
  mode: VisualizationMode;
  step: StepState;
}

// Viewport state (zoom + pan)
interface Viewport {
  zoom: number;
  pan: { x: number; y: number };
}

// Graph data structure (exported for use in graphHistoryStore)
export interface GraphData {
  nodes: GraphNode[];
  edges: Map<number, GraphEdge[]>;
  nodeCounter: number;
  stackingOrder: Set<number>;  // Insertion order = render order (last = top)
}

// Selection state
interface Selection {
  nodeIds: Set<number>;
  edge: { edge: GraphEdge; sourceNode: GraphNode; clickPosition: { x: number; y: number } } | null;
  focusedEdge: { from: number; to: number } | null;
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
  deleteNodes: (nodeIds: number[]) => void;
  bringNodeToFront: (nodeId: number) => void;
  bringNodesToFront: (nodeIds: number[]) => void;
  addEdge: (fromNode: GraphNode, toNode: GraphNode) => void;
  setGraph: (nodes: GraphNode[], edges: Map<number, GraphEdge[]>, nodeCounter: number) => void;
  updateEdgeType: (fromNodeId: number, toNodeId: number, newType: EdgeType) => void;
  updateEdgeWeight: (fromNodeId: number, toNodeId: number, newWeight: number) => void;
  reverseEdge: (fromNodeId: number, toNodeId: number) => void;
  deleteEdge: (fromNodeId: number, toNodeId: number) => void;
  updateNodeLabel: (nodeId: number, label: string) => void;

  // === History Actions ===
  undo: () => void;
  redo: () => void;
  resetGraph: () => void;

  // === Selection Actions ===
  selectNode: (nodeId: number | null) => void;
  selectNodes: (nodeIds: number[]) => void;
  deselectAllNodes: () => void;
  selectEdge: (edge: GraphEdge, sourceNode: GraphNode, clickPosition: { x: number; y: number }) => void;
  clearEdgeSelection: () => void;
  setFocusedEdge: (from: number, to: number) => void;
  clearFocusedEdge: () => void;

  // === Multi-Node Movement ===
  moveNodes: (nodeIds: number[], deltaX: number, deltaY: number) => void;

  // === Visualization Setup ===
  setVisualizationAlgorithm: (algo: SelectedOption | undefined) => void;
  setVisualizationInput: (input: { startNodeId: number; endNodeId: number } | null) => void;
  setVisualizationSpeed: (speed: number) => void;
  setVisualizationMode: (mode: VisualizationMode) => void;
  /** Deselect the algorithm and forget the chosen start/end nodes. */
  resetVisualization: () => void;
  /** Remove all highlights and step history; back to IDLE. */
  clearVisualization: () => void;

  // === Visualization Run ===
  /** Begin a run: store the steps, nothing applied yet (index -1). */
  startVisualization: (steps: AlgorithmStep[]) => void;
  /** End a run keeping its highlights on screen (auto mode completion). */
  finishVisualization: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  jumpToStep: (index: number) => void;
  startAutoPlay: () => void;
  stopAutoPlay: () => void;

  // === UI Actions ===
  setViewportZoom: (zoom: number) => void;
  setViewportPan: (x: number, y: number) => void;

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
  edges: new Map<number, GraphEdge[]>(snapshot.edges),
  nodeCounter: snapshot.nodeCounter,
  stackingOrder: new Set<number>(snapshot.stackingOrder),
});

// ============================================================================
// Initial State
// ============================================================================

const NO_ALGORITHM: SelectedOption = { key: 'select', text: 'Select Algorithm' };

const initialStep: StepState = { index: -1, history: [], isAutoPlaying: false };

const initialVisualization: Visualization = {
  algorithm: NO_ALGORITHM,
  trace: emptyTrace(),
  state: VisualizationState.IDLE,
  input: null,
  speed: TIMING.DEFAULT_VISUALIZATION_SPEED,
  mode: VisualizationMode.AUTO,
  step: initialStep,
};

const initialViewport: Viewport = {
  zoom: 1,
  pan: { x: 0, y: 0 },
};

const initialData: GraphData = {
  nodes: [],
  edges: new Map(),
  nodeCounter: 0,
  stackingOrder: new Set(),
};

const initialSelection: Selection = {
  nodeIds: new Set<number>(),
  edge: null,
  focusedEdge: null,
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

      // Moves the run to `index` (clamped to -1..last) and derives the highlights for steps 0..index in one update.
      const goToStep = (target: number) => {
        const { visualization, data } = get();
        const { step } = visualization;
        const index = Math.max(-1, Math.min(target, step.history.length - 1));
        set({
          visualization: {
            ...visualization,
            trace: buildTrace(step.history.slice(0, index + 1), data.edges),
            step: {
              ...step,
              index,
              // Nothing left to play once the last step is on screen
              isAutoPlaying: index >= step.history.length - 1 ? false : step.isAutoPlaying,
            },
          },
        });
      };

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
          const { nodes, edges, nodeCounter, stackingOrder } = data;
          const newNodeId = nodeCounter + 1;
          const newNode: GraphNode = { id: newNodeId, x, y, r: NODE.RADIUS };

          // Keep existing node references, just add the new one
          const newNodes = [...nodes, newNode];
          const newEdges = new Map(edges);
          newEdges.set(newNodeId, []);

          // Add new node to stacking order (renders on top)
          const newStackingOrder = new Set(stackingOrder);
          newStackingOrder.add(newNodeId);

          set({
            data: { nodes: newNodes, edges: newEdges, nodeCounter: newNodeId, stackingOrder: newStackingOrder },
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
                if (edge.to === nodeId) {
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
          const { nodes, edges, nodeCounter, stackingOrder } = data;

          const newNodes = nodes.filter((n) => n.id !== nodeId);
          const newEdges = new Map(edges);
          newEdges.delete(nodeId);

          // Only update edge arrays that actually have edges to the deleted node
          edges.forEach((edgeList, nId) => {
            if (edgeList && nId !== nodeId) {
              const hasEdgeToDeleted = edgeList.some((edge) => edge.to === nodeId);
              if (hasEdgeToDeleted) {
                const filtered = edgeList.filter((edge) => edge.to !== nodeId);
                newEdges.set(nId, filtered);
              }
            }
          });

          // Remove from stacking order
          const newStackingOrder = new Set(stackingOrder);
          newStackingOrder.delete(nodeId);

          set({
            data: { nodes: newNodes, edges: newEdges, nodeCounter, stackingOrder: newStackingOrder },
            selection: { nodeIds: new Set<number>(), edge: null, focusedEdge: null },
          });
        }),

        deleteNodes: autoHistory((nodeIds: number[]) => {
          if (nodeIds.length === 0) return;
          get().clearVisualization();
          const { data } = get();
          const { nodes, edges, nodeCounter, stackingOrder } = data;

          const nodeIdSet = new Set(nodeIds);

          // Filter out all deleted nodes
          const newNodes = nodes.filter((n) => !nodeIdSet.has(n.id));

          // Remove edges from/to deleted nodes
          const newEdges = new Map(edges);
          nodeIdSet.forEach((nodeId) => {
            newEdges.delete(nodeId);
          });

          // Update remaining nodes' edge arrays to remove edges pointing to deleted nodes
          edges.forEach((edgeList, fromNodeId) => {
            if (edgeList && !nodeIdSet.has(fromNodeId)) {
              const hasEdgesToDeleted = edgeList.some((edge) => nodeIdSet.has(edge.to));
              if (hasEdgesToDeleted) {
                const filtered = edgeList.filter((edge) => !nodeIdSet.has(edge.to));
                newEdges.set(fromNodeId, filtered);
              }
            }
          });

          // Remove from stacking order
          const newStackingOrder = new Set(stackingOrder);
          nodeIdSet.forEach((nodeId) => {
            newStackingOrder.delete(nodeId);
          });

          set({
            data: { nodes: newNodes, edges: newEdges, nodeCounter, stackingOrder: newStackingOrder },
            selection: { nodeIds: new Set<number>(), edge: null, focusedEdge: null },
          });
        }),

        bringNodeToFront: (nodeId: number) => {
          const { data } = get();
          const newStackingOrder = new Set(data.stackingOrder);
          newStackingOrder.delete(nodeId);
          newStackingOrder.add(nodeId);  // Moves to end (top of z-order)
          set({ data: { ...data, stackingOrder: newStackingOrder } });
        },

        bringNodesToFront: (nodeIds: number[]) => {
          const { data } = get();
          const nodeIdSet = new Set(nodeIds);

          // Current order as array (insertion order preserved)
          const currentOrder = [...data.stackingOrder];

          // Split into two groups, each preserving original relative order
          const notSelected = currentOrder.filter(id => !nodeIdSet.has(id));
          const selected = currentOrder.filter(id => nodeIdSet.has(id));

          // Concatenate: non-selected at bottom, selected on top
          const newStackingOrder = new Set([...notSelected, ...selected]);

          set({ data: { ...data, stackingOrder: newStackingOrder } });
        },

        addEdge: autoHistory((fromNode: GraphNode, toNode: GraphNode) => {
          get().clearVisualization();
          const { data, visualization } = get();
          const { nodes, edges, nodeCounter, stackingOrder } = data;

          const { tempX, tempY } = calculateAccurateCoords(
            fromNode.x,
            fromNode.y,
            toNode.x,
            toNode.y
          );

          const newEdge: GraphEdge = {
            x1: fromNode.x,
            y1: fromNode.y,
            x2: tempX,
            y2: tempY,
            nodeX2: toNode.x,
            nodeY2: toNode.y,
            from: fromNode.id,
            to: toNode.id,
            weight: EDGE.DEFAULT_WEIGHT,
            type: EDGE_TYPE.DIRECTED,
          };

          // Only update the source node's edge array
          const newEdges = new Map(edges);
          const sourceEdges = edges.get(fromNode.id) || [];
          newEdges.set(fromNode.id, [...sourceEdges, newEdge]);

          set({
            data: { nodes, edges: newEdges, nodeCounter, stackingOrder },
            visualization: { ...visualization, input: null },
          });
        }),

        setGraph: autoHistory((nodes: GraphNode[], edges: Map<number, GraphEdge[]>, nodeCounter: number) => {
          get().clearVisualization();
          const { visualization } = get();

          // Initialize stacking order from nodes (in creation order)
          const stackingOrder = new Set(nodes.map((n) => n.id));

          set({
            data: { nodes, edges, nodeCounter, stackingOrder },
            selection: { nodeIds: new Set<number>(), edge: null, focusedEdge: null },
            visualization: { ...visualization, input: null },
            viewport: { zoom: 1, pan: { x: 0, y: 0 } }, // Reset viewport to center on new graph
          });
        }),

        updateEdgeType: autoHistory((fromNodeId: number, toNodeId: number, newType: EdgeType) => {
          get().clearVisualization();
          const { data, selection } = get();
          const { nodes, edges, nodeCounter, stackingOrder } = data;
          const selectedEdge = selection.edge;

          const sourceNode = nodes.find((n) => n.id === fromNodeId);
          const targetNode = nodes.find((n) => n.id === toNodeId);

          if (!sourceNode || !targetNode) return;

          // Get the current edge
          const sourceEdges = edges.get(fromNodeId) || [];
          const currentEdge = sourceEdges.find((e) => e.to === toNodeId);
          if (!currentEdge) return;

          // Only update affected edge arrays
          const newEdges = new Map(edges);

          if (newType === EDGE_TYPE.UNDIRECTED && currentEdge.type === EDGE_TYPE.DIRECTED) {
            // Update original edge
            const updatedSourceEdges = sourceEdges.map((e) =>
              e.to === toNodeId ? { ...e, type: EDGE_TYPE.UNDIRECTED } : e
            );
            newEdges.set(fromNodeId, updatedSourceEdges);

            // Add reverse edge
            const targetEdges = edges.get(toNodeId) || [];
            const reverseExists = targetEdges.some((e) => e.to === fromNodeId);
            if (!reverseExists) {
              const { tempX, tempY } = calculateAccurateCoords(
                targetNode.x,
                targetNode.y,
                sourceNode.x,
                sourceNode.y
              );
              const reverseEdge: GraphEdge = {
                x1: targetNode.x,
                y1: targetNode.y,
                x2: tempX,
                y2: tempY,
                nodeX2: sourceNode.x,
                nodeY2: sourceNode.y,
                from: toNodeId,
                to: fromNodeId,
                weight: currentEdge.weight,
                type: EDGE_TYPE.UNDIRECTED,
              };
              newEdges.set(toNodeId, [...targetEdges, reverseEdge]);
            }
          } else if (newType === EDGE_TYPE.DIRECTED && currentEdge.type === EDGE_TYPE.UNDIRECTED) {
            // Update original edge
            const updatedSourceEdges = sourceEdges.map((e) =>
              e.to === toNodeId ? { ...e, type: EDGE_TYPE.DIRECTED } : e
            );
            newEdges.set(fromNodeId, updatedSourceEdges);

            // Remove reverse edge
            const targetEdges = edges.get(toNodeId) || [];
            const filteredTargetEdges = targetEdges.filter((e) => e.to !== fromNodeId);
            newEdges.set(toNodeId, filteredTargetEdges);
          }

          // Update selection.edge if it exists
          const updatedEdge = { ...currentEdge, type: newType };

          set({
            data: { nodes, edges: newEdges, nodeCounter, stackingOrder },
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
          const { nodes, edges, nodeCounter, stackingOrder } = data;
          const selectedEdge = selection.edge;

          const sourceNode = nodes.find((n) => n.id === fromNodeId);

          // Update edge weight
          const sourceEdges = edges.get(fromNodeId) || [];
          const currentEdge = sourceEdges.find((e) => e.to === toNodeId);
          if (!currentEdge || !sourceNode) return;

          // Only update affected edge arrays
          const newEdges = new Map(edges);

          const updatedSourceEdges = sourceEdges.map((e) =>
            e.to === toNodeId ? { ...e, weight: newWeight } : e
          );
          newEdges.set(fromNodeId, updatedSourceEdges);

          // If undirected, update reverse edge too
          if (currentEdge.type === EDGE_TYPE.UNDIRECTED) {
            const targetEdges = edges.get(toNodeId) || [];
            const updatedTargetEdges = targetEdges.map((e) =>
              e.to === fromNodeId ? { ...e, weight: newWeight } : e
            );
            newEdges.set(toNodeId, updatedTargetEdges);
          }

          const updatedEdge = { ...currentEdge, weight: newWeight };

          set({
            data: { nodes, edges: newEdges, nodeCounter, stackingOrder },
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
          const { nodes, edges, nodeCounter, stackingOrder } = data;

          const sourceNode = nodes.find((n) => n.id === fromNodeId);
          const targetNode = nodes.find((n) => n.id === toNodeId);
          if (!sourceNode || !targetNode) return;

          // Get the current edge
          const sourceEdges = edges.get(fromNodeId) || [];
          const currentEdge = sourceEdges.find((e) => e.to === toNodeId);
          if (!currentEdge) return;

          // Reversing would collide with an existing edge in the other direction
          const targetEdges = edges.get(toNodeId) || [];
          if (targetEdges.some((e) => e.to === fromNodeId)) return;

          // Only update affected edge arrays
          const newEdges = new Map(edges);

          // Remove original edge
          const filteredSourceEdges = sourceEdges.filter((e) => e.to !== toNodeId);
          newEdges.set(fromNodeId, filteredSourceEdges);

          // Add reversed edge
          const { tempX, tempY } = calculateAccurateCoords(
            targetNode.x,
            targetNode.y,
            sourceNode.x,
            sourceNode.y
          );
          const reversedEdge: GraphEdge = {
            x1: targetNode.x,
            y1: targetNode.y,
            x2: tempX,
            y2: tempY,
            nodeX2: sourceNode.x,
            nodeY2: sourceNode.y,
            from: toNodeId,
            to: fromNodeId,
            weight: currentEdge.weight,
            type: EDGE_TYPE.DIRECTED,
          };
          newEdges.set(toNodeId, [...targetEdges, reversedEdge]);

          set({
            data: { nodes, edges: newEdges, nodeCounter, stackingOrder },
            selection: { ...selection, edge: null },
          });
        }),

        updateNodeLabel: autoHistory((nodeId: number, label: string) => {
          get().clearVisualization();
          const { data } = get();
          const trimmed = label.trim().replace(/\*/g, '').slice(0, 5);
          const newNodes = data.nodes.map((n) =>
            n.id === nodeId ? { ...n, label: trimmed || undefined } : n
          );
          set({ data: { ...data, nodes: newNodes } });
        }),

        deleteEdge: autoHistory((fromNodeId: number, toNodeId: number) => {
          get().clearVisualization();
          const { data, selection } = get();
          const { nodes, edges, nodeCounter, stackingOrder } = data;

          // Get the edge to check if undirected
          const sourceEdges = edges.get(fromNodeId) || [];
          const currentEdge = sourceEdges.find((e) => e.to === toNodeId);

          // Only update affected edge arrays
          const newEdges = new Map(edges);

          // Remove the edge
          const filteredSourceEdges = sourceEdges.filter((e) => e.to !== toNodeId);
          newEdges.set(fromNodeId, filteredSourceEdges);

          // If undirected, also remove reverse edge
          if (currentEdge?.type === EDGE_TYPE.UNDIRECTED) {
            const targetEdges = edges.get(toNodeId) || [];
            const filteredTargetEdges = targetEdges.filter((e) => e.to !== fromNodeId);
            newEdges.set(toNodeId, filteredTargetEdges);
          }

          set({
            data: { nodes, edges: newEdges, nodeCounter, stackingOrder },
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
            () => createGraphSnapshot(data.nodes, data.edges, data.nodeCounter, data.stackingOrder),
            (snapshot) => set({
              data: snapshotToData(snapshot),
              selection: { nodeIds: new Set<number>(), edge: null, focusedEdge: null },
            })
          );
        },

        redo: () => {
          get().clearVisualization();
          const historyStore = useGraphHistoryStore.getState();
          const { data } = get();
          historyStore.redo(
            () => createGraphSnapshot(data.nodes, data.edges, data.nodeCounter, data.stackingOrder),
            (snapshot) => set({
              data: snapshotToData(snapshot),
              selection: { nodeIds: new Set<number>(), edge: null, focusedEdge: null },
            })
          );
        },

        resetGraph: autoHistory(() => {
          const { visualization } = get();
          set({
            ...initialState,
            visualization: { ...initialVisualization, speed: visualization.speed }, // Preserve speed setting
          });
        }),

        // ========================================
        // Selection Actions
        // ========================================

        selectNode: (nodeId) => {
          const { selection } = get();
          const newNodeIds = nodeId === null ? new Set<number>() : new Set<number>([nodeId]);
          set({ selection: { ...selection, nodeIds: newNodeIds, focusedEdge: null } });
        },

        selectNodes: (nodeIds: number[]) => {
          const { selection } = get();
          set({ selection: { ...selection, nodeIds: new Set<number>(nodeIds), focusedEdge: null } });
        },

        deselectAllNodes: () => {
          const { selection } = get();
          set({ selection: { ...selection, nodeIds: new Set<number>(), focusedEdge: null } });
        },

        selectEdge: (edge, sourceNode, clickPosition) => {
          const { selection } = get();
          set({ selection: { ...selection, edge: { edge, sourceNode, clickPosition } } });
        },

        clearEdgeSelection: () => {
          const { selection } = get();
          set({ selection: { ...selection, edge: null } });
        },

        setFocusedEdge: (from: number, to: number) => {
          const { selection } = get();
          set({ selection: { ...selection, focusedEdge: { from, to } } });
        },

        clearFocusedEdge: () => {
          const { selection } = get();
          set({ selection: { ...selection, focusedEdge: null } });
        },

        // ========================================
        // Multi-Node Movement
        // ========================================

        moveNodes: batchedAutoHistory((nodeIds: number[], deltaX: number, deltaY: number) => {
          const { data } = get();
          const { nodes, edges } = data;

          // Get all nodes to move
          const nodeIdSet = new Set(nodeIds);

          // Update all node positions
          const newNodes = nodes.map((node) => {
            if (nodeIdSet.has(node.id)) {
              return { ...node, x: node.x + deltaX, y: node.y + deltaY };
            }
            return node;
          });

          // Create a lookup for new positions
          const newPositions = new Map<number, { x: number; y: number }>();
          newNodes.forEach((node) => {
            if (nodeIdSet.has(node.id)) {
              newPositions.set(node.id, { x: node.x, y: node.y });
            }
          });

          // Update all affected edges
          const newEdges = new Map(edges);

          // Update edges for each moved node
          nodeIdSet.forEach((nodeId) => {
            const newPos = newPositions.get(nodeId);
            if (!newPos) return;

            // Update edges starting from this node
            const nodeEdges = edges.get(nodeId);
            if (nodeEdges) {
              const updatedNodeEdges = nodeEdges.map((edge) => {
                const targetPos = newPositions.get(edge.to) || { x: edge.nodeX2, y: edge.nodeY2 };
                const { tempX, tempY } = calculateAccurateCoords(newPos.x, newPos.y, targetPos.x, targetPos.y);
                return { ...edge, x1: newPos.x, y1: newPos.y, x2: tempX, y2: tempY, nodeX2: targetPos.x, nodeY2: targetPos.y };
              });
              newEdges.set(nodeId, updatedNodeEdges);
            }
          });

          // Update edges pointing to moved nodes (from non-moved nodes)
          edges.forEach((list, fromNodeId) => {
            if (list && !nodeIdSet.has(fromNodeId)) {
              let hasChanges = false;
              const updatedList = list.map((edge) => {
                if (nodeIdSet.has(edge.to)) {
                  hasChanges = true;
                  const newPos = newPositions.get(edge.to)!;
                  const { tempX, tempY } = calculateAccurateCoords(edge.x1, edge.y1, newPos.x, newPos.y);
                  return { ...edge, x2: tempX, y2: tempY, nodeX2: newPos.x, nodeY2: newPos.y };
                }
                return edge;
              });
              if (hasChanges) {
                newEdges.set(fromNodeId, updatedList);
              }
            }
          });

          set({
            data: { ...data, nodes: newNodes, edges: newEdges },
          });
        }),

        // ========================================
        // Visualization Setup
        // ========================================

        setVisualizationAlgorithm: (algo) => {
          const { visualization } = get();
          // Picking a new algorithm after a completed run clears the old highlights
          const isDone = visualization.state === VisualizationState.DONE && algo?.key && algo.key !== "select";
          set({
            visualization: {
              ...visualization,
              algorithm: algo,
              input: null,
              ...(isDone && { trace: emptyTrace(), state: VisualizationState.IDLE }),
            },
          });
        },

        setVisualizationInput: (input) => {
          set({ visualization: { ...get().visualization, input } });
        },

        setVisualizationSpeed: (speed) => {
          set({ visualization: { ...get().visualization, speed } });
        },

        setVisualizationMode: (mode) => {
          set({ visualization: { ...get().visualization, mode } });
        },

        resetVisualization: () => {
          set({ visualization: { ...get().visualization, algorithm: NO_ALGORITHM, input: null } });
        },

        clearVisualization: () => {
          set({
            visualization: {
              ...get().visualization,
              trace: emptyTrace(),
              state: VisualizationState.IDLE,
              input: null,
              step: initialStep,
            },
          });
        },

        // ========================================
        // Visualization Run
        // ========================================

        startVisualization: (steps) => {
          set({
            visualization: {
              ...get().visualization,
              trace: emptyTrace(),
              state: VisualizationState.RUNNING,
              step: { ...initialStep, history: steps },
            },
          });
        },

        finishVisualization: () => {
          set({
            visualization: {
              ...get().visualization,
              state: VisualizationState.DONE,
              algorithm: NO_ALGORITHM,
              input: null,
              step: initialStep,
            },
          });
        },

        stepForward: () => {
          const { step } = get().visualization;
          if (step.index >= step.history.length - 1) return;
          goToStep(step.index + 1);
        },

        stepBackward: () => {
          const { step } = get().visualization;
          if (step.index <= 0) return;
          goToStep(step.index - 1);
        },

        jumpToStep: goToStep,

        startAutoPlay: () => {
          const { visualization } = get();
          set({ visualization: { ...visualization, step: { ...visualization.step, isAutoPlaying: true } } });
        },

        stopAutoPlay: () => {
          const { visualization } = get();
          set({ visualization: { ...visualization, step: { ...visualization.step, isAutoPlaying: false } } });
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
      };
    },
    { name: STORE_NAME.GRAPH }
  )
);

// ============================================================================
// Selectors (for optimized re-renders)
// ============================================================================

export const selectStepIndex = (state: GraphStore) => state.visualization.step.index;
export const selectStepHistory = (state: GraphStore) => state.visualization.step.history;

// Auto mode plays for the whole run; manual mode plays only while the user has pressed Play.
export const selectIsPlaying = (state: GraphStore) =>
  state.visualization.mode === VisualizationMode.AUTO
    ? state.visualization.state === VisualizationState.RUNNING
    : state.visualization.step.isAutoPlaying;

// Action enabled selectors — each component subscribes only to what it renders
export const selectCanUndo = (state: GraphStore) =>
  state.canUndo() && state.visualization.state !== VisualizationState.RUNNING;
export const selectCanRedo = (state: GraphStore) =>
  state.canRedo() && state.visualization.state !== VisualizationState.RUNNING;
export const selectCanDeleteSelectedNodes = (state: GraphStore) =>
  state.selection.nodeIds.size > 0 && state.visualization.state !== VisualizationState.RUNNING;
export const selectIsInStepMode = (state: GraphStore) =>
  state.visualization.mode === VisualizationMode.MANUAL &&
  state.visualization.state === VisualizationState.RUNNING;
export const selectCanStepForward = (state: GraphStore) =>
  selectIsInStepMode(state) && state.visualization.step.index < state.visualization.step.history.length - 1;
export const selectCanStepBackward = (state: GraphStore) =>
  selectIsInStepMode(state) && state.visualization.step.index > 0;

// Helper selector to check if a reverse edge exists (curried for use with useGraphStore)
export const selectHasReverseEdge = (fromNodeId: number, toNodeId: number) => (state: GraphStore): boolean => {
  const targetEdges = state.data.edges.get(toNodeId) || [];
  return targetEdges.some((e) => e.to === fromNodeId);
};

// ============================================================================
// Derived Visualization State Selectors
// ============================================================================

/**
 * Selector factory for getting a node's visualization state.
 * Returns a function that can be passed to useGraphStore for optimal re-renders.
 *
 * Usage: const visState = useGraphStore(selectNodeVisState(nodeId));
 */
export const selectNodeVisState = (nodeId: number) =>
  (state: GraphStore): NodeVisState =>
    resolveNodeVisState(nodeId, state.visualization.trace.nodes.get(nodeId), state.visualization.input);

// Edge visualization state (discriminated union matching EdgeColorState in cssVariables.ts)
export type EdgeVisState = 'path' | 'cycle' | 'traversal' | 'default';

/**
 * Selector factory for getting an edge's visualization state.
 * Returns a function that can be passed to useGraphStore for optimal re-renders.
 *
 * Usage: const visState = useGraphStore(selectEdgeVisState(fromId, toId));
 */
export const selectEdgeVisState = (fromId: number, toId: number) =>
  (state: GraphStore): EdgeVisState => {
    const flags = state.visualization.trace.edges.get(`${fromId}-${toId}`);
    if (flags?.isUsedInCycle) return 'cycle';
    if (flags?.isUsedInShortestPath) return 'path';
    if (flags?.isUsedInTraversal) return 'traversal';
    return 'default';
  };

/**
 * Selector factory for checking if an edge is focused (keyboard navigation).
 * Returns true if this specific edge direction is focused.
 * For undirected edges, also returns true if the reverse direction is focused.
 *
 * Usage: const isFocused = useGraphStore(selectIsEdgeFocused(fromId, toId));
 */
export const selectIsEdgeFocused = (fromId: number, toId: number) =>
  (state: GraphStore): boolean => {
    const focused = state.selection.focusedEdge;
    if (focused === null) return false;

    // Direct match
    if (focused.from === fromId && focused.to === toId) return true;

    // For undirected edges, check if reverse is focused
    if (focused.from === toId && focused.to === fromId) {
      // Check if this edge is undirected
      const edges = state.data.edges.get(fromId);
      const edge = edges?.find(e => e.to === toId);
      if (edge?.type === 'undirected') return true;
    }

    return false;
  };

