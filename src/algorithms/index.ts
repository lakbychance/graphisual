/**
 * Algorithm Module Entry Point
 */

import { algorithmRegistry } from "./registry";

// Import all algorithm adapters
import bfsAdapter from "./adapters/bfs";
import dfsAdapter from "./adapters/dfs";
import dijkstraAdapter from "./adapters/dijkstra";
import primsAdapter from "./adapters/prims";
import cycleDetectionAdapter from "./adapters/cycleDetection";
import bellmanFordAdapter from "./adapters/bellmanFord";

// Register all algorithms
algorithmRegistry.register(bfsAdapter);
algorithmRegistry.register(dfsAdapter);
algorithmRegistry.register(dijkstraAdapter);
algorithmRegistry.register(primsAdapter);
algorithmRegistry.register(cycleDetectionAdapter);
algorithmRegistry.register(bellmanFordAdapter);

// Export registry and types for use in components
export { algorithmRegistry } from "./registry";
export * from "./types";