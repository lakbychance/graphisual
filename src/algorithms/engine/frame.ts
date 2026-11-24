/**
 * Frames: the state of a run after a number of its events.
 *
 * `applyEvent` is the one pure reducer. `frameAt` replays from cached checkpoints so
 * scrubbing anywhere in a long run stays cheap.
 */
import type { AlgorithmEvent, AnswerEvent, EdgeClass } from "./events";

export interface QueueItem {
  id: number;
  value?: number;
}

export interface Frame {
  /** Pseudocode line of the last event applied (null before the first). */
  line: number | null;
  /** Iteration of the last event applied (null before the first). */
  group: number | null;
  /** The node being worked on: the one settled most recently, or the one a depth-first search returned to. */
  current: number | null;
  /** The edge the last event looked at, if it looked at one. */
  edge: { from: number; to: number } | null;
  /** Final nodes, in the order they became final. */
  settled: readonly number[];
  /** Nodes a depth-first search is done with, in the order it finished them. */
  finished: readonly number[];
  /** For each settled node, the node it was reached from. */
  via: ReadonlyMap<number, number>;
  /** Best value known so far per node (distance, key or depth). Missing means ∞. */
  dist: ReadonlyMap<number, number>;
  /** For each node, the node its best value came through. */
  prev: ReadonlyMap<number, number>;
  /** The frontier, in insertion order. */
  queue: readonly QueueItem[];
  /** Classified edges, keyed `from-to`. */
  edgeClass: ReadonlyMap<string, EdgeClass>;
  answer: AnswerEvent | null;
}

export const emptyFrame: Frame = {
  line: null,
  group: null,
  current: null,
  edge: null,
  settled: [],
  finished: [],
  via: new Map(),
  dist: new Map(),
  prev: new Map(),
  queue: [],
  edgeClass: new Map(),
  answer: null,
};

const withEntry = <K, V>(map: ReadonlyMap<K, V>, key: K, value: V) => new Map(map).set(key, value);

/** The frame after `event`. Never mutates `frame`. */
export function applyEvent(frame: Frame, event: AlgorithmEvent): Frame {
  const next: Frame = { ...frame, line: event.line, group: event.group, edge: null };
  switch (event.type) {
    case "start":
      if (event.value !== undefined) next.dist = withEntry(frame.dist, event.node, event.value);
      break;
    case "enqueue":
      next.queue = [...frame.queue.filter((item) => item.id !== event.node), { id: event.node, value: event.value }];
      if (event.value !== undefined) next.dist = withEntry(frame.dist, event.node, event.value);
      if (event.from !== undefined) {
        next.prev = withEntry(frame.prev, event.node, event.from);
        next.edge = { from: event.from, to: event.node };
      }
      break;
    case "relax": {
      next.edge = { from: event.from, to: event.to };
      next.dist = withEntry(frame.dist, event.to, event.next);
      next.prev = withEntry(frame.prev, event.to, event.from);
      const queued = frame.queue.some((item) => item.id === event.to);
      if (queued) {
        next.queue = frame.queue.map((item) => (item.id === event.to ? { id: item.id, value: event.next } : item));
      } else if (event.queue) {
        next.queue = [...frame.queue, { id: event.to, value: event.next }];
      }
      break;
    }
    case "skip":
      next.edge = { from: event.from, to: event.to };
      break;
    case "settle":
      next.current = event.node;
      next.settled = [...frame.settled, event.node];
      next.queue = frame.queue.filter((item) => item.id !== event.node);
      if (event.via !== undefined) {
        next.via = withEntry(frame.via, event.node, event.via);
        next.edge = { from: event.via, to: event.node };
      }
      if (event.value !== undefined) next.dist = withEntry(frame.dist, event.node, event.value);
      break;
    case "classify":
      next.edge = { from: event.from, to: event.to };
      next.edgeClass = withEntry(frame.edgeClass, `${event.from}-${event.to}`, event.kind);
      break;
    case "finish":
      next.current = event.parent ?? null;
      next.finished = [...frame.finished, event.node];
      break;
    case "answer":
      next.current = null;
      next.answer = event;
      break;
  }
  return next;
}

/** A checkpoint is kept every this many events. */
const CHECKPOINT_EVERY = 32;

/** checkpoints[k] is the frame after the first k * CHECKPOINT_EVERY events. */
const checkpointCache = new WeakMap<readonly AlgorithmEvent[], Frame[]>();

/**
 * The frame after the first `i` events (0 is the frame before anything happened).
 * `i` is clamped to 0..events.length. Treat `events` as immutable once passed in:
 * checkpoints are cached per array.
 */
export function frameAt(events: readonly AlgorithmEvent[], i: number): Frame {
  const target = Math.max(0, Math.min(Math.floor(i), events.length));
  let checkpoints = checkpointCache.get(events);
  if (!checkpoints) {
    checkpoints = [emptyFrame];
    checkpointCache.set(events, checkpoints);
  }
  const wanted = Math.floor(target / CHECKPOINT_EVERY);
  // Extend the checkpoints up to the one at or before `target`.
  while (checkpoints.length <= wanted) {
    const k = checkpoints.length;
    let frame = checkpoints[k - 1];
    for (let e = (k - 1) * CHECKPOINT_EVERY; e < k * CHECKPOINT_EVERY; e++) frame = applyEvent(frame, events[e]);
    checkpoints.push(frame);
  }
  let frame = checkpoints[wanted];
  for (let e = wanted * CHECKPOINT_EVERY; e < target; e++) frame = applyEvent(frame, events[e]);
  return frame;
}
