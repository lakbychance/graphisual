/**
 * Narration: the words for each step, built from event templates.
 *
 * One voice throughout: present tense, plain words, one sentence per step and no full stops
 * (the app's convention for hints). Node ids are marked with `nid` so the trace panel and
 * the landing pages can show each node's label.
 *
 * A step is one change (see `steps.ts`), said with the checks that belong to it: by default each
 * event's sentence in order, joined with semicolons. Voices share their sentences wherever the
 * algorithms agree.
 */
import { nid } from "../traceHelpers";
import type {
  AlgorithmEvent, ClassifyEvent, EnqueueEvent, FinishEvent, RelaxEvent, RouteAnswer, SettleEvent, SkipEvent,
} from "./events";
import { changes, stepEnds } from "./steps";

const num = (value: number | undefined) =>
  value === undefined || value === Infinity ? "∞" : value < 0 ? `−${-value}` : String(value);

/** `a + w = s`, written `a − w = s` when the weight is negative. */
const sum = (base: number, weight: number, total: number) =>
  `${num(base)} ${weight < 0 ? "−" : "+"} ${Math.abs(weight)} = ${num(total)}`;

/** "A", "A and B", "A, B and C" */
const joinAnd = (parts: string[]) =>
  parts.length <= 1 ? parts.join("") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;

const route = (path: number[]) => path.map(nid).join(" → ");
const arrow = (from: number, to: number) => `${nid(from)} → ${nid(to)}`;
const names = (ids: number[]) => joinAnd(ids.map(nid));

interface Voice {
  /** The words for one event, a change or a check ("" when another event of the step says it). */
  event: (event: AlgorithmEvent) => string;
  /** The sentence for a whole step, when it is not just its events' words in order. */
  step?: (events: readonly AlgorithmEvent[]) => string;
}

/* ---------------------------------------------------------- shared sentences */

const startWithDistance = (node: number, value: number | undefined) =>
  `Start at ${nid(node)} with distance ${num(value)}; every other node is unreached (∞) for now`;

const sameStartAndEnd = (node: number) => `${nid(node)} is both the start and the destination, so the search stops right away`;

/** A depth-first search is done with a node and goes back up the branch. */
const finishSentence = ({ node, parent }: FinishEvent) =>
  `${nid(node)} has no edges left to follow, so it is done${parent === undefined ? "" : `; go back to ${nid(parent)}`}`;

/** A route answer, or why there is none (`ended` says what ran out). */
function routeSentence(event: RouteAnswer, ended: string): string {
  const { start, target, path, cost } = event;
  if (!path) return `${ended} and ${nid(target)} was never reached, so there is no route from ${nid(start)} to ${nid(target)}`;
  if (cost === undefined) {
    if (path.length === 1) return `The route is just ${nid(start)}`;
    const edges = path.length - 1;
    return `Walk back from ${nid(target)} along the parents to read the route: ${route(path)}, ${edges} ${edges === 1 ? "edge" : "edges"}`;
  }
  if (path.length === 1) return `The route is just ${nid(start)}, total distance 0`;
  return `Walk back from ${nid(target)} to read the route: ${route(path)}, total distance ${num(cost)}`;
}

/* ----------------------------------------------------- distances (Dijkstra's) */

function relaxSentence(event: RelaxEvent): string {
  const { from, to, weight, old, next, queue } = event;
  const check = `${arrow(from, to)} costs ${num(weight)}: ${sum(next - weight, weight, next)} beats ${num(old)}`;
  if (old === Infinity) return `${check}, so ${nid(to)} ${queue ? "joins the queue at" : "gets"} ${num(next)}`;
  return `${check}, so ${nid(to)}'s distance drops to ${num(next)}`;
}

function skipSentence(event: SkipEvent): string {
  const { from, to, weight = 0, reason, value, current } = event;
  if (reason === "settled") return `${arrow(from, to)}: ${nid(to)}'s distance is already final, so skip it`;
  const offer = value === undefined ? "going this way" : sum(value - weight, weight, value);
  return `${arrow(from, to)} costs ${num(weight)}: ${offer} is no better than ${num(current)}, so ${nid(to)} keeps ${num(current)}`;
}

function closestSentence(event: SettleEvent): string {
  const { node, value, ties = [], target, via } = event;
  if (target && via === undefined) return sameStartAndEnd(node);
  const choice = ties.length > 0
    ? `${names([node, ...ties])} tie for closest at ${num(value)}, so take ${nid(node)} and make its distance final`
    : `${nid(node)} is the closest node in the queue, at ${num(value)}, so its distance is final`;
  return target ? `${choice}; it is the destination, so the search stops` : choice;
}

const dijkstra: Voice = {
  event(event) {
    switch (event.type) {
      case "enqueue":
        if (event.group === 0) return startWithDistance(event.node, event.value);
        return `${nid(event.node)} joins the queue${event.value === undefined ? "" : ` at ${num(event.value)}`}`;
      case "relax": return relaxSentence(event);
      case "skip": return skipSentence(event);
      case "settle": return closestSentence(event);
      case "answer": return event.kind === "route" ? routeSentence(event, "The queue is empty") : "";
      default: return "";
    }
  },
};

/* ------------------------------------------------------------- Bellman-Ford */

const noShortestRoute = "so a negative cycle can lower distances forever and there is no shortest route";

function negativeCycleSentence(event: RouteAnswer): string {
  const { from, to, weight, value, current } = event.negativeCycle!;
  return `${arrow(from, to)} costs ${num(weight)}: ${sum(value - weight, weight, value)} still beats ${num(current)} after every round, ${noShortestRoute}`;
}

/**
 * Skipped checks, said briefly (a round checks every edge, so a step can hold many):
 * "A → B and B → C are no better", "B → D starts from unreached B". Parallel edges are named once:
 * "both A → B edges and B → C are no better". More than three of a kind are counted instead of
 * named: "14 edges are no better".
 */
function briefSkips(skips: readonly SkipEvent[]): string {
  const still = skips.some((e) => e.check) ? "still " : "";
  const parts: string[] = [];
  for (const reason of new Set(skips.map((e) => e.reason))) {
    const these = skips.filter((e) => e.reason === reason);
    // How many edges join each pair, so parallel edges are named once.
    const pairs = new Map<string, number>();
    for (const e of these) pairs.set(arrow(e.from, e.to), (pairs.get(arrow(e.from, e.to)) ?? 0) + 1);
    const edges = these.length > 3
      ? `${these.length} edges`
      : joinAnd([...pairs].map(([pair, count]) => (count === 1 ? pair : `${count === 2 ? "both" : `all ${count}`} ${pair} edges`)));
    const one = these.length === 1;
    const from = pairs.size === 1 ? `unreached ${nid(these[0].from)}` : "unreached nodes";
    parts.push(reason === "unreached"
      ? `${edges} ${one ? "starts" : "start"} from ${from}`
      : `${edges} ${one ? "is" : "are"} ${still}no better`);
  }
  return parts.join(", ");
}

/** Skipped edges parallel to the one that improves: "the other A → B edge is no better". */
function otherTwins(twins: readonly SkipEvent[]): string {
  if (twins.length === 0) return "";
  const still = twins.some((e) => e.check) ? "still " : "";
  const pair = arrow(twins[0].from, twins[0].to);
  return twins.length === 1
    ? `the other ${pair} edge is ${still}no better`
    : `the other ${twins.length === 2 ? "two" : twins.length} ${pair} edges are ${still}no better`;
}

const pairOf = ({ from, to }: { from: number; to: number }) => `${from}-${to}`;
const skipsIn = (events: readonly AlgorithmEvent[]) => events.filter((e): e is SkipEvent => e.type === "skip");

/**
 * Group 0 is the start, 1, 2, ... are the rounds, then the extra pass that looks for a negative cycle.
 * Each improvement is a step, labelled with its round; a round that improves nothing is one step.
 */
const bellmanFord: Voice = {
  event(event) {
    switch (event.type) {
      case "start": return startWithDistance(event.node, event.value);
      case "relax": return relaxSentence(event);
      case "answer":
        if (event.kind !== "route") return "";
        if (event.negativeCycle) return negativeCycleSentence(event);
        if (event.path?.length === 1) return `${nid(event.start)} is both the start and the destination, so the route is just ${nid(event.start)}, total distance 0`;
        return routeSentence(event, "Every round is done");
      default: return "";
    }
  },
  step(events) {
    const at = events.findIndex(changes);
    const change = events[at];
    if (!change) {
      const [first] = events;
      return first.type === "skip" && first.check
        ? "One more pass checks every edge again and nothing improves, so there is no negative cycle"
        : `Round ${first.group}: checking every edge improves nothing, so every distance is final and there is no negative cycle`;
    }
    // A pair is named once per step: edges parallel to the one that changes are "the other" ones,
    // said right after it, and a pair skipped on both sides of the change is said where it is first skipped.
    const improving = change.type === "relax" ? pairOf(change)
      : change.type === "answer" && change.kind === "route" && change.negativeCycle ? pairOf(change.negativeCycle) : null;
    const before = skipsIn(events.slice(0, at));
    const after = skipsIn(events.slice(at + 1));
    const early = new Set(before.map(pairOf));
    const twins = [...before, ...after].filter((e) => pairOf(e) === improving);
    const first = [...before, ...after.filter((e) => early.has(pairOf(e)))].filter((e) => pairOf(e) !== improving);
    const rest = after.filter((e) => !early.has(pairOf(e)) && pairOf(e) !== improving);
    const said = [briefSkips(first), bellmanFord.event(change), otherTwins(twins), briefSkips(rest)].filter(Boolean).join("; ");
    if (change.type === "relax") return `Round ${change.group}: ${said}`;
    if (change.type === "answer" && change.kind === "route" && change.negativeCycle) return `One more pass: ${said}`;
    return said;
  },
};

/* ------------------------------------------------- queue and stack searches */

interface Frontier {
  /** "queue" or "stack" */
  name: string;
  /** Where a node waiting in it is. */
  inside: string;
  /** Where the next node is taken from. */
  front: string;
  /** What the start does at the beginning. */
  begins: string;
  /** What happens to a newly found node. */
  joins: string;
  /** What happens to a node found again while it waits (depth first only). */
  moves?: string;
  /** Pathfinding: name each new node's parent. */
  parents: boolean;
}

const queue = (parents: boolean): Frontier => ({
  name: "queue",
  inside: "in the queue",
  front: "at the front of the queue",
  begins: "it joins the queue",
  joins: "it joins the queue",
  parents,
});

const stack = (parents: boolean): Frontier => ({
  name: "stack",
  inside: "on the stack",
  front: "on top of the stack",
  begins: "it goes on the stack",
  joins: "push it onto the stack",
  moves: "move it to the top of the stack",
  parents,
});

function frontierVoice(frontier: Frontier): Voice {
  const visitSentence = ({ node, target, via }: SettleEvent) => {
    if (target && via === undefined) return sameStartAndEnd(node);
    if (target) return `${nid(node)} is ${frontier.front} and it is the destination, so the search stops`;
    return `${nid(node)} is ${frontier.front}, so visit it`;
  };
  const foundSentence = ({ node, from, moved }: EnqueueEvent) => {
    if (from === undefined) return `Start at ${nid(node)}: ${frontier.begins}, and every other node is unvisited for now`;
    const parent = frontier.parents ? ` with ${nid(from)} as its parent` : "";
    if (moved) return `${arrow(from, node)}: ${nid(node)} is ${frontier.inside} but not visited yet, so ${frontier.moves}${parent}`;
    return `${arrow(from, node)}: ${nid(node)} is new, so ${frontier.joins}${parent}`;
  };
  return {
    event(event) {
      switch (event.type) {
        case "enqueue": return foundSentence(event);
        case "settle": return visitSentence(event);
        case "skip":
          return event.reason === "queued"
            ? `${arrow(event.from, event.to)}: ${nid(event.to)} is already ${frontier.inside}, so skip it`
            : `${arrow(event.from, event.to)}: ${nid(event.to)} is already visited, so skip it`;
        case "finish": return finishSentence(event);
        case "answer": {
          const ended = `The ${frontier.name} is empty`;
          if (event.kind === "route") return routeSentence(event, ended);
          if (event.kind !== "order") return "";
          const unreached = event.unreached.length > 0 ? `; ${names(event.unreached)} cannot be reached from ${nid(event.start)}` : "";
          return `${ended}, so every node reachable from ${nid(event.start)} is visited, in the order ${event.order.map(nid).join(", ")}${unreached}`;
        }
        default: return "";
      }
    },
  };
}

/* --------------------------------------------------------- cycle detection */

/** The edge to a node already seen. The edge into an unvisited node is said by that node's visit. */
function classifySentence({ from, to, kind }: ClassifyEvent): string {
  if (kind === "tree") return "";
  if (kind === "back") return `${arrow(from, to)} leads back to ${nid(to)}, which is still in progress, so there is a cycle`;
  return `${arrow(from, to)}: ${nid(to)} is already done, so skip it`;
}

const cycleDetection: Voice = {
  event(event) {
    switch (event.type) {
      case "start":
        return event.group === 0
          ? `Start at ${nid(event.node)}; every node is unvisited, and an edge back to a node still in progress means a cycle`
          : `Every node reached so far is done; ${nid(event.node)} is still unvisited, so start again from ${nid(event.node)}`;
      case "settle":
        return event.via === undefined
          ? `Visit ${nid(event.node)}, which is now in progress`
          : `${arrow(event.via, event.node)} leads to unvisited ${nid(event.node)}, so visit it; it is now in progress`;
      case "classify": return classifySentence(event);
      case "skip": return `${arrow(event.from, event.to)}: this is the edge ${nid(event.from)} came in on, so skip it`;
      case "finish": return finishSentence(event);
      case "answer":
        if (event.kind !== "cycle") return "";
        return event.cycle
          ? `Follow the edges round to read the cycle: ${route([...event.cycle, event.cycle[0]])}`
          : "Every node is done and no edge led back to a node in progress, so the graph has no cycle";
      default: return "";
    }
  },
};

/* ------------------------------------------------------------------ Prim's */

function cheapestSentence({ node, value, ties = [], via }: SettleEvent): string {
  if (via === undefined) return `${nid(node)} is the cheapest node in the queue, at ${num(value)}, so it joins the tree first`;
  const joins = `it joins the tree through ${nid(via)}`;
  return ties.length > 0
    ? `${names([node, ...ties])} tie for cheapest at ${num(value)}, so take ${nid(node)}; ${joins}`
    : `${nid(node)} is the cheapest node in the queue, at ${num(value)}, so ${joins}`;
}

const prims: Voice = {
  event(event) {
    switch (event.type) {
      case "enqueue":
        return `Start the tree at ${nid(event.node)}, at cost ${num(event.value)}; every other node is unreached (∞) for now`;
      case "settle": return cheapestSentence(event);
      case "relax": {
        const { from, to, weight, old, next } = event;
        const check = `${arrow(from, to)} costs ${num(weight)}, which beats ${num(old)}`;
        return old === Infinity ? `${check}, so ${nid(to)} joins the queue at ${num(next)}` : `${check}, so ${nid(to)}'s cost drops to ${num(next)}`;
      }
      case "skip":
        return event.reason === "settled"
          ? `${arrow(event.from, event.to)}: ${nid(event.to)} is already in the tree, so skip it`
          : `${arrow(event.from, event.to)} costs ${num(event.weight)}, which does not beat ${num(event.current)}, so ${nid(event.to)} keeps ${num(event.current)}`;
      case "answer": {
        if (event.kind !== "tree") return "";
        const unreached = event.unreached.length > 0
          ? `; ${names(event.unreached)} cannot be reached from ${nid(event.start)}, so the tree leaves ${event.unreached.length === 1 ? "it" : "them"} out`
          : "";
        if (event.edges.length === 0) return `The queue is empty, so the tree is just ${nid(event.start)}, total weight 0${unreached}`;
        const edges = event.edges.map(({ from, to }) => `${nid(from)} – ${nid(to)}`);
        return `The queue is empty, so the tree is done: ${joinAnd(edges)}, total weight ${num(event.total)}${unreached}`;
      }
      default: return "";
    }
  },
};

/** Each algorithm's voice, by adapter id. */
const voices: Record<string, Voice> = {
  dijkstra,
  "bellman-ford": bellmanFord,
  bfs: frontierVoice(queue(false)),
  "bfs-pathfinding": frontierVoice(queue(true)),
  dfs: frontierVoice(stack(false)),
  "dfs-pathfinding": frontierVoice(stack(true)),
  "cycle-detection": cycleDetection,
  prims,
};

/** The pair an event's sentence starts with, for edges it names. */
function namedPair(event: AlgorithmEvent): string | null {
  if (event.type === "skip" || event.type === "relax" || event.type === "classify") return arrow(event.from, event.to);
  if (event.type === "enqueue" && event.from !== undefined) return arrow(event.from, event.node);
  return null;
}

/**
 * A step's events said in order, joined with semicolons. Parallel edges are not named as if they
 * were one edge: the same check repeated is said once for all of them ("both B → A edges: A is
 * already in the tree, so skip them"), and a later sentence about the same pair names "another"
 * edge (a step need not hold every edge of the pair, so it is never "the other").
 */
function sayEvents(voice: Voice, step: readonly AlgorithmEvent[]): string {
  const said: Array<{ pair: string | null; text: string; count: number }> = [];
  for (const event of step) {
    const text = voice.event(event);
    if (!text) continue;
    const pair = namedPair(event);
    const same = pair === null ? undefined : said.find((s) => s.pair === pair && s.text === text);
    if (same) same.count += 1;
    else said.push({ pair, text, count: 1 });
  }
  return said.map(({ pair, text, count }, i) => {
    if (pair === null) return text;
    if (count > 1) return text.replace(pair, `${count === 2 ? "both" : `all ${count}`} ${pair} edges`).replace(/skip it\b/, "skip them");
    return said.findIndex((s) => s.pair === pair) === i ? text : text.replace(pair, `another ${pair} edge`);
  }).join("; ");
}

/** One message per step of the run (see `stepEnds`), in the voice of the algorithm with this id. */
export function narrate(events: readonly AlgorithmEvent[], algorithm: string): string[] {
  const voice = voices[algorithm];
  if (!voice) throw new Error(`No narration for algorithm "${algorithm}"`);
  let start = 0;
  return stepEnds(events).map((end) => {
    const step = events.slice(start, end);
    start = end;
    return voice.step?.(step) ?? sayEvents(voice, step);
  });
}
