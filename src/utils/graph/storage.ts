/**
 * How the graph is stored, for the storage views: as an adjacency list (each node, then the nodes its
 * edges lead to) and as an adjacency matrix (a row and a column per node; the cell at row A, column B
 * holds the edge from A to B). Rows (and the matrix's columns) go in the order of the nodes' names
 * (D66). A row's entries keep the order the graph keeps its edges in, which is the order the
 * algorithms check them in. A two-way edge is stored both ways, so it is an entry in both rows; a
 * one-way edge in its start's row only. A graph whose edges all weigh 1 is unweighted (the edge list
 * then writes no weights either): the list leaves weights out and the matrix marks each edge with 1.
 * A cell with no edge is empty.
 */
import type { GraphEdge, GraphNode } from "../../components/Graph/types";
import { EDGE } from "../../constants/graph";
import { nameOrder } from "../../algorithms/adapters/nameOrder";
import { nameOf } from "./edgeList";

/** One entry in a node's row: an edge from that node. */
export interface StoredEdge {
  to: number;
  weight: number;
}

export interface Storage {
  /** Node ids in name order: the list's rows, and the matrix's rows and columns. */
  order: number[];
  /** The name the canvas shows for each node. */
  names: Map<number, string>;
  /** Each node's edges, in the order the graph keeps them. */
  rows: Map<number, StoredEdge[]>;
  /** Whether any edge weighs other than 1: then weights are shown. */
  weighted: boolean;
}

export function storageOf(nodes: readonly GraphNode[], edges: ReadonlyMap<number, readonly GraphEdge[]>): Storage {
  const all = [...edges.values()].flat();
  return {
    order: nameOrder({ nodes: [...nodes] }),
    names: new Map(nodes.map((n) => [n.id, nameOf(n)])),
    rows: new Map(nodes.map((n) => [n.id, (edges.get(n.id) ?? []).map(({ to, weight }) => ({ to, weight }))])),
    weighted: all.some((e) => e.weight !== EDGE.DEFAULT_WEIGHT),
  };
}

/** What the matrix cell at row `from`, column `to` shows: the edge's weight (1 in an unweighted graph), or null for no edge. */
export function cellOf(storage: Storage, from: number, to: number): number | null {
  const edge = storage.rows.get(from)?.find((e) => e.to === to);
  return edge === undefined ? null : storage.weighted ? edge.weight : 1;
}

