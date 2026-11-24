/**
 * Narration: the words for each step, built from event templates.
 *
 * One voice throughout: present tense, plain words, one sentence per step and no full stops
 * (the app's convention for hints). Node ids are marked with `nid` so the trace panel and
 * the landing pages can show each node's label.
 *
 * Each algorithm has a voice: the words for one event (the Every edge level) and for one
 * iteration (the Overview level). Voices share their sentences wherever the algorithms agree.
 */
import { nid } from "../traceHelpers";
import type {
  AlgorithmEvent, ClassifyEvent, EnqueueEvent, FinishEvent, RelaxEvent, RouteAnswer, SettleEvent, SkipEvent,
} from "./events";
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
const arrow = (from: number, to: number) => `${nid(from)} → ${nid(to)}`;
const names = (ids: number[]) => joinAnd(ids.map(nid));

interface Voice {
  /** The sentence for one event (the Every edge level). `opens` is set when the event begins an iteration. */
  event: (event: AlgorithmEvent, opens?: boolean) => string;
  /** The sentence for one iteration (the Overview level). */
  group: (events: readonly AlgorithmEvent[]) => string;
}

/** Nodes whose value improved in an iteration, each named once at its last value. */
function improvements(events: readonly AlgorithmEvent[]): string[] {
  const improved = new Map<number, number>();
  for (const e of events) if (e.type === "relax") improved.set(e.to, e.next);
  return [...improved].map(([id, value]) => `${nid(id)} to ${num(value)}`);
}

/* ---------------------------------------------------------- shared sentences */

const startWithDistance = (node: number, value: number | undefined) =>
  `Start at ${nid(node)} with distance ${num(value)}; every other node is unreached (∞) for now`;

const sameStartAndEnd = (node: number) => `${nid(node)} is both the start and the destination, so the search stops right away`;

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
  const { from, to, weight = 0, reason, value, current, check } = event;
  if (reason === "settled") return `${arrow(from, to)}: ${nid(to)}'s distance is already final, so skip it`;
  if (reason === "unreached") return `${arrow(from, to)}: ${nid(from)} is still unreached (∞), so it has nothing to offer`;
  const offer = value === undefined ? "going this way" : sum(value - weight, weight, value);
  if (check) return `${arrow(from, to)} costs ${num(weight)}: ${offer} is still no better than ${num(current)}`;
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
  group(events) {
    const [first] = events;
    if (first?.type !== "settle" || events.length === 1) return events.map((e) => dijkstra.event(e)).join("; ");
    const improved = improvements(events);
    const checks = improved.length > 0 ? `checking its edges improves ${joinAnd(improved)}` : "checking its edges improves nothing";
    return `${closestSentence(first)}; ${checks}`;
  },
};

/* ------------------------------------------------------------- Bellman-Ford */

const noShortestRoute = "so a negative cycle can lower distances forever and there is no shortest route";

function negativeCycleSentence(event: RouteAnswer): string {
  const { from, to, weight, value, current } = event.negativeCycle!;
  return `${arrow(from, to)} costs ${num(weight)}: ${sum(value - weight, weight, value)} still beats ${num(current)} after every round, ${noShortestRoute}`;
}

/** Groups: 0 is the start, 1, 2, ... are the rounds, then the extra pass that looks for a negative cycle. */
const bellmanFord: Voice = {
  event(event, opens) {
    const check = event.type === "skip" ? event.check : event.type === "answer" && event.kind === "route" && event.negativeCycle !== undefined;
    const lead = !opens ? "" : check ? "One more pass begins, to look for a negative cycle; " : `Round ${event.group} begins; `;
    switch (event.type) {
      case "start": return startWithDistance(event.node, event.value);
      case "relax": return lead + relaxSentence(event);
      case "skip": return lead + skipSentence(event);
      case "answer":
        if (event.kind !== "route") return "";
        if (event.negativeCycle) return lead + negativeCycleSentence(event);
        if (event.path?.length === 1) return `${nid(event.start)} is both the start and the destination, so the route is just ${nid(event.start)}, total distance 0`;
        return routeSentence(event, "Every round is done");
      default: return "";
    }
  },
  group(events) {
    const [first] = events;
    const last = events[events.length - 1];
    const cycle = last.type === "answer" && last.kind === "route" ? last.negativeCycle : undefined;
    if (cycle) return `One more pass finds that ${arrow(cycle.from, cycle.to)} still improves ${nid(cycle.to)}, to ${num(cycle.value)}, ${noShortestRoute}`;
    if (first.type === "start" || first.type === "answer") return bellmanFord.event(first);
    if (first.type === "skip" && first.check) return "One more pass checks every edge again and nothing improves, so there is no negative cycle";
    const improved = improvements(events);
    return improved.length > 0
      ? `Round ${first.group} checks every edge and improves ${joinAnd(improved)}`
      : `Round ${first.group} checks every edge and improves nothing, so every distance is final and there is no negative cycle`;
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
  /** Several newly found nodes, in the order they were added. */
  joined: (nodes: number[]) => string;
  /** Pathfinding: name each new node's parent. */
  parents: boolean;
}

const queue = (parents: boolean): Frontier => ({
  name: "queue",
  inside: "in the queue",
  front: "at the front of the queue",
  begins: "it joins the queue",
  joins: "it joins the queue",
  joined: (nodes) =>
    nodes.length === 0 ? "nothing new joins the queue" : `${names(nodes)} ${nodes.length === 1 ? "joins" : "join"} the queue`,
  parents,
});

const stack = (parents: boolean): Frontier => ({
  name: "stack",
  inside: "on the stack",
  front: "on top of the stack",
  begins: "it goes on the stack",
  joins: "push it onto the stack",
  joined: (nodes) =>
    nodes.length === 0 ? "nothing new goes on the stack"
    : nodes.length === 1 ? `${nid(nodes[0])} goes on the stack`
    : `${names(nodes)} go on the stack, with ${nid(nodes[nodes.length - 1])} on top`,
  parents,
});

function frontierVoice(frontier: Frontier): Voice {
  const visitSentence = ({ node, target, via }: SettleEvent) => {
    if (target && via === undefined) return sameStartAndEnd(node);
    if (target) return `${nid(node)} is ${frontier.front} and it is the destination, so the search stops`;
    return `${nid(node)} is ${frontier.front}, so visit it`;
  };
  const foundSentence = ({ node, from }: EnqueueEvent) => {
    if (from === undefined) return `Start at ${nid(node)}: ${frontier.begins}, and every other node is unvisited for now`;
    const parent = frontier.parents ? ` with ${nid(from)} as its parent` : "";
    return `${arrow(from, node)}: ${nid(node)} is new, so ${frontier.joins}${parent}`;
  };
  const voice: Voice = {
    event(event) {
      switch (event.type) {
        case "enqueue": return foundSentence(event);
        case "settle": return visitSentence(event);
        case "skip":
          return event.reason === "queued"
            ? `${arrow(event.from, event.to)}: ${nid(event.to)} is already ${frontier.inside}, so skip it`
            : `${arrow(event.from, event.to)}: ${nid(event.to)} is already visited, so skip it`;
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
    group(events) {
      const [first] = events;
      if (first.type !== "settle" || first.target) return events.map((e) => voice.event(e)).join("; ");
      const added = events.flatMap((e) => (e.type === "enqueue" ? [e.node] : []));
      return `${visitSentence(first)}; ${frontier.joined(added)}`;
    },
  };
  return voice;
}

/* --------------------------------------------------------- cycle detection */

function classifySentence({ from, to, kind }: ClassifyEvent): string {
  if (kind === "tree") return `${arrow(from, to)}: ${nid(to)} is unvisited, so go there next`;
  if (kind === "back") return `${arrow(from, to)}: ${nid(to)} is still in progress, so this edge closes a cycle`;
  return `${arrow(from, to)}: ${nid(to)} is already done, so skip it`;
}

const finishSentence = ({ node, parent }: FinishEvent) =>
  `${nid(node)} has no edges left to follow, so it is done${parent === undefined ? "" : `; go back to ${nid(parent)}`}`;

/** An edge check, said briefly for the Overview (the edge it came in on goes unsaid). */
function briefCheck(event: AlgorithmEvent): string | null {
  if (event.type !== "classify") return null;
  const { from, to, kind } = event;
  if (kind === "tree") return `${arrow(from, to)} leads to unvisited ${nid(to)}`;
  if (kind === "back") return `${arrow(from, to)} leads back to ${nid(to)}, which is still in progress, so there is a cycle`;
  return `${arrow(from, to)} leads to ${nid(to)}, which is done`;
}

const cycleDetection: Voice = {
  event(event) {
    switch (event.type) {
      case "start":
        return event.group === 0
          ? `Start at ${nid(event.node)}; every node is unvisited, and an edge back to a node still in progress means a cycle`
          : `Every node reached so far is done; ${nid(event.node)} is still unvisited, so start again from ${nid(event.node)}`;
      case "settle": return `Visit ${nid(event.node)}, which is now in progress`;
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
  group(events) {
    const [first, ...rest] = events;
    const lead = cycleDetection.event(first);
    const checks = rest.map(briefCheck).filter((s): s is string => s !== null);
    return checks.length > 0 ? `${lead}; ${joinAnd(checks)}` : lead;
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
  group(events) {
    const [first] = events;
    if (first.type !== "settle") return events.map((e) => prims.event(e)).join("; ");
    const improved = improvements(events);
    return `${cheapestSentence(first)}; checking its edges lowers ${improved.length > 0 ? joinAnd(improved) : "nothing"}`;
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

/** One message per step of the run at the given detail level, in the voice of the algorithm with this id. */
export function narrate(events: readonly AlgorithmEvent[], detail: Detail, algorithm: string): string[] {
  const voice = voices[algorithm];
  if (!voice) throw new Error(`No narration for algorithm "${algorithm}"`);
  let start = 0;
  return stepEnds(events, detail).map((end) => {
    const step = events.slice(start, end);
    start = end;
    return detail === "overview" ? voice.group(step) : voice.event(step[0], step[0].group !== events[end - 2]?.group);
  });
}
