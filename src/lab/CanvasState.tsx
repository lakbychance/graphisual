/**
 * The lab's drawing on the graph: the app's own run marks (`Graph/RunMarks.tsx`), fed from the
 * lab's step view so each variant chooses what it shows (values).
 */
import type { GraphEdge, GraphNode } from "@/components/Graph/types";
import type { GraphLayers } from "@/components/Graph/Graph";
import { markLayers, type MarkOptions } from "@/components/Graph/RunMarks";
import type { StepView } from "./model";

/** What a variant puts on the canvas. */
export type CanvasOptions = MarkOptions;

interface Props {
  view: StepView;
  nodes: GraphNode[];
  edges: Map<number, GraphEdge[]>;
  options: CanvasOptions;
  zoom: number;
}

/** The lab's two drawing layers for `Graph`. */
export function canvasLayers({ view, nodes, edges, options, zoom }: Props): GraphLayers {
  return markLayers({ step: view.index, valued: view.valued, badges: view.nodes, marks: view.marks, nodes, edges, options, zoom });
}
