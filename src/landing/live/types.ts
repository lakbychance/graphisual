import type { LabGraph } from "../engine";

/** What the algorithm produces, which decides how a run is summarised. */
export type Kind = "route" | "traversal" | "tree" | "cycle";

/** Indexes (of steps or pseudocode lines) lit in each part of a run. */
export interface PhaseMap {
  ready: number[];
  explore: number[];
  /** The frame where the destination, or a cycle, is found. */
  found: number[];
  answer: number[];
}

export interface Spec { label: string; value: string; note: string }

export interface CompareTable {
  title: string;
  columns: string[];
  /** Index of a cell column set in the code face (for complexities). */
  mono?: number;
  rows: Array<{ name: string; cells: string[] }>;
}

/** A small experiment with one switch, run by one or two algorithms side by side. */
export interface Experiment {
  title: string;
  text: string;
  toggle: string;
  initial: boolean;
  graph: (on: boolean) => LabGraph;
  /** Whether edge weights are drawn for a given switch position. */
  weighted: (on: boolean) => boolean;
  /** How two routes are compared: by total weight, or by number of edges. */
  measure?: "cost" | "edges";
  runs: Array<{ name: string; algorithmId: string; start?: number }>;
}

/** Everything that makes an algorithm's page live: its graph, code and experiment. */
export interface LiveConfig {
  algorithmId: string;
  kind: Kind;
  /** Edges carry weights that matter (drawn, and editable in the hero). */
  weighted: boolean;
  directed?: boolean;
  /** The headline's two lines. */
  headline: [string, string];
  /** Hero edges between node indexes: [from, to, weight]. */
  edges: Array<[number, number, number]>;
  /** What the table under the steps shows: best distance, or visit order. */
  ledger: "distance" | "order";
  pseudocode: string[];
  lines: PhaseMap;
  steps: PhaseMap;
  specs: Spec[];
  limits: { heading: string; experiment: Experiment; table: CompareTable; here: string };
}
