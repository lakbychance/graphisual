/**
 * The random suite: seeded small graphs every oracle, rule and scrub check runs on.
 * Same seed, same graphs, so a failure always reproduces.
 */
import type { AlgorithmInput, EdgeInfo } from "../../types";

/** mulberry32: a tiny seeded generator. */
function random(seed: number) {
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
