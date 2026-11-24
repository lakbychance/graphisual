/**
 * Narration: the words for each step, built from event templates.
 *
 * One voice throughout: present tense, plain words, one sentence per step and no full stops
 * (the app's convention for hints). Node ids are marked with `nid` so the trace panel and
 * the landing pages can show each node's label.
 */
import { nid } from "../traceHelpers";
import type { AlgorithmEvent, RelaxEvent, SettleEvent, SkipEvent } from "./events";
import { stepEnds, type Detail } from "./steps";

const num = (value: number | undefined) =>
  value === undefined || value === Infinity ? "∞" : value < 0 ? `−${-value}` : String(value);

/** `a + w = s`, written `a − w = s` when the weight is negative. */
const sum = (base: number, weight: number, total: number) =>
  `${num(base)} ${weight < 0 ? "−" : "+"} ${Math.abs(weight)} = ${num(total)}`;

/** "A", "A and B", "A, B and C" */
const joinAnd = (parts: string[]) =>
  parts.length <= 1 ? parts.join("") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;

const route = (path: number[]) => path.map(nid).join(" → ");

function settleSentence(event: SettleEvent): string {
  const { node, value, ties = [], target, via } = event;
  if (target && via === undefined) return `${nid(node)} is both the start and the destination, so the search stops right away`;
  const choice = ties.length > 0
    ? `${joinAnd([node, ...ties].map(nid))} tie for closest at ${num(value)}, so take ${nid(node)} and make its distance final`
    : `${nid(node)} is the closest node in the queue, at ${num(value)}, so its distance is final`;
  return target ? `${choice}; it is the destination, so the search stops` : choice;
}

function relaxSentence(event: RelaxEvent): string {
  const { from, to, weight, old, next, queue } = event;
  const check = `${nid(from)} → ${nid(to)} costs ${weight}: ${sum(next - weight, weight, next)} beats ${num(old)}`;
  if (old === Infinity) return `${check}, so ${nid(to)} ${queue ? "joins the queue at" : "gets"} ${num(next)}`;
  return `${check}, so ${nid(to)}'s distance drops to ${num(next)}`;
}

function skipSentence(event: SkipEvent): string {
  const { from, to, weight, reason, value, current } = event;
  if (reason === "settled") return `${nid(from)} → ${nid(to)}: ${nid(to)}'s distance is already final, so skip it`;
  const offer = value === undefined ? "going this way" : sum(value - weight, weight, value);
  return `${nid(from)} → ${nid(to)} costs ${weight}: ${offer} is no better than ${num(current)}, so ${nid(to)} keeps ${num(current)}`;
}

/** The sentence for one event (the Every edge level). */
export function narrateEvent(event: AlgorithmEvent): string {
  switch (event.type) {
    case "enqueue":
      if (event.group === 0) {
        return event.value === undefined
          ? `Start at ${nid(event.node)}`
          : `Start at ${nid(event.node)} with distance ${num(event.value)}; every other node is unreached (∞) for now`;
      }
      return `${nid(event.node)} joins the queue${event.value === undefined ? "" : ` at ${num(event.value)}`}`;
    case "relax":
      return relaxSentence(event);
    case "skip":
      return skipSentence(event);
    case "settle":
      return settleSentence(event);
    case "classify":
      return `${nid(event.from)} → ${nid(event.to)} is a ${event.kind} edge`;
    case "answer":
      if (!event.path) return `The queue is empty and ${nid(event.target)} was never reached, so there is no route from ${nid(event.start)} to ${nid(event.target)}`;
      if (event.path.length === 1) return `The route is just ${nid(event.start)}, total distance 0`;
      return `Walk back from ${nid(event.target)} to read the route: ${route(event.path)}, total distance ${num(event.cost)}`;
  }
}

/** The sentence for one iteration (the Overview level). */
export function narrateGroup(events: readonly AlgorithmEvent[]): string {
  const [first] = events;
  if (first?.type !== "settle" || events.length === 1) return events.map(narrateEvent).join("; ");
  // A node improved twice in one iteration (parallel edges) is named once, at its last value.
  const improved = new Map<number, number>();
  for (const e of events) if (e.type === "relax") improved.set(e.to, e.next);
  const checks = improved.size > 0
    ? `checking its edges improves ${joinAnd([...improved].map(([id, value]) => `${nid(id)} to ${num(value)}`))}`
    : "checking its edges improves nothing";
  return `${settleSentence(first)}; ${checks}`;
}

/** One message per step of the run at the given detail level. */
export function narrate(events: readonly AlgorithmEvent[], detail: Detail): string[] {
  let start = 0;
  return stepEnds(events, detail).map((end) => {
    const step = events.slice(start, end);
    start = end;
    return detail === "overview" ? narrateGroup(step) : narrateEvent(step[0]);
  });
}
