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
import { calculateAccurateCoords } from "../utils/geometry/calc";
import { emptyRun, emptyTrace, highlightsAt, type Run } from "../utils/visualization/runView";
import { asksYesNo, canRunIt, decidedBy, steerRun, takenAt, turnFrom, type Turn } from "../utils/visualization/runIt";
import { freshGraph } from "../utils/visualization/freshGraph";
import { buildRun } from "../utils/visualization/buildRun";
import { accepted, edgeQuestions, edgeReply, frameAt, misconception, type DecideEvent } from "../algorithms/engine";
import { resolveNodeVisState, type NodeVisState } from "../utils/visualization/nodeVisState";
import { TIMING } from "../constants/ui";
import { NODE, EDGE, EDGE_TYPE, type EdgeType } from "../constants/graph";
import { VisualizationState, VisualizationMode } from "../constants/visualization";
import { STORE_NAME } from "../constants/store";
import { useGraphHistoryStore, createGraphSnapshot, withGraphAutoHistory, withGraphBatchedAutoHistory } from "./graphHistoryStore";
import { applyEdgeList, freeId, meaningOf, meaningOfList, nameOf, readEdgeList, whyNotWritable, type LineProblem } from "../utils/graph/edgeList";
import type { GeneratedGraph } from "../utils/graph/graphGenerator";
import type { Evidence } from "../algorithms/facts";

// ============================================================================
// Types
// ============================================================================

// The current run (its events, cut into steps of one change each) and how far through it we are.
// `index` is -1 before the first step is shown. `trace` is always highlightsAt(run, index).
interface StepState {
  index: number;
  run: Run;
  isAutoPlaying: boolean;
}

/**
 * Run it yourself (see `runIt.ts`): the learner picks the next node where the run waits for them.
 * `picks` holds the node taken at each decision so far (the learner's, forced ones filled in);
 * the run is the algorithm steered by them. In Bellman-Ford the run waits at a Yes / No question
 * instead, and `picks` stays empty. Absent while watching.
 */
export interface RunItState {
  picks: number[];
  /** The decision the run waits at next, and the last step it shows before it; null when none is left. */
  turn: Turn | null;
  /** Wrong picks at this turn so far. */
  tries: number;
  /**
   * What the run said about the last pick: why it is not the one, or that it is (node ids marked), and
   * the step it was said at. In Bellman-Ford, the reply to the last answer: `yes` when it was right,
   * `note` when it was wrong or skipped (it says what the edge does, and why), shown on step `at` only.
   */
  said: { tone: "miss" | "yes" | "note"; text: string; at: number } | null;
}

interface Visualization {
  algorithm: SelectedOption | undefined;
  trace: VisualizationTrace;
  state: VisualizationState;
  input: { startNodeId: number; endNodeId: number } | null;
  speed: number;
  mode: VisualizationMode;
  step: StepState;
  runIt: RunItState | null;
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
  deleteNodes: (nodeIds: number[]) => void;
  bringNodeToFront: (nodeId: number) => void;
  bringNodesToFront: (nodeIds: number[]) => void;
  addEdge: (fromNode: GraphNode, toNode: GraphNode) => void;
  setGraph: (nodes: GraphNode[], edges: Map<number, GraphEdge[]>, nodeCounter: number) => void;
  updateEdgeType: (fromNodeId: number, toNodeId: number, newType: EdgeType) => void;
  updateEdgeWeight: (fromNodeId: number, toNodeId: number, newWeight: number) => void;
  reverseEdge: (fromNodeId: number, toNodeId: number) => void;
  deleteEdge: (fromNodeId: number, toNodeId: number) => void;
  /**
   * Renames a node (an empty label shows its number). No two nodes may show the same name (D68): a
   * name another node already shows is refused and comes back (nothing changes); null when renamed.
   */
  updateNodeLabel: (nodeId: number, label: string) => string | null;
  /**
   * The text panel: makes the canvas what `text` says (see `edgeList.ts`), one undo step, new nodes
   * placed around `anchor`; the view stays where it is. When any line is malformed, or the canvas
   * cannot be written as text, the graph stays as it is and the problems come back.
   */
  applyEdgeListText: (text: string, anchor: { x: number; y: number }) => LineProblem[];

  // === History Actions ===
  undo: () => void;
  redo: () => void;
  resetGraph: () => void;

  // === Selection Actions ===
  selectNode: (nodeId: number | null) => void;
  selectNodes: (nodeIds: number[]) => void;
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
  /** Remove all highlights and the run; back to IDLE. */
  clearVisualization: () => void;
  /**
   * Lights what a graph fact points at (see `facts.ts`) outside a run: its nodes and edges in the
   * cycle colour, its `marked` nodes in the route colour, over whatever a finished run left there.
   * Returns what puts it out. Lightings stack: the latest shows, and putting it out shows the one
   * under it again (a fact kept lit in the panel, after a refusal's edge), or, under the last, what
   * was there before, unless something else has changed the highlights since. Does nothing during a run.
   */
  showEvidence: (evidence: Evidence) => () => void;

  // === Visualization Run ===
  /** Begin a run: store it, no step shown yet (index -1). */
  startVisualization: (run: Run) => void;
  /** End a run keeping its highlights on screen (auto mode completion). */
  finishVisualization: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  jumpToStep: (index: number) => void;
  startAutoPlay: () => void;
  stopAutoPlay: () => void;
  /** Watch the run, or run it yourself from the step on screen (the run plays on to the learner's first turn). */
  setRunItMode: (on: boolean) => void;
  /** The learner picks `nodeId` at the turn the run waits at; nothing happens anywhere else. */
  pickNode: (nodeId: number) => void;
  /** Bellman-Ford: the learner answers the question the run waits at, Yes or No (null skips it); the run plays on either way. */
  answerQuestion: (answer: boolean | null) => void;
  /** Run it again from the start, with no picks. */
  restartRunIt: () => void;
  /**
   * Run it on a fresh graph of the run's algorithm, made from `seed` (see `freshGraph.ts`): it
   * replaces the graph (one undo step) and the run plays on to the learner's first turn. Returns
   * whether the learner's own graph (anything but a fresh graph left as it came) is now behind one
   * or more fresh ones, to be brought back with `bringBackOwnGraph`.
   */
  newRunItGraph: (seed: number) => boolean;
  /** Undoes back to the learner's own graph that New graph put aside (see `newRunItGraph`). */
  bringBackOwnGraph: () => void;

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

/** How a graph looks on the canvas: two graphs that look the same have the same look. */
const lookOf = ({ nodes, edges }: Pick<GraphData, "nodes" | "edges">) =>
  JSON.stringify([nodes.map((n) => [n.x, n.y, n.label]), [...edges].map(([id, list]) => [id, list.map((e) => [e.to, e.weight, e.type])])]);

/**
 * The looks of the fresh graphs Run it has put on the canvas: a graph that looks like one is a fresh
 * graph left as it came (back by undo or redo, too), not the learner's own.
 */
const freshLooks = new Set<string>();

/**
 * Where the learner's own graph sits in the undo history once New graph has put it aside (its index
 * in the past steps): undoing until that many steps are left brings it back. Null when New graph has
 * not put one aside.
 */
let ownGraphAt: number | null = null;

/**
 * What `showEvidence` has lit, latest last, the highlights it lit them over (put back when all are
 * out), and the highlights on screen as it last left them (anything else there means something else took over).
 */
let evidenceLit: { layers: Array<{ key: object; trace: VisualizationTrace }>; under: VisualizationTrace; shown: VisualizationTrace } | null = null;

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

const initialStep: StepState = { index: -1, run: emptyRun, isAutoPlaying: false };

const initialVisualization: Visualization = {
  algorithm: NO_ALGORITHM,
  trace: emptyTrace(),
  state: VisualizationState.IDLE,
  input: null,
  speed: TIMING.DEFAULT_VISUALIZATION_SPEED,
  mode: VisualizationMode.AUTO,
  step: initialStep,
  runIt: null,
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

      // Moves the run to `index` (clamped to -1..last, or to the learner's turn in Run it) and derives that step's highlights from its frame in one update.
      const goToStep = (target: number) => {
        const { visualization, data } = get();
        const { step } = visualization;
        const last = lastShown(visualization);
        const index = Math.max(-1, Math.min(target, last));
        set({
          visualization: {
            ...visualization,
            trace: highlightsAt(step.run, index, data.edges),
            step: {
              ...step,
              index,
              // Nothing left to play once the last step (or the learner's turn) is on screen
              isAutoPlaying: index >= last ? false : step.isAutoPlaying,
            },
          },
        });
      };

      const setNodeLabel = autoHistory((nodeId: number, trimmed: string) => {
        get().clearVisualization();
        const { data } = get();
        const newNodes = data.nodes.map((n) =>
          n.id === nodeId ? { ...n, label: trimmed || undefined } : n
        );
        set({ data: { ...data, nodes: newNodes } });
      });

      // The graph the text panel describes, in place: nodes kept keep their stacking, the view stays.
      const putTextGraph = autoHistory(({ nodes, edges, nodeCounter }: GeneratedGraph) => {
        get().clearVisualization();
        const { data, selection, visualization } = get();
        const ids = new Set(nodes.map((n) => n.id));
        const stackingOrder = new Set([...data.stackingOrder, ...ids].filter((id) => ids.has(id)));
        set({
          data: { nodes, edges, nodeCounter, stackingOrder },
          selection: { nodeIds: new Set([...selection.nodeIds].filter((id) => ids.has(id))), edge: null, focusedEdge: null },
          visualization: { ...visualization, input: null },
        });
      });

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
          // The next id whose number no node shows, so a new node never repeats a name (D68).
          const newNodeId = freeId(new Set(nodes.map((n) => n.id)), new Set(nodes.map(nameOf)), nodeCounter);
          const newNode: GraphNode = { id: newNodeId, x, y, r: NODE.RADIUS };

          // Keep existing node references, just add the new one
          const newNodes = [...nodes, newNode];
          const newEdges = new Map(edges);
          newEdges.set(newNodeId, []);

          // Add new node to stacking order (renders on top)
          const newStackingOrder = new Set(stackingOrder);
          newStackingOrder.add(newNodeId);

          set({
            data: { nodes: newNodes, edges: newEdges, nodeCounter: Math.max(nodeCounter, newNodeId), stackingOrder: newStackingOrder },
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

        updateNodeLabel: (nodeId: number, label: string) => {
          const trimmed = label.trim().replace(/\*/g, '').slice(0, 5);
          const name = trimmed || String(nodeId);
          if (get().data.nodes.some((n) => n.id !== nodeId && nameOf(n) === name)) return name;
          setNodeLabel(nodeId, trimmed);
          return null;
        },

        applyEdgeListText: (text, anchor) => {
          const { data } = get();
          const why = whyNotWritable(data.nodes);
          if (why) return [{ line: 0, text: why }];
          // A canvas already past the size limits can still be trimmed here.
          const edgeCount = [...data.edges.values()].flat().reduce((n, e) => n + (e.type === EDGE_TYPE.UNDIRECTED ? 0.5 : 1), 0);
          const read = readEdgeList(text, { nodes: data.nodes.length, edges: Math.ceil(edgeCount) });
          if (!read.list) return read.problems;
          // Notes, blank lines or another order of the same graph change nothing (and add no undo step).
          if (meaningOfList(read.list) === meaningOf(data.nodes, data.edges)) return [];
          const next = applyEdgeList(data, read.list, anchor);
          if (next) putTextGraph(next);
          return [];
        },

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
              runIt: null,
            },
          });
        },

        showEvidence: (evidence) => {
          const { visualization, data } = get();
          if (visualization.state === VisualizationState.RUNNING) return () => {};
          const trace = emptyTrace();
          const joins = (a: number, b: number) => data.edges.get(a)?.find((e) => e.to === b);
          for (const { from, to } of evidence.edges) {
            // The edge as the canvas keys it: from `from`, and from `to` too when it runs both ways (or only that way).
            if (joins(from, to)) trace.edges.set(`${from}-${to}`, { isUsedInCycle: true });
            const back = joins(to, from);
            if (back && (back.type === EDGE_TYPE.UNDIRECTED || !joins(from, to))) trace.edges.set(`${to}-${from}`, { isUsedInCycle: true });
          }
          for (const id of evidence.marked ?? []) trace.nodes.set(id, { isInShortestPath: true });
          for (const id of evidence.nodes) trace.nodes.set(id, { isInCycle: true });
          // Something else changed the highlights since: what is lit now is what to put back.
          if (!evidenceLit || visualization.trace !== evidenceLit.shown) {
            evidenceLit = { layers: [], under: visualization.trace, shown: visualization.trace };
          }
          const key = {};
          evidenceLit.layers.push({ key, trace });
          evidenceLit.shown = trace;
          set({ visualization: { ...visualization, trace } });
          return () => {
            const lit = evidenceLit;
            const at = lit ? lit.layers.findIndex((layer) => layer.key === key) : -1;
            if (!lit || at < 0) return;
            const wasShown = at === lit.layers.length - 1;
            lit.layers.splice(at, 1);
            const now = get().visualization;
            const ours = now.trace === lit.shown;
            const next = lit.layers.length > 0 ? lit.layers[lit.layers.length - 1].trace : lit.under;
            if (lit.layers.length === 0) evidenceLit = null;
            if (!ours || !wasShown) return;
            lit.shown = next;
            set({ visualization: { ...now, trace: next } });
          };
        },

        // ========================================
        // Visualization Run
        // ========================================

        // A run opens on its Start step, so its first sentence shows at once.
        startVisualization: (run) => {
          set({
            visualization: {
              ...get().visualization,
              trace: emptyTrace(),
              state: VisualizationState.RUNNING,
              step: { ...initialStep, run },
              runIt: null,
            },
          });
          goToStep(0);
        },

        finishVisualization: () => {
          set({
            visualization: {
              ...get().visualization,
              state: VisualizationState.DONE,
              algorithm: NO_ALGORITHM,
              input: null,
              step: initialStep,
              runIt: null,
            },
          });
        },

        stepForward: () => {
          const { visualization } = get();
          const { step } = visualization;
          if (step.index >= lastShown(visualization)) return;
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

        setRunItMode: (on) => {
          const { visualization } = get();
          const { step } = visualization;
          if (!on) {
            set({ visualization: { ...visualization, runIt: null, step: { ...step, isAutoPlaying: false } } });
            return;
          }
          if (visualization.runIt || !canRunIt(step.run)) return;
          // The decisions already on screen stand as made; the run plays on to the learner's first turn.
          const index = Math.max(0, step.index);
          const picks = takenAt(step.run).slice(0, decidedBy(step.run, index));
          const turn = turnFrom(step.run, asksYesNo(step.run) ? decidedBy(step.run, index) : picks.length);
          const runIt: RunItState = { picks, turn, tries: 0, said: null };
          set({ visualization: { ...visualization, runIt, step: { ...step, isAutoPlaying: index < lastShown({ ...visualization, runIt }) } } });
        },

        pickNode: (nodeId) => {
          const { visualization, data } = get();
          const { runIt, step } = visualization;
          const turn = runIt?.turn;
          if (!runIt || !turn || step.index !== turn.limit || asksYesNo(step.run)) return;
          const picks = [...takenAt(step.run).slice(0, turn.decision), nodeId];
          const steered = steerRun(step.run, picks);
          if (steered.rejected) {
            const label = (id: number) => data.nodes.find((n) => n.id === id)?.label || String(id);
            const { text } = misconception(step.run.algorithmId, steered.run.events, steered.rejected, step.run.input!.adjacencyList, label);
            set({ visualization: { ...visualization, runIt: { ...runIt, tries: runIt.tries + 1, said: { tone: "miss", text, at: step.index } } } });
            return;
          }
          const decision = step.run.events[turn.event] as DecideEvent;
          const text = accepted(decision, nodeId, frameAt(step.run.events, turn.event), step.run.algorithmId);
          const next: RunItState = { picks, turn: turnFrom(steered.run, picks.length), tries: 0, said: { tone: "yes", text, at: step.index + 1 } };
          const shown = { ...visualization, runIt: next, step: { ...step, run: steered.run } };
          // Show the pick taken, then play on to the next turn.
          set({ visualization: { ...shown, step: { ...shown.step, isAutoPlaying: step.index + 1 < lastShown(shown) } } });
          goToStep(step.index + 1);
        },

        answerQuestion: (answer) => {
          const { visualization } = get();
          const { runIt, step } = visualization;
          const turn = runIt?.turn;
          if (!runIt || !turn || step.index !== turn.limit || !asksYesNo(step.run)) return;
          const reply = edgeReply(edgeQuestions(step.run.algorithmId, step.run.events)[turn.decision], step.run.events, answer);
          const said = { tone: reply.tone === "right" ? "yes" as const : "note" as const, text: reply.text, at: step.index + 1 };
          const next: RunItState = { ...runIt, turn: turnFrom(step.run, turn.decision + 1), said };
          const shown = { ...visualization, runIt: next };
          // Whatever the answer, show what the edge does, then play on to the next question.
          set({ visualization: { ...shown, step: { ...step, isAutoPlaying: step.index + 1 < lastShown(shown) } } });
          goToStep(step.index + 1);
        },

        restartRunIt: () => {
          const { visualization } = get();
          const { runIt, step } = visualization;
          if (!runIt) return;
          const { run } = steerRun(step.run, []);
          const fresh: RunItState = { picks: [], turn: turnFrom(run, 0), tries: 0, said: null };
          const shown = { ...visualization, runIt: fresh, step: { ...step, run } };
          set({ visualization: { ...shown, step: { ...shown.step, isAutoPlaying: 0 < lastShown(shown) } } });
          goToStep(0);
        },

        newRunItGraph: (seed) => {
          const { visualization, data } = get();
          const algorithmId = visualization.step.run.algorithmId;
          const shown = lookOf(data);
          let fresh = freshGraph(algorithmId, seed);
          // A different graph from the one on screen, however the seeds fall.
          for (let next = seed + 1; fresh && lookOf(fresh.graph) === shown && next < seed + 10; next++) fresh = freshGraph(algorithmId, next);
          if (!fresh) return ownGraphAt !== null;
          const { graph, from, to } = fresh;
          const built = buildRun(algorithmId, graph.nodes, graph.edges, from, to ?? undefined, { stepMode: true });
          if (!built || !("run" in built)) return ownGraphAt !== null;
          // A fresh graph on screen keeps the learner's own where it was in the history, while it is still behind.
          const own = !freshLooks.has(shown);
          if (!own && ownGraphAt !== null && useGraphHistoryStore.getState().past.length <= ownGraphAt) ownGraphAt = null;
          get().setGraph(graph.nodes, graph.edges, graph.nodeCounter);
          // The learner's own graph is now the last step in the history: put there by this change, or
          // already there when the step before it looked the same (the history keeps no repeats).
          if (own) ownGraphAt = useGraphHistoryStore.getState().past.length - 1;
          freshLooks.add(lookOf(graph));
          if (to !== null) get().setVisualizationInput({ startNodeId: from, endNodeId: to });
          get().startVisualization(built.run);
          get().setRunItMode(true);
          return ownGraphAt !== null;
        },

        bringBackOwnGraph: () => {
          if (ownGraphAt === null) return;
          const history = useGraphHistoryStore.getState;
          // The graph that came after the learner's own: still a fresh graph unless the learner went
          // back to their own and edited it (or edited further back), which leaves nothing put aside.
          const { past, future } = history();
          const after = ownGraphAt + 1;
          const next = after < past.length ? snapshotToData(past[after])
            : after === past.length ? get().data
            : future[after - past.length - 1] && snapshotToData(future[after - past.length - 1]);
          if (!next || !freshLooks.has(lookOf(next))) {
            ownGraphAt = null;
            return;
          }
          while (history().past.length > ownGraphAt) get().undo();
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

/** The furthest step the run may show: the last, or in Run it the one before the learner's turn. */
function lastShown(visualization: Visualization): number {
  const turn = visualization.runIt?.turn;
  return turn ? turn.limit : visualization.step.run.ends.length - 1;
}

export const selectStepIndex = (state: GraphStore) => state.visualization.step.index;
export const selectStepRun = (state: GraphStore) => state.visualization.step.run;

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
  selectIsInStepMode(state) && state.visualization.step.index < lastShown(state.visualization);
export const selectRunIt = (state: GraphStore) => state.visualization.runIt;
/** The run waits on screen for the learner's turn: a pick, or in Bellman-Ford a Yes / No answer. */
const selectIsAwaitingTurn = (state: GraphStore) => {
  const turn = state.visualization.runIt?.turn;
  return !!turn && selectIsInStepMode(state) && state.visualization.step.index === turn.limit;
};
/** The run waits on screen for the learner's pick of a node. */
export const selectIsAwaitingPick = (state: GraphStore) => selectIsAwaitingTurn(state) && !asksYesNo(state.visualization.step.run);
/** Bellman-Ford: the event of the edge check the run waits on screen for a Yes / No about, or null. */
export const selectAskedEdge = (state: GraphStore) =>
  selectIsAwaitingTurn(state) && asksYesNo(state.visualization.step.run) ? state.visualization.runIt!.turn!.event : null;
/** Bellman-Ford's Run it: the step on screen is the one that shows the reply to the learner's last answer. */
export const selectShowsReply = (state: GraphStore) => {
  const said = state.visualization.runIt?.said;
  return !!said && asksYesNo(state.visualization.step.run) && state.visualization.step.index === said.at;
};
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
type EdgeVisState = 'path' | 'cycle' | 'traversal' | 'default';

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

