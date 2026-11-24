/**
 * Algorithm events: what an algorithm did, one fact at a time.
 *
 * Adapters report events instead of highlight instructions. One pure reducer
 * (`frame.ts`) turns them into frames, and narration templates (`narration.ts`)
 * turn them into words. Every event names the pseudocode line it executes and
 * the iteration it belongs to, so a run can be stepped one iteration at a time
 * (Overview) or one event at a time (Every edge).
 */

/** Tags every event carries. */
interface Tagged {
  /** Index into the algorithm's pseudocode. */
  line: number;
  /** Iteration the event belongs to. Events of one iteration share a group; groups only increase. */
  group: number;
}

/** A node joins the frontier (queue, stack or priority queue), with its value if the algorithm keeps one. */
export interface EnqueueEvent extends Tagged {
  type: "enqueue";
  node: number;
  value?: number;
}

/**
 * The edge from -> to was checked and gives `to` a better value: `old` becomes `next`.
 * With `queue`, `to` is put in the frontier at `next` (inserted, or moved up if already there).
 */
export interface RelaxEvent extends Tagged {
  type: "relax";
  from: number;
  to: number;
  weight: number;
  old: number;
  next: number;
  queue?: boolean;
}

/** Why a checked edge changed nothing. */
export type SkipReason =
  /** `to` is already final. */
  | "settled"
  /** Going through `from` is not shorter than what `to` already has. */
  | "not-shorter";

/** The edge from -> to was checked and changed nothing. `value` is what going through it would give. */
export interface SkipEvent extends Tagged {
  type: "skip";
  from: number;
  to: number;
  weight: number;
  reason: SkipReason;
  value?: number;
  /** What `to` already had. */
  current?: number;
}

/**
 * `node` leaves the frontier and is final. `via` is the node it was reached from (absent for the start).
 * `ties` lists other frontier nodes that were exactly as good, if any.
 */
export interface SettleEvent extends Tagged {
  type: "settle";
  node: number;
  value?: number;
  via?: number;
  ties?: number[];
  /** The node is the one the run was looking for. */
  target?: boolean;
}

/** How a depth-first search classifies an edge it meets. */
export type EdgeClass = "tree" | "back" | "forward" | "cross";

export interface ClassifyEvent extends Tagged {
  type: "classify";
  from: number;
  to: number;
  kind: EdgeClass;
}

/**
 * The run's answer. `path` is the route from start to target as node ids, or null when
 * the target cannot be reached. `cost` is the route's total weight.
 */
export interface AnswerEvent extends Tagged {
  type: "answer";
  start: number;
  target: number;
  path: number[] | null;
  cost?: number;
}

export type AlgorithmEvent = EnqueueEvent | RelaxEvent | SkipEvent | SettleEvent | ClassifyEvent | AnswerEvent;
