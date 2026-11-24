/**
 * Steps: how a run's events are grouped for the learner. One grouping for the app and the landing pages.
 *
 * A step is one change the algorithm makes: a node joins the frontier or leaves it, a value
 * improves, a depth-first search backs up out of a node, an edge leads back to a node in progress
 * (a cycle), the run starts or answers. A check that changes nothing (a skip, or an edge to a
 * node already done) gets no step of its own: it belongs to the next change of its iteration, or
 * to the iteration's last change when none follows. An iteration that changes nothing at all
 * (a Bellman-Ford round with no improvement) is one step.
 */
import type { AlgorithmEvent } from "./events";

/** Whether an event changes the run's state. Checks that change nothing return false. */
export const changes = (event: AlgorithmEvent): boolean =>
  event.type === "skip" ? false : event.type === "classify" ? event.kind === "back" : true;

/**
 * For each step, how many events have been applied once that step is shown.
 * Feed an entry to `frameAt` to get the step's frame.
 */
export function stepEnds(events: readonly AlgorithmEvent[]): number[] {
  const ends: number[] = [];
  /** Where the step of the iteration's latest change ends, if it has had one: right after that change. */
  let open: number | null = null;
  events.forEach((event, i) => {
    if (changes(event)) {
      // A later change closes the step of the one before it; the checks in between belong to the later one.
      if (open !== null) ends.push(open);
      open = i + 1;
    }
    const next = events[i + 1];
    if (!next || next.group !== event.group) {
      // The iteration's last step takes the checks that follow its last change.
      ends.push(i + 1);
      open = null;
    }
  });
  return ends;
}
