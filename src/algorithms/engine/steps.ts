/**
 * Steps: how a run's events are grouped for the learner.
 *
 * Overview shows one iteration per step; Every edge shows each event (each edge check) as its own step.
 */
import type { AlgorithmEvent } from "./events";

export type Detail = "overview" | "every-edge";

/**
 * For each step, how many events have been applied once that step is shown.
 * Feed an entry to `frameAt` to get the step's frame.
 */
export function stepEnds(events: readonly AlgorithmEvent[], detail: Detail): number[] {
  const ends: number[] = [];
  events.forEach((event, i) => {
    const next = events[i + 1];
    if (detail === "every-edge" || !next || next.group !== event.group) ends.push(i + 1);
  });
  return ends;
}
