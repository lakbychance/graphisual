import { useEffect } from "react";
import { useGraphStore } from "../store/graphStore";
import { algorithmRegistry } from "../algorithms";
import { VisualizationMode } from "../constants/visualization";
import {
  generateWeighted,
  generateRandomGraph,
  generateCycle,
  graphFromSpec,
  type GeneratedGraph,
} from "../utils/graph/graphGenerator";
import { decodeGraphLink } from "../utils/graph/graphLink";

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
 * loads the graph carried in `?graph=` (or generates an appropriate one),
 * and cleans the URL.
 */
export function useAlgorithmFromUrl() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const algorithmParam = params.get("algorithm");
    if (!algorithmParam) return;

    const algo = algorithmRegistry.get(algorithmParam);
    if (!algo) return;

    const { setVisualizationAlgorithm, setVisualizationMode, setGraph } = useGraphStore.getState();

    setVisualizationAlgorithm({
      key: algorithmParam,
      text: algo.metadata.name,
    });

    setVisualizationMode(VisualizationMode.MANUAL);

    // A landing page can hand over the graph the visitor arranged there.
    const linked = decodeGraphLink(params.get("graph") ?? "");
    const generator = graphForAlgorithm[algorithmParam];
    const graph = linked ? graphFromSpec(linked) : generator?.();
    if (graph) setGraph(graph.nodes, graph.edges, graph.nodeCounter);

    window.history.replaceState({}, "", "/");
  }, []);
}
