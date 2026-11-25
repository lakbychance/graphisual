/**
 * What the app shows for one step of a run, read from the engine's frames.
 *
 * A run is an algorithm's events, cut into steps of one change each (`stepEnds`). For the step on
 * screen, `highlightsAt` says which nodes and edges the canvas lights, and `traceAt` gives the
 * trace panel its message and data structure.
 */
import { nid, signed } from "../../algorithms/traceHelpers";
import {
  changes, frameAt, stepEnds, type AlgorithmEvent, type AnswerEvent, type Frame, type QueueItem,
} from "../../algorithms/engine";
import type { DataStructureState, StepTrace } from "../../algorithms/types";
import { EDGE_TYPE } from "../../constants/graph";
import type { EdgeVisualizationFlags, GraphEdge, NodeVisualizationFlags, VisualizationTrace } from "../../components/Graph/types";

export interface Run {
  algorithmId: string;
  events: AlgorithmEvent[];
  /** For each step, how many events have been applied once it is shown. */
  ends: number[];
  /** The order the algorithm scans nodes in, which breaks ties in a priority queue. */
  nodeOrder: number[];
}

export const emptyRun: Run = { algorithmId: "", events: [], ends: [], nodeOrder: [] };

export const createRun = (algorithmId: string, events: AlgorithmEvent[], nodeOrder: number[]): Run =>
  ({ algorithmId, events, ends: stepEnds(events), nodeOrder });

export const emptyTrace = (): VisualizationTrace => ({ nodes: new Map(), edges: new Map() });

/** The frame once step `index` is shown (before the first step for -1). */
const frameOf = (run: Run, index: number): Frame => frameAt(run.events, index < 0 ? 0 : run.ends[index]);

/** The events that make up step `index`. */
const eventsOf = (run: Run, index: number) => run.events.slice(index > 0 ? run.ends[index - 1] : 0, run.ends[index]);

/** An edge walked from -> to. */
export interface Walk {
  from: number;
  to: number;
}

/** What a step has walked so far, and the answer it shows (see `walkedAt`). */
export interface Walked {
  /** Nodes lit as visited. */
  visited: number[];
  /** Edges lit as walked, in the direction they were walked. */
  walks: Walk[];
  /** The walked edges that lead back to a node in progress (a cycle), drawn so they stand out. */
  back: Walk[];
  /** The answer's nodes and edges, when the step shows a route or a cycle. */
  answer: { kind: "route" | "cycle"; nodes: number[]; walks: Walk[] } | null;
}

/**
 * What is walked once step `index` is shown. Nodes made final are visited, through the edge they
 * were reached by; a run that never makes nodes final (Bellman-Ford) shows the nodes it has reached,
 * through their best edges. An edge back to a node in progress is walked too. The answer is the
 * route, or the cycle walked round back to its first node. The app's canvas and the landing pages
 * both draw from this.
 */
export function walkedAt(run: Run, index: number): Walked {
  if (index < 0) return { visited: [], walks: [], back: [], answer: null };
  const frame = frameOf(run, index);
  const settles = run.events.some((e) => e.type === "settle");
  const visited = settles ? [...frame.settled] : [...frame.dist.keys()];
  const walks: Walk[] = [...(settles ? frame.via : frame.prev)].map(([to, from]) => ({ from, to }));
  const back: Walk[] = [];
  for (const [key, kind] of frame.edgeClass) {
    if (kind !== "back") continue;
    const [from, to] = key.split("-").map(Number);
    back.push({ from, to });
    walks.push({ from, to });
  }

  const { answer } = frame;
  let shown: Walked["answer"] = null;
  if (answer?.kind === "route" && answer.path) {
    const { path } = answer;
    shown = { kind: "route", nodes: path, walks: path.slice(1).map((to, i) => ({ from: path[i], to })) };
  } else if (answer?.kind === "cycle" && answer.cycle) {
    const { cycle } = answer;
    shown = { kind: "cycle", nodes: cycle, walks: cycle.map((from, i) => ({ from, to: cycle[(i + 1) % cycle.length] })) };
  }
  return { visited, walks, back, answer: shown };
}

/**
 * The canvas highlights once step `index` is shown, from `walkedAt`. Undirected edges light both ways.
 * An edge back to a node in progress lights in the cycle colour as soon as it is found.
 */
export function highlightsAt(run: Run, index: number, edges: Map<number, GraphEdge[]>): VisualizationTrace {
  const trace = emptyTrace();
  const markNode = (id: number, flags: NodeVisualizationFlags) => trace.nodes.set(id, { ...trace.nodes.get(id), ...flags });
  const markEdge = ({ from, to }: Walk, flags: EdgeVisualizationFlags) => {
    const mark = (a: number, b: number) => trace.edges.set(`${a}-${b}`, { ...trace.edges.get(`${a}-${b}`), ...flags });
    mark(from, to);
    if (edges.get(from)?.some((e) => e.to === to && e.type === EDGE_TYPE.UNDIRECTED)) mark(to, from);
  };

  const { visited, walks, back, answer } = walkedAt(run, index);
  for (const id of visited) markNode(id, { isVisited: true });
  for (const walk of walks) markEdge(walk, { isUsedInTraversal: true });
  for (const walk of back) markEdge(walk, { isUsedInCycle: true });
  if (answer?.kind === "route") {
    for (const id of answer.nodes) markNode(id, { isInShortestPath: true });
    for (const walk of answer.walks) markEdge(walk, { isUsedInShortestPath: true });
  } else if (answer?.kind === "cycle") {
    for (const id of answer.nodes) markNode(id, { isInCycle: true });
    for (const walk of answer.walks) markEdge(walk, { isUsedInCycle: true });
  }
  return trace;
}

/**
 * The pseudocode line step `index` lights: the line of the change it makes, or of its last event
 * when it changes nothing (a Bellman-Ford round that ends the rounds).
 */
export function lineAt(run: Run, index: number): number | null {
  if (index < 0 || index >= run.ends.length) return null;
  const step = eventsOf(run, index);
  return (step.find(changes) ?? step[step.length - 1])?.line ?? null;
}

/* ------------------------------------------------------------- trace panel */

const names = (ids: number[]) => ids.map(nid).join(", ");

/** The message for a run's first step, before anything is visited. */
const startMessage = (node: number) => `**Nothing has been visited yet.** The run starts at ${nid(node)}`;

function answerMessage(answer: AnswerEvent): string {
  const unreached = (start: number, ids: number[]) => (ids.length > 0 ? `\nNot reachable from ${nid(start)}: **${names(ids)}**` : "");
  switch (answer.kind) {
    case "route": {
      const path = answer.path ?? [];
      const edges = path.length - 1;
      const size = answer.cost === undefined
        ? `Length: **${edges}** ${edges === 1 ? "edge" : "edges"}`
        : `Total distance: **${signed(answer.cost)}**`;
      return `**Path found:** ${path.map(nid).join(" → ")}\n${size}`;
    }
    case "order":
      return `**Visit order:** ${names(answer.order)}${unreached(answer.start, answer.unreached)}`;
    case "tree": {
      const edges = answer.edges.map(({ from, to }) => `${nid(from)}–${nid(to)}`).join(", ");
      const tree = edges ? `**Spanning tree:** ${edges}` : `**Spanning tree:** just ${nid(answer.start)}`;
      return `${tree}\nTotal weight: **${answer.total}**${unreached(answer.start, answer.unreached)}`;
    }
    case "cycle":
      return answer.cycle ? `**Cycle found:** ${[...answer.cycle, answer.cycle[0]].map(nid).join(" → ")}` : "**No cycle found**";
  }
}

/** Priority-queue items, cheapest first; ties in the order the algorithm scans nodes. */
function byValue(items: readonly QueueItem[], nodeOrder: number[]) {
  const rank = (id: number) => {
    const i = nodeOrder.indexOf(id);
    return i < 0 ? Infinity : i;
  };
  return items
    .map((item) => ({ id: item.id, value: item.value as number }))
    .sort((a, b) => a.value - b.value || rank(a.id) - rank(b.id));
}

/** The trace for a step, from the change it makes (absent when it changes nothing) and its frame. */
type StepView = (change: AlgorithmEvent | undefined, step: readonly AlgorithmEvent[], frame: Frame, run: Run) => StepTrace;

/** The node being worked on, with its value. */
const working = (frame: Frame) =>
  frame.current === null ? undefined : { id: frame.current, value: frame.dist.get(frame.current) ?? 0 };

/** Dijkstra's and Prim's: a priority queue of nodes by distance or cost. */
const priority = (tree: boolean): StepView => (change, _step, frame, run) => {
  const items = byValue(frame.queue, run.nodeOrder);
  if (change?.type === "relax") {
    return {
      message: `**Updated node ${nid(change.to)}** via ${nid(change.from)} (${tree ? "cost" : "distance"}: ${change.next})`,
      dataStructure: { type: "priority-queue", items, processing: working(frame), justAdded: [change.to] },
    };
  }
  if (change?.type !== "settle") {
    return { message: startMessage(change?.type === "enqueue" ? change.node : -1), dataStructure: { type: "priority-queue", items } };
  }
  const { node, via, target } = change;
  const value = via === undefined ? 0 : (change.value as number);
  const processing = { id: node, value };
  if (target && via === undefined) {
    return { message: `**Start and destination are the same** (node ${nid(node)})`, dataStructure: { type: "priority-queue", items: [], processing } };
  }
  if (target) return { message: `**Found destination node ${nid(node)}!**`, dataStructure: { type: "priority-queue", items, processing } };

  let message = via === undefined
    ? `**Starting at node ${nid(node)}**`
    : tree ? `**Adding edge ${nid(via)}→${nid(node)}** (weight: ${value})` : `**Visiting node ${nid(node)}**`;
  if (tree) {
    const total = frame.settled.reduce((sum, id) => sum + (frame.dist.get(id) ?? 0), 0);
    message += `\nMST: **${frame.settled.length}** nodes, total weight: **${total}**`;
  }
  return { message, dataStructure: { type: "priority-queue", items, processing } };
};

/** BFS, DFS and their pathfinding versions: a queue or a stack. */
const frontier = (kind: "queue" | "stack"): StepView => (change, _step, frame) => {
  const items = frame.queue.map((item) => ({ id: item.id }));
  const processing = frame.current === null ? undefined : { id: frame.current };
  if (change?.type === "enqueue" && change.from !== undefined) {
    const message = kind === "queue" ? `**Added node ${nid(change.node)}** to queue`
      : change.moved ? `**Moved node ${nid(change.node)}** to top of stack`
      : `**Pushed node ${nid(change.node)}** to stack`;
    return { message, dataStructure: { type: kind, items, processing, justAdded: [change.node] } };
  }
  if (change?.type === "finish") {
    const back = change.parent === undefined ? "" : `, back to node ${nid(change.parent)}`;
    return { message: `**Backtracking from node ${nid(change.node)}**${back}`, dataStructure: { type: kind, items, processing } };
  }
  if (change?.type !== "settle") {
    return { message: startMessage(change?.type === "enqueue" ? change.node : -1), dataStructure: { type: kind, items } };
  }
  const { node, via, target } = change;
  if (target && via === undefined) {
    return { message: `**Start and destination are the same** (node ${nid(node)})`, dataStructure: { type: kind, items: [], processing: { id: node } } };
  }
  if (target) return { message: `**Found destination node ${nid(node)}!**`, dataStructure: { type: kind, items, processing: { id: node } } };
  return { message: `**Visiting node ${nid(node)}**`, dataStructure: { type: kind, items, processing: { id: node } } };
};

/** Cycle detection: the call stack is the branch in progress (visited, not yet done), oldest first. */
const cycleDetection: StepView = (change, _step, frame) => {
  const branch = frame.settled.filter((id) => !frame.finished.includes(id));
  const ds = (processing: number | null, justAdded?: number[]): DataStructureState => ({
    type: "recursion-stack",
    items: branch.map((id) => ({ id })),
    processing: processing === null ? undefined : { id: processing },
    justAdded,
  });

  switch (change?.type) {
    case "settle":
      return { message: `**Exploring node ${nid(change.node)}**. Recursion depth: ${branch.length}`, dataStructure: ds(change.node, [change.node]) };
    case "finish":
      return { message: `**Backtracking from node ${nid(change.node)}**. Recursion depth: ${branch.length}`, dataStructure: ds(frame.current) };
    case "classify":
      return {
        message: `**Cycle detected!** Back edge **${nid(change.from)}→${nid(change.to)}** found\nNode **${nid(change.to)}** is in recursion stack`,
        dataStructure: ds(change.to),
      };
    default: {
      const node = change?.type === "start" ? change.node : -1;
      const message = change?.group === 0 ? startMessage(node) : `**Starting again at node ${nid(node)}**`;
      return { message, dataStructure: ds(null) };
    }
  }
};

/** Bellman-Ford: rounds over every edge, with the distances known so far. */
const bellmanFord: StepView = (change, step, frame, run) => {
  // Listed by node, so the list reads the same whatever order the graph keeps its nodes in.
  const reached = [...frame.dist].sort(([a], [b]) => a - b).map(([id, value]) => ({ id, value }));
  if (change?.type === "start") {
    const answer = run.events.find((e) => e.type === "answer");
    if (answer?.type === "answer" && answer.kind === "route" && answer.target === change.node) {
      return {
        message: `**Start and destination are the same** (node ${nid(change.node)})`,
        dataStructure: { type: "distances", items: [{ id: change.node, value: 0 }] },
      };
    }
    return {
      message: `**Starting at node ${nid(change.node)}** (distance: 0)\n**1** node reachable`,
      dataStructure: { type: "distances", items: [], processing: { id: change.node, value: 0 } },
    };
  }
  const [first] = step;
  if (change?.type !== "relax") {
    const message = first.type === "skip" && first.check
      ? "**Checked every edge once more:** nothing improved, so there is no negative cycle"
      : `Round ${first.group}: **No distance changed**, so every distance is final`;
    return { message, dataStructure: { type: "distances", items: reached } };
  }
  return {
    message: `Round ${change.group}: **Relaxed ${nid(change.from)}→${nid(change.to)}** (distance: ${signed(change.next)})\n**${reached.length}** nodes reachable`,
    dataStructure: { type: "distances", items: reached, justAdded: [change.to] },
  };
};

const views: Record<string, StepView> = {
  dijkstra: priority(false),
  prims: priority(true),
  bfs: frontier("queue"),
  "bfs-pathfinding": frontier("queue"),
  dfs: frontier("stack"),
  "dfs-pathfinding": frontier("stack"),
  "cycle-detection": cycleDetection,
  "bellman-ford": bellmanFord,
};

/** The trace panel's content for step `index` of the run. */
export function traceAt(run: Run, index: number): StepTrace | undefined {
  const view = views[run.algorithmId];
  if (!view || index < 0 || index >= run.ends.length) return undefined;
  const step = eventsOf(run, index);
  const change = step.find(changes);
  if (change?.type === "answer") return { message: answerMessage(change) };
  return view(change, step, frameOf(run, index), run);
}
