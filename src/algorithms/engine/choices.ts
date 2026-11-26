/**
 * Choices: where a run could go more than one way, and who picks the way.
 *
 * At each decision an adapter lists every valid option, in the order it considers them, and asks a
 * policy which one to take (`decide`). The default policy takes the first, which is the run the app
 * has always shown. A steering policy follows a learner's picks (`steer`): a pick that is not among
 * the options is rejected, reported with the decision it was made at, and the run goes on as if it
 * had not been made, so the events are always a correct run of the algorithm.
 */
import type { AlgorithmEvent, ChoicePolicy, DecideEvent, DecideKind } from "./events";

/** The default policy: the first option, the way the run has always gone. */
export const firstOption: ChoicePolicy = ({ options }) => options[0];

type Tags = { line: number; group: number };

/**
 * Asks `choose` to pick one of `options` (every valid choice, in the order the run considers them),
 * reports the decision as a `decide` event and returns the pick. `tags` may depend on the pick, as
 * the decision belongs to the iteration of the change that takes it.
 */
export function decide(
  events: AlgorithmEvent[], choose: ChoicePolicy, kind: DecideKind, options: number[], tags: Tags | ((node: number) => Tags),
): number {
  const node = choose({ kind, options });
  if (!options.includes(node)) throw new Error(`A choice policy picked ${node}, which is not one of ${options.join(", ")}`);
  events.push({ type: "decide", kind, options, node, ...(typeof tags === "function" ? tags(node) : tags) });
  return node;
}

/** A pick that was not a valid choice. */
export interface Rejection {
  /** The node picked. */
  choice: number;
  /** Which decision it was made at, counting from 0: an index into the picks and into the run's decisions. */
  decision: number;
  /** Where that decision is in the run's events: `frameAt(events, event)` is what the learner saw when picking. */
  event: number;
  /** The decision: its valid options, and the one the run took instead. */
  decide: DecideEvent;
}

/** A run steered by a learner's picks. */
export interface SteeredRun {
  events: AlgorithmEvent[];
  /** How many picks the run followed. */
  followed: number;
  /** The first pick that was not a valid choice, if one was not; the run took the first option there instead. */
  rejected: Rejection | null;
}

/**
 * Runs `run` following `picks`, one per decision in order (forced ones included). Once the picks
 * run out, or one is rejected, the run takes the first option at every decision left.
 */
export function steer(run: (choose: ChoicePolicy) => AlgorithmEvent[], picks: readonly number[]): SteeredRun {
  const state = { asked: 0, followed: 0, rejected: null as { choice: number; decision: number } | null };
  const events = run((decision) => {
    const at = state.asked++;
    if (state.rejected === null && at < picks.length) {
      if (decision.options.includes(picks[at])) {
        state.followed += 1;
        return picks[at];
      }
      state.rejected = { choice: picks[at], decision: at };
    }
    return firstOption(decision);
  });
  if (state.rejected === null) return { events, followed: state.followed, rejected: null };
  const { choice, decision } = state.rejected;
  const event = events.flatMap((e, i) => (e.type === "decide" ? [i] : []))[decision];
  return { events, followed: state.followed, rejected: { choice, decision, event, decide: events[event] as DecideEvent } };
}
