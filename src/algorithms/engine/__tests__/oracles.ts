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
 * Whether a depth-first colouring finds a cycle: from the start, then from every node still
 * white, an edge to a grey node (one still being explored) is a cycle, except the undirected
 * edge back to the node just come from.
 */
export function hasCycle({ adjacencyList, startNodeId }: AlgorithmInput): boolean {
  const colour = new Map<number, "grey" | "black">();
  const visit = (node: number, parent?: number): boolean => {
    colour.set(node, "grey");
    for (const edge of adjacencyList.get(node) ?? []) {
      const c = colour.get(edge.to);
      if (c === "grey" && !(edge.type === "undirected" && edge.to === parent)) return true;
      if (c === undefined && visit(edge.to, node)) return true;
    }
    colour.set(node, "black");
    return false;
  };
  return [startNodeId, ...adjacencyList.keys()].some((node) => !colour.has(node) && visit(node));
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
