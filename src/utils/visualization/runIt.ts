/**
 * Run it yourself: the learner picks the next node at each decision a learner could get wrong, and
 * the run follows their picks. The run is always made through `steer`, so it is a correct run of
 * the algorithm whatever is picked: a valid pick (any of several tied ones) is followed, a pick that
 * is not valid changes nothing and is named for its misconception (see `engine/turns.ts`).
 *
 * Bellman-Ford has nothing to pick: its Run it asks Yes or No at a few decisive edge checks instead
 * (`engine/questions.ts`), and the run plays on whatever the answer.
 *
 * The store keeps the picks so far and the turn the run waits at (`RunItState`); these helpers work
 * out the turns and make the steered runs.
 */
import { algorithmRegistry } from "../../algorithms";
import { asks, asksAboutEdges, edgeQuestions, familyOf, steer, type Rejection } from "../../algorithms/engine";
import { createRun, type Run } from "./runView";

/**
 * Where the run waits for the learner: its decision's number and event, and the last step shown
 * before it. In Bellman-Ford, `decision` is the question's number (see `edgeQuestions`).
 */
export interface Turn {
  decision: number;
  event: number;
  limit: number;
}

/** Whether a learner can run this run themselves: an app run (Bellman-Ford's asks about edges, the others make choices). */
export const canRunIt = (run: Run): boolean =>
  run.input !== undefined && (familyOf(run.algorithmId) !== null || asksAboutEdges(run.algorithmId));

/** Whether this run's turns ask Yes or No about an edge (Bellman-Ford) rather than for a node. */
export const asksYesNo = (run: Run): boolean => asksAboutEdges(run.algorithmId);

/** The node the run took at each of its decisions, in order. */
export const takenAt = (run: Run): number[] => run.events.flatMap((e) => (e.type === "decide" ? [e.node] : []));

/**
 * How many decisions the steps up to `index` have made (the ones the learner has seen); in
 * Bellman-Ford, how many of its questions come before step `index`.
 */
export const decidedBy = (run: Run, index: number): number =>
  asksYesNo(run) ? edgeQuestions(run.algorithmId, run.events).filter((q) => q.limit < index).length
    : index < 0 ? 0 : run.events.slice(0, run.ends[index]).filter((e) => e.type === "decide").length;

/** The first decision from number `from` on where the run waits for the learner, or null when none is left. */
export function turnFrom(run: Run, from: number): Turn | null {
  const graph = run.input?.adjacencyList;
  if (!graph) return null;
  if (asksYesNo(run)) {
    const q = edgeQuestions(run.algorithmId, run.events)[from];
    return q ? { decision: from, event: q.event, limit: q.limit } : null;
  }
  let decision = 0;
  for (let event = 0; event < run.events.length; event++) {
    if (run.events[event].type !== "decide") continue;
    if (decision >= from && asks(run.algorithmId, run.events, event, graph)) {
      const step = run.ends.findIndex((end) => end > event);
      return { decision, event, limit: Math.max(0, step - 1) };
    }
    decision += 1;
  }
  return null;
}

/** The run made again following `picks` (one per decision, forced ones included); the first pick that is not valid, if one is not. */
export function steerRun(run: Run, picks: readonly number[]): { run: Run; rejected: Rejection | null } {
  const adapter = algorithmRegistry.get(run.algorithmId);
  const input = run.input;
  if (!adapter || !input) return { run, rejected: null };
  const { events, rejected } = steer((choose) => adapter.events(input, choose), picks);
  return { run: createRun(run.algorithmId, events, run.nodeOrder, input), rejected };
}
