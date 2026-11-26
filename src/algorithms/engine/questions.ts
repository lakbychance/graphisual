/**
 * Bellman-Ford's Run it: Bellman-Ford checks its edges in one fixed order, so there is nothing to
 * pick. Its Run it plays the run and stops now and then at a decisive moment to ask, Yes or No,
 * whether the edge about to be checked lowers its end's distance (Byrne, Catrambone & Stasko 1999).
 * Asking at every step teaches nothing more (Jarc et al. 2000), so it asks sparingly: at most `MOST`
 * questions a run, never two within `GAP` steps of each other.
 *
 * A check is worth asking about when the answer takes a comparison: the node at the edge's end
 * already has a distance, more than the node it leaves from (or the edge is negative), and not one
 * it got along this very edge (checking it again offers the same distance), the edge's start has a
 * new distance since the edge was last checked (else it can only say "no" again), and nothing
 * changes on the step that shows the answer before the check (the learner sees what it starts
 * from). A "No" is not asked when the step that shows it lowers that same node through another edge,
 * which would read as a contradiction. The run pauses on the step before the one that shows the
 * answer; whatever the answer, it says why, and the run goes on.
 *
 * Words follow the narration's voice (present tense, plain words, no full stops), node ids marked
 * with `nid`.
 */
import { nid } from "../traceHelpers";
import type { AlgorithmEvent, RelaxEvent, SkipEvent } from "./events";
import { frameAt } from "./frame";
import { changes, stepEnds } from "./steps";

/** Whether the edge checked at `event` (a relax, or a skip that is no better) lowers its end's distance, asked on step `limit`. */
export interface EdgeQuestion {
  event: number;
  limit: number;
  yes: boolean;
}

/** At most this many questions a run, */
export const MOST = 5;
/** never two within this many steps of each other. */
export const GAP = 4;

/** The algorithms whose Run it asks Yes / No about edges instead of picking nodes. */
export const asksAboutEdges = (algorithmId: string) => algorithmId === "bellman-ford";

const num = (value: number) => (value === Infinity ? "∞" : value < 0 ? `−${-value}` : String(value));

/** `a + w = s`, written `a − w = s` when the weight is negative (as the narration writes it). */
const sum = (base: number, weight: number, total: number) =>
  `${num(base)} ${weight < 0 ? "−" : "+"} ${Math.abs(weight)} = ${num(total)}`;

/** The check a question asks about: its edge, the distance it offers, and what its end had. */
export function edgeCheck(events: readonly AlgorithmEvent[], at: number) {
  const e = events[at] as RelaxEvent | SkipEvent;
  const weight = e.weight as number;
  const offer = e.type === "relax" ? e.next : (e.value as number);
  const had = e.type === "relax" ? e.old : (e.current as number);
  return { from: e.from, to: e.to, weight, offer, had, base: offer - weight };
}

const cache = new WeakMap<readonly AlgorithmEvent[], EdgeQuestion[]>();

/** The questions a run stops to ask, in step order: its decisive checks, taken in order, each `GAP` steps after the last, `MOST` at most. */
export function edgeQuestions(algorithmId: string, events: readonly AlgorithmEvent[]): EdgeQuestion[] {
  if (!asksAboutEdges(algorithmId)) return [];
  const cached = cache.get(events);
  if (cached) return cached;
  const ends = stepEnds(events);
  const kept: EdgeQuestion[] = [];
  /** The start's distance when each edge (its ends and weight) was last checked. */
  const lastChecked = new Map<string, number>();
  events.forEach((event, at) => {
    if (event.type !== "relax" && event.type !== "skip") return;
    const road = `${event.from}-${event.to}-${event.weight}`;
    const before = lastChecked.get(road);
    const start = event.type === "relax" ? event.next - event.weight : event.value === undefined ? Infinity : event.value - (event.weight as number);
    lastChecked.set(road, start);
    if (before === start || kept.length >= MOST) return;
    if (event.type !== "relax" && !(event.reason === "not-shorter" && !event.check)) return;
    const step = ends.findIndex((end) => end > at);
    const limit = step - 1;
    const last = kept[kept.length - 1];
    if (limit < 1 || (last && limit - last.limit < GAP)) return;
    const { from, to, weight, had, base, offer } = edgeCheck(events, at);
    if (had === Infinity || (weight >= 0 && had <= base)) return;
    if (offer === had && frameAt(events, at).prev.get(to) === from) return;
    const shown = events.slice(ends[limit], ends[step]);
    if (shown.slice(0, at - ends[limit]).some(changes)) return;
    const yes = event.type === "relax";
    if (!yes && shown.some((e) => e.type === "relax" && e.to === to)) return;
    kept.push({ event: at, limit, yes });
  });
  cache.set(events, kept);
  return kept;
}

/** The question, as the notebook asks it. */
export function edgeQuestion(q: EdgeQuestion, events: readonly AlgorithmEvent[]): string {
  const { from, to } = edgeCheck(events, q.event);
  return `Does ${nid(from)} → ${nid(to)} lower ${nid(to)}'s distance?`;
}

/** What the learner's answer gets back. */
export interface EdgeReply {
  tone: "right" | "wrong" | "skip";
  /** One line, node ids marked. */
  text: string;
}

/** The reply to Yes or No (null when the learner skips): whether it does, and why, from the check's own numbers. */
export function edgeReply(q: EdgeQuestion, events: readonly AlgorithmEvent[], answer: boolean | null): EdgeReply {
  const { offer, had, base, weight } = edgeCheck(events, q.event);
  const why = `${sum(base, weight, offer)}, which ${q.yes ? "beats" : "is no better than"} ${num(had)}`;
  if (answer === q.yes) return { tone: "right", text: `Right, it ${q.yes ? "does" : "doesn't"} — ${why}` };
  return { tone: answer === null ? "skip" : "wrong", text: `It ${q.yes ? "does" : "doesn't"} — ${why}` };
}
