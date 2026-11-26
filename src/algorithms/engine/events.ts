/**
 * Algorithm events: what an algorithm did, one fact at a time.
 *
 * Adapters report events instead of highlight instructions. One pure reducer
 * (`frame.ts`) turns them into frames, and narration templates (`narration.ts`)
 * turn them into words. Every event names the pseudocode line it executes and
 * the iteration it belongs to; `steps.ts` cuts a run into steps of one change each,
 * and a check that changes nothing joins a change of its own iteration. Where the run could go more
 * than one way it reports a `decide` event, and a policy picks the way (`choices.ts`).
 */

/** Tags every event carries. */
interface Tagged {
  /** Index into the algorithm's pseudocode. */
  line: number;
  /** Iteration the event belongs to. Events of one iteration share a group; groups only increase. */
  group: number;
}

/**
 * The run begins at `node`, with its value if the algorithm keeps one. Algorithms with a frontier
 * begin with an enqueue instead. A later start (group > 0) restarts the search in a part of the
 * graph the earlier searches did not reach.
 */
export interface StartEvent extends Tagged {
  type: "start";
  node: number;
  value?: number;
}

/**
 * A node joins the frontier (queue, stack or priority queue), with its value if the algorithm keeps one.
 * `from` is the node whose edge discovered it (absent for the start). With `moved`, the node was
 * already waiting: it moves to the back of the frontier (the top of a stack) with `from` as its new parent.
 */
export interface EnqueueEvent extends Tagged {
  type: "enqueue";
  node: number;
  value?: number;
  from?: number;
  moved?: boolean;
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
  | "not-shorter"
  /** `from` has no value yet (∞), so it has nothing to offer. */
  | "unreached"
  /** `to` is already waiting in the frontier. */
  | "queued"
  /** `to` was already visited. */
  | "visited"
  /** The edge is the undirected one the search just came in on. */
  | "parent";

/**
 * The edge from -> to was checked and changed nothing. `value` is what going through it would give.
 * `check` marks the extra pass that looks for a negative cycle once the distances should be final.
 */
export interface SkipEvent extends Tagged {
  type: "skip";
  from: number;
  to: number;
  weight?: number;
  reason: SkipReason;
  value?: number;
  /** What `to` already had. */
  current?: number;
  check?: boolean;
}

/**
 * `node` leaves the frontier and is final. `via` is the node it was reached from (absent for the start).
 * `ties`, when the run could have taken any of several nodes here, lists them all in the order the run
 * considers them, `node` among them (the `decide` event before this one holds the same choice).
 */
export interface SettleEvent extends Tagged {
  type: "settle";
  node: number;
  value?: number;
  via?: number;
  ties?: number[];
  /** The node is the one the run was looking for. */
  target?: boolean;
  /** A depth-first search's discovery time: its clock ticks once per visit and once per finish, from 1. */
  time?: number;
}

/**
 * How a depth-first search classifies an edge it meets: `tree` leads to an unvisited node,
 * `back` to a node still in progress (a cycle), `forward` to a finished descendant and
 * `cross` to any other finished node.
 */
export type EdgeClass = "tree" | "back" | "forward" | "cross";

/**
 * An edge classified (see `EdgeClass`). Every depth-first search reports each class it gives an edge
 * this way, and a classification on its own is a check that changes nothing. The stack-based searches
 * classify an edge to a visited node when they check it (`back` or `cross`; an undirected edge back
 * to the node's parent is the tree edge seen from below, a plain skip); an edge they pushed along whose
 * node a deeper node took over is `forward`, said just before that node is visited.
 *
 * `loop` marks the one classification that is a change of its own (see `steps.ts`): the edge cycle
 * detection reports as closing its cycle. Nothing else marks a loop, whatever its class. That edge is
 * `back`, or, in a graph that mixes directed and undirected edges, may lead to a done node whose
 * undirected ways in climb back up to a node in progress: `through` lists the nodes that climb passes,
 * ending at the one in progress.
 */
export interface ClassifyEvent extends Tagged {
  type: "classify";
  from: number;
  to: number;
  kind: EdgeClass;
  loop?: true;
  through?: number[];
}

/**
 * A depth-first search is done with `node`: every edge out of it has been followed. It returns to `parent`.
 * `time` is its finish time on the search's clock (see `SettleEvent.time`).
 */
export interface FinishEvent extends Tagged {
  type: "finish";
  node: number;
  parent?: number;
  time: number;
}

/**
 * What a decision chooses: `next` is the node taken next (from the frontier, or, in cycle
 * detection, the neighbour whose edge is followed next: one to go into, or one in progress that
 * closes a loop); `restart` is where a new search starts.
 */
export type DecideKind = "next" | "restart";

/**
 * The run chose `node` among `options`: every choice that is valid here, in the order the run
 * considers them (the default policy takes the first). A decision changes nothing on its own: the
 * change right after it takes `node` (a settle, a start, or the loop found on the edge back to it),
 * and the decision belongs to that step.
 * Runs report every decision, forced ones (a single option) included.
 */
export interface DecideEvent extends Tagged {
  type: "decide";
  kind: DecideKind;
  options: number[];
  node: number;
}

/** A decision about to be made: what is chosen, and every valid option in the order the run considers them. */
export interface Decision {
  kind: DecideKind;
  options: readonly number[];
}

/** Picks one of a decision's options (see `choices.ts`). */
export type ChoicePolicy = (decision: Decision) => number;

/** An edge the answer is made of. */
export interface WeightedEdge {
  from: number;
  to: number;
  weight: number;
}

/**
 * A route answer. `path` is the route from start to target as node ids, or null when there is
 * none. `cost` is the route's total weight (absent when the algorithm counts edges instead).
 * `negativeCycle` is the edge that still improved after every round, when one did.
 */
export interface RouteAnswer extends Tagged {
  type: "answer";
  kind: "route";
  start: number;
  target: number;
  path: number[] | null;
  cost?: number;
  negativeCycle?: WeightedEdge & { value: number; current: number };
}

/** A traversal answer: the nodes in the order they were visited, and those never reached. */
export interface OrderAnswer extends Tagged {
  type: "answer";
  kind: "order";
  start: number;
  order: number[];
  unreached: number[];
}

/** A spanning tree answer: its edges in the order they joined, total weight, and nodes left out. */
export interface TreeAnswer extends Tagged {
  type: "answer";
  kind: "tree";
  start: number;
  edges: WeightedEdge[];
  total: number;
  unreached: number[];
}

/**
 * A cycle answer: `cycle` walks the loop from its first node back round to it (the last edge
 * returns to `cycle[0]`), or is null when the graph has none.
 */
export interface CycleAnswer extends Tagged {
  type: "answer";
  kind: "cycle";
  cycle: number[] | null;
}

export type AnswerEvent = RouteAnswer | OrderAnswer | TreeAnswer | CycleAnswer;

export type AlgorithmEvent =
  | StartEvent | DecideEvent | EnqueueEvent | RelaxEvent | SkipEvent | SettleEvent | ClassifyEvent | FinishEvent | AnswerEvent;
