/**
 * The random suite: seeded small graphs every oracle, rule and scrub check runs on.
 * Same seed, same graphs, so a failure always reproduces.
 */
import type { AlgorithmInput, EdgeInfo } from "../../types";

/** mulberry32: a tiny seeded generator. */
export function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface RandomGraph {
  seed: number;
  input: AlgorithmInput;
}

/**
 * Graphs of 1 to 8 nodes with scattered ids, sparse to dense, directed, undirected or mixed,
 * weights 0 to 9 (small range, so ties are common), the odd self-loop and parallel edge.
 * Start and end are random and sometimes the same node.
 */
export function randomGraphs(count = 200, firstSeed = 1): RandomGraph[] {
  const graphs: RandomGraph[] = [];
  for (let seed = firstSeed; seed < firstSeed + count; seed++) {
    const rand = random(seed);
    const int = (n: number) => Math.floor(rand() * n);
    const size = 1 + int(8);
    const ids: number[] = [];
    while (ids.length < size) {
      const id = 1 + int(20);
      if (!ids.includes(id)) ids.push(id);
    }
    const density = rand();
    const style = int(3); // 0 directed, 1 undirected, 2 mixed
    const adjacencyList = new Map<number, EdgeInfo[]>(ids.map((id) => [id, []]));
    for (const from of ids) {
      for (const to of ids) {
        if (rand() >= density / (from === to ? 6 : 1)) continue;
        const undirected = style === 1 || (style === 2 && rand() < 0.5);
        if (undirected && to < from) continue; // undirected pairs are added once, both ways
        const copies = rand() < 0.08 ? 2 : 1;
        for (let c = 0; c < copies; c++) {
          const weight = int(10);
          const type = undirected ? "undirected" : "directed";
          adjacencyList.get(from)!.push({ from, to, weight, type });
          if (undirected && from !== to) adjacencyList.get(to)!.push({ from: to, to: from, weight, type });
        }
      }
    }
    graphs.push({
      seed,
      input: {
        adjacencyList,
        nodes: ids.map((id) => ({ id })),
        startNodeId: ids[int(size)],
        endNodeId: ids[int(size)],
      },
    });
  }
  return graphs;
}

/**
 * One larger graph: a ring of 40 nodes with a few chords, so runs are long enough for the scrub
 * check to build a checkpoint from an earlier one. Its simple paths stay few, so the oracles stay quick.
 */
export function largeGraph(seed = 1000): RandomGraph {
  const rand = random(seed);
  const int = (n: number) => Math.floor(rand() * n);
  const size = 40;
  const adjacencyList = new Map<number, EdgeInfo[]>();
  for (let id = 1; id <= size; id++) adjacencyList.set(id, []);
  const join = (from: number, to: number) => {
    const weight = int(10);
    adjacencyList.get(from)!.push({ from, to, weight, type: "undirected" });
    adjacencyList.get(to)!.push({ from: to, to: from, weight, type: "undirected" });
  };
  for (let id = 1; id <= size; id++) join(id, (id % size) + 1);
  for (let c = 0; c < 4; c++) join(1 + int(size), 1 + int(size));
  return {
    seed,
    input: { adjacencyList, nodes: [...adjacencyList.keys()].map((id) => ({ id })), startNodeId: 1, endNodeId: 1 + size / 2 },
  };
}

/** The same graph with every edge undirected (for algorithms that refuse directed edges). */
export function asUndirected({ seed, input }: RandomGraph): RandomGraph {
  const adjacencyList = new Map<number, EdgeInfo[]>([...input.adjacencyList.keys()].map((id) => [id, []]));
  for (const edges of input.adjacencyList.values()) {
    for (const { from, to, weight, type } of edges) {
      adjacencyList.get(from)!.push({ from, to, weight, type: "undirected" });
      if (type === "directed" && from !== to) adjacencyList.get(to)!.push({ from: to, to: from, weight, type: "undirected" });
    }
  }
  return { seed, input: { ...input, adjacencyList } };
}

/** The same graph with every weight lowered by 2, so some are negative (−2 to 7). */
export function withNegativeWeights({ seed, input }: RandomGraph): RandomGraph {
  const adjacencyList = new Map([...input.adjacencyList].map(([id, edges]) => [id, edges.map((e) => ({ ...e, weight: e.weight - 2 }))]));
  return { seed, input: { ...input, adjacencyList } };
}

/**
 * The same graph as a DAG (for topological sort): every edge one-way, pointing from the end that comes
 * first in a seeded shuffle of the nodes to the other; self-loops dropped, an undirected edge kept
 * once, parallel edges kept.
 */
export function asDag({ seed, input }: RandomGraph): RandomGraph {
  const rand = random(seed + 7919);
  const ids = [...input.adjacencyList.keys()];
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const rank = new Map(ids.map((id, i) => [id, i]));
  const adjacencyList = new Map<number, EdgeInfo[]>([...input.adjacencyList.keys()].map((id) => [id, []]));
  for (const edges of input.adjacencyList.values()) {
    for (const { from, to, weight, type } of edges) {
      if (from === to || (type === "undirected" && from > to)) continue;
      const [a, b] = rank.get(from)! < rank.get(to)! ? [from, to] : [to, from];
      adjacencyList.get(a)!.push({ from: a, to: b, weight, type: "directed" });
    }
  }
  return { seed, input: { ...input, adjacencyList } };
}
