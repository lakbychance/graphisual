/**
 * Algorithm Registry
 *
 * Singleton registry for algorithm adapters.
 * Handles registration and lookup.
 */

import { AlgorithmAdapter, AlgorithmType } from "./types";

/**
 * Algorithm Registry Class
 *
 * Manages all registered algorithm adapters and provides
 * lookup functionality.
 */
class AlgorithmRegistry {
  private algorithms: Map<string, AlgorithmAdapter> = new Map();

  /**
   * Register an algorithm adapter.
   * @param adapter The algorithm adapter to register
   */
  register(adapter: AlgorithmAdapter): void {
    const { id } = adapter.metadata;
    if (this.algorithms.has(id)) {
      console.warn(`Algorithm "${id}" is already registered. Skipping.`);
      return;
    }
    this.algorithms.set(id, adapter);
  }

  /**
   * Get an algorithm by its ID.
   * @param id The algorithm identifier
   * @returns The algorithm adapter or undefined
   */
  get(id: string): AlgorithmAdapter | undefined {
    return this.algorithms.get(id);
  }

  /**
   * Get all registered algorithms.
   * @returns Array of all algorithm adapters
   */
  getAll(): AlgorithmAdapter[] {
    return Array.from(this.algorithms.values());
  }

  /**
   * Get algorithms by category (for tab-based UI).
   * Filters by algorithm type directly.
   *
   * @param category The algorithm category to filter by
   * @returns Array of algorithm adapters for this category
   */
  getByCategory(category: "traversal" | "pathfinding"): AlgorithmAdapter[] {
    return Array.from(this.algorithms.values()).filter((adapter) => {
      if (category === "traversal") {
        return adapter.metadata.type === AlgorithmType.TRAVERSAL ||
               adapter.metadata.type === AlgorithmType.TREE;
      }
      return adapter.metadata.type === AlgorithmType.PATHFINDING;
    });
  }
}

/**
 * Singleton instance of the algorithm registry.
 * Import this to register or lookup algorithms.
 */
export const algorithmRegistry = new AlgorithmRegistry();
