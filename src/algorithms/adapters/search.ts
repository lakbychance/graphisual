/**
 * The search shared by BFS, DFS and their pathfinding versions: take a node from the frontier,
 * visit it, and add its neighbours. A queue gives breadth first, a stack depth first.
 *
 * Breadth first marks a node seen when it joins the queue, so each joins at most once.
 * Depth first is the textbook search: a node is visited when it is taken off the stack, and a
 * neighbour still waiting on the stack is pushed again by the deeper node, which moves it to the
 * top with that node as its parent. The stack pushes a node's neighbours last-first, so the first
 * neighbour ends up on top. A node is done (it finishes) once nothing it pushed is still waiting.
 *
 * Depth first also keeps the textbook clock (one tick per visit and per finish) and classifies the
 * edges it meets: an edge to a visited node is a back edge when that node is still in progress, a
 * cross edge when it is done; an edge pushed along whose node a deeper node took over is a forward
 * edge once that node is visited.
 */
import type { AlgorithmEvent } from "../engine";
import type { AlgorithmInput } from "../types";
import { EDGE_TYPE } from "../../constants/graph";

export type FrontierKind = "queue" | "stack";

/** Pseudocode line of each kind of event. `stop` and `walk` only for pathfinding, `finish` only for depth first. */
export interface SearchLines {
  start: number;
  loop: number;
  take: number;
  check: number;
  add: number;
  stop?: number;
  walk?: number;
  finish?: number;
}

/**
 * Everything the search does on this input, as events. With a `target` it stops when the target
 * is taken from the frontier and answers with the route; without one it visits everything reachable.
 */
export function searchEvents(input: AlgorithmInput, kind: FrontierKind, lines: SearchLines, target?: number): AlgorithmEvent[] {
  const { adjacencyList, nodes, startNodeId: start } = input;
  const seen = new Set([start]);
  const visited: number[] = [];
  const parent = new Map<number, number>();
  const frontier = [start];
  // Depth first: the nodes in progress, deepest last, and how many entries each has waiting on the stack.
  const branch: number[] = [];
  const waiting = new Map<number, number>();
  // Depth first: the clock, and for each waiting node the nodes that pushed it along a directed edge.
  let clock = 0;
  const tick = () => (kind === "stack" ? { time: ++clock } : {});
  const pushedBy = new Map<number, Set<number>>();
  const count = (node: number | undefined, by: number) => {
    if (node !== undefined) waiting.set(node, (waiting.get(node) ?? 0) + by);
  };
  let group = 0;
  const events: AlgorithmEvent[] = [{ type: "enqueue", node: start, line: lines.start, group }];

  for (;;) {
    group += 1;
    const node = kind === "queue" ? frontier.shift() : frontier.pop();
    if (node === undefined) {
      if (target === undefined) {
        const unreached = nodes.map((n) => n.id).filter((id) => !visited.includes(id));
        events.push({ type: "answer", kind: "order", start, order: visited, unreached, line: lines.loop, group });
      } else {
        events.push({ type: "answer", kind: "route", start, target, path: null, line: lines.loop, group });
      }
      return events;
    }

    visited.push(node);
    count(parent.get(node), -1);
    // Edges other nodes pushed this one along, before a deeper node took it over, lead down the branch.
    for (const from of pushedBy.get(node) ?? []) {
      if (from !== parent.get(node)) events.push({ type: "classify", from, to: node, kind: "forward", line: lines.take, group });
    }
    if (node === target) {
      events.push({ type: "settle", node, via: parent.get(node), target: true, line: lines.stop ?? lines.take, group, ...tick() });
      const path = [node];
      for (let at = parent.get(node); at !== undefined; at = parent.get(at)) path.unshift(at);
      events.push({ type: "answer", kind: "route", start, target, path, line: lines.walk ?? lines.loop, group: group + 1 });
      return events;
    }
    events.push({ type: "settle", node, via: parent.get(node), line: lines.take, group, ...tick() });

    const edges = adjacencyList.get(node) ?? [];
    if (kind === "queue") {
      for (const { to } of edges) {
        if (seen.has(to)) {
          events.push({ type: "skip", from: node, to, reason: visited.includes(to) ? "visited" : "queued", line: lines.check, group });
          continue;
        }
        seen.add(to);
        parent.set(to, node);
        frontier.push(to);
        events.push({ type: "enqueue", node: to, from: node, line: lines.add, group });
      }
      continue;
    }

    branch.push(node);
    for (const { to, type } of [...edges].reverse()) {
      if (visited.includes(to)) {
        // The undirected edge up to the parent is the tree edge itself: a plain skip.
        if (type === EDGE_TYPE.UNDIRECTED && to === parent.get(node)) {
          events.push({ type: "skip", from: node, to, reason: "visited", line: lines.check, group });
        } else {
          events.push({ type: "classify", from: node, to, kind: branch.includes(to) ? "back" : "cross", line: lines.check, group });
        }
        continue;
      }
      const waitingAt = frontier.indexOf(to);
      if (type === EDGE_TYPE.DIRECTED) pushedBy.set(to, (pushedBy.get(to) ?? new Set()).add(node));
      // A second edge to the node this one just pushed: it is already on top, with this parent.
      if (waitingAt === frontier.length - 1 && parent.get(to) === node) {
        events.push({ type: "skip", from: node, to, reason: "queued", line: lines.check, group });
        continue;
      }
      if (waitingAt >= 0) {
        frontier.splice(waitingAt, 1);
        count(parent.get(to), -1);
      }
      parent.set(to, node);
      count(node, 1);
      frontier.push(to);
      events.push({ type: "enqueue", node: to, from: node, line: lines.add, group, ...(waitingAt >= 0 && { moved: true }) });
    }
    // Finish every node on the branch, deepest first, that has nothing left waiting.
    while (branch.length > 0 && !waiting.get(branch[branch.length - 1])) {
      const done = branch.pop() as number;
      events.push({ type: "finish", node: done, parent: branch[branch.length - 1], line: lines.finish ?? lines.loop, group, time: ++clock });
    }
  }
}
