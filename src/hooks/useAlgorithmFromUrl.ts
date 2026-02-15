import { useEffect } from "react";
import { useGraphStore } from "../store/graphStore";
import { algorithmRegistry } from "../algorithms";
import {
  generateWeighted,
  generateRandomGraph,
  generateCycle,
  type GeneratedGraph,
} from "../utils/graph/graphGenerator";

const graphForAlgorithm: Record<string, () => GeneratedGraph> = {
  "dijkstra": generateWeighted,
  "bellman-ford": generateWeighted,
  "prims": () => generateRandomGraph({ nodeCount: 6, edgeDensity: 0.5, directed: false, weighted: true, minWeight: 1, maxWeight: 10, layout: "circular" }),
  "bfs": () => generateRandomGraph({ nodeCount: 6, edgeDensity: 0.4, directed: false, weighted: false, layout: "circular" }),
  "dfs": () => generateRandomGraph({ nodeCount: 6, edgeDensity: 0.4, directed: false, weighted: false, layout: "circular" }),
  "bfs-pathfinding": () => generateRandomGraph({ nodeCount: 6, edgeDensity: 0.4, directed: false, weighted: false, layout: "circular" }),
  "dfs-pathfinding": () => generateRandomGraph({ nodeCount: 6, edgeDensity: 0.4, directed: false, weighted: false, layout: "circular" }),
  "cycle-detection": () => generateCycle(6),
};

/**
 * Reads `?algorithm=` from the URL on mount, selects the algorithm,
 * generates an appropriate graph, and cleans the URL.
 */
export function useAlgorithmFromUrl() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const algorithmParam = params.get("algorithm");
    if (!algorithmParam) return;

    const algo = algorithmRegistry.get(algorithmParam);
    if (!algo) return;

    const { setVisualizationAlgorithm, setGraph } = useGraphStore.getState();

    setVisualizationAlgorithm({
      key: algorithmParam,
      text: algo.metadata.name,
      data: algo.metadata.type,
    });

    const generator = graphForAlgorithm[algorithmParam];
    if (generator) {
      const { nodes, edges, nodeCounter } = generator();
      setGraph(nodes, edges, nodeCounter);
    }

    window.history.replaceState({}, "", "/");
  }, []);
}
