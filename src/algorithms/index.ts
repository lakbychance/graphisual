/**
 * Algorithm Module Entry Point
 *
 * This file handles algorithm registration and exports.
 * After migrating to Vite, auto-discovery will work via import.meta.glob.
 * For now, we manually import and register adapters.
 */

import { algorithmRegistry } from "./registry";

// Import all algorithm adapters
import bfsAdapter from "./adapters/bfs";
import dfsAdapter from "./adapters/dfs";
import dijkstraAdapter from "./adapters/dijkstra";
import primsAdapter from "./adapters/prims";
import cycleDetectionAdapter from "./adapters/cycleDetection";
import floydWarshallAdapter from "./adapters/floydWarshall";

// Register all algorithms
algorithmRegistry.register(bfsAdapter);
algorithmRegistry.register(dfsAdapter);
algorithmRegistry.register(dijkstraAdapter);
algorithmRegistry.register(primsAdapter);
algorithmRegistry.register(cycleDetectionAdapter);
algorithmRegistry.register(floydWarshallAdapter);

// Export registry and types for use in components
export { algorithmRegistry } from "./registry";
export type { DropdownOption } from "./registry";
export * from "./types";

/**
 * NOTE FOR CONTRIBUTORS:
 *
 * To add a new algorithm:
 * 1. Create a new file in src/algorithms/adapters/ (e.g., astar.ts)
 * 2. Implement the AlgorithmAdapter interface
 * 3. Export it as the default export
 * 4. Import and register it in this file (above)
 *
 * After Vite migration, step 4 will be automatic via import.meta.glob.
 *
 * Example adapter structure:
 *
 * ```typescript
 * import { AlgorithmAdapter, AlgorithmType } from '../types';
 *
 * const myAdapter: AlgorithmAdapter = {
 *   metadata: {
 *     id: 'my-algo',
 *     name: 'My Algorithm',
 *     type: AlgorithmType.TRAVERSAL,
 *     description: 'Click a node to start.',
 *   },
 *   execute: (input) => {
 *     const visitedEdges = [];
 *     // ... algorithm logic ...
 *     return { visitedEdges };
 *   },
 * };
 *
 * export default myAdapter;
 * ```
 */
