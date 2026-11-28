/**
 * Oracles: deliberately simple reference answers to check algorithms against.
 */
import type { AlgorithmInput } from "../../types";

/**
 * Shortest distance from the start to every reachable node, by trying every simple path.
 * Slow and obviously right; fine for the suite's graphs of at most 8 nodes.
 */
export function bruteForceDistances({ adjacencyList, startNodeId }: AlgorithmInput): Map<number, number> {
  const best = new Map<number, number>();
  const onPath = new Set<number>();
  const walk = (node: number, cost: number) => {
    if (cost < (best.get(node) ?? Infinity)) best.set(node, cost);
    onPath.add(node);
    for (const edge of adjacencyList.get(node) ?? []) {
      if (!onPath.has(edge.to)) walk(edge.to, cost + edge.weight);
    }
    onPath.delete(node);
  };
  walk(startNodeId, 0);
  return best;
}

/** Every node reachable from `from` along the edges. */
export function reachable({ adjacencyList }: AlgorithmInput, from: number): Set<number> {
  const found = new Set([from]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const node of [...found]) {
      for (const edge of adjacencyList.get(node) ?? []) {
        if (!found.has(edge.to)) { found.add(edge.to); grew = true; }
      }
    }
  }
  return found;
}

/** The fewest edges from the start to every reachable node, by relaxing every edge until nothing changes. */
export function hopCounts({ adjacencyList, startNodeId }: AlgorithmInput): Map<number, number> {
  const hops = new Map([[startNodeId, 0]]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const edges of adjacencyList.values()) {
      for (const { from, to } of edges) {
        const via = hops.get(from);
        if (via !== undefined && via + 1 < (hops.get(to) ?? Infinity)) { hops.set(to, via + 1); changed = true; }
      }
    }
  }
  return hops;
}

/** Whether some loop of edges with a negative total can be reached from the start, by trying every simple cycle. */
export function hasReachableNegativeCycle(input: AlgorithmInput): boolean {
  const { adjacencyList } = input;
  const nodes = [...reachable(input, input.startNodeId)];
  // Each cycle is walked from its smallest node, through larger ones only.
  const walk = (first: number, node: number, cost: number, onPath: Set<number>): boolean =>
    (adjacencyList.get(node) ?? []).some(({ to, weight }) =>
      to === first ? cost + weight < 0
      : to > first && !onPath.has(to) && walk(first, to, cost + weight, new Set(onPath).add(to)));
  return nodes.some((first) => walk(first, first, 0, new Set([first])));
}

/**
 * Whether the graph has a cycle: a closed walk that never uses an edge twice, following directed
 * edges only their way and undirected edges either way. Undirected edges between the same two nodes
 * count as one edge, so going out and back along them is not a cycle; with a directed edge involved,
 * two nodes are enough (A→B and B→A, or A→B and B–A). A self-loop, directed or not, is a cycle.
 *
 * Such a walk exists exactly when a simple one does (cut it where it first meets a node again, and
 * the shorter loop still uses no edge twice), so this tries every simple cycle, each walked from its
 * smallest node through larger ones. No order of the edges or nodes matters to the answer.
 */
export function hasCycle({ adjacencyList }: AlgorithmInput): boolean {
  const edges = (from: number) => adjacencyList.get(from) ?? [];
  // Back to the first node from the last: one node is a self-loop; two need edges that are not the
  // same undirected one; three or more are always edges of their own.
  const closes = (path: number[], type: string) => path.length !== 2 || type === "directed"
    || edges(path[0]).some((e) => e.to === path[1] && e.type === "directed");
  const walk = (path: number[]): boolean => edges(path[path.length - 1]).some(({ to, type }) =>
    to === path[0] ? closes(path, type) : to > path[0] && !path.includes(to) && walk([...path, to]));
  return [...adjacencyList.keys()].some((first) => walk([first]));
}

/** Weight of a minimum spanning tree of the start's part of an undirected graph, by plain Kruskal. */
export function kruskalWeight(input: AlgorithmInput): number {
  const part = reachable(input, input.startNodeId);
  const edges = [...input.adjacencyList.values()].flat().filter((e) => part.has(e.from)).sort((a, b) => a.weight - b.weight);
  const leader = new Map([...part].map((id) => [id, id]));
  const find = (id: number): number => (leader.get(id) === id ? id : find(leader.get(id)!));
  let total = 0;
  for (const { from, to, weight } of edges) {
    const [a, b] = [find(from), find(to)];
    if (a === b) continue;
    leader.set(a, b);
    total += weight;
  }
  return total;
}

/**
 * Whether `order` is a topological order of the graph: every node exactly once, and every edge
 * pointing from a node earlier in it to a later one.
 */
export function isTopologicalOrder({ adjacencyList }: AlgorithmInput, order: readonly number[]): boolean {
  const at = new Map(order.map((id, i) => [id, i]));
  if (at.size !== order.length || at.size !== adjacencyList.size || [...adjacencyList.keys()].some((id) => !at.has(id))) return false;
  return [...adjacencyList.values()].flat().every(({ from, to }) => at.get(from)! < at.get(to)!);
}

/**
 * Weight of a minimum spanning forest of an undirected graph (a minimum spanning tree of each piece),
 * and how many pieces it has, by plain Prim's from each node no tree has reached yet: independent of
 * Kruskal's, which it checks. Nodes are the input's nodes and the ends of its edges.
 */
export function primForest({ adjacencyList, nodes }: AlgorithmInput): { weight: number; pieces: number } {
  const ids = new Set([...nodes.map((n) => n.id), ...adjacencyList.keys()]);
  const reached = new Set<number>();
  let weight = 0;
  let pieces = 0;
  for (const root of ids) {
    if (reached.has(root)) continue;
    pieces += 1;
    reached.add(root);
    const tree = [root];
    for (;;) {
      let best: { to: number; weight: number } | null = null;
      for (const from of tree) {
        for (const e of adjacencyList.get(from) ?? []) {
          if (!reached.has(e.to) && (best === null || e.weight < best.weight)) best = e;
        }
      }
      if (best === null) break;
      reached.add(best.to);
      tree.push(best.to);
      weight += best.weight;
    }
  }
  return { weight, pieces };
}
