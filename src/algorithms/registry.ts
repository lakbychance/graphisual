/**
 * Algorithm Registry
 *
 * Singleton registry for algorithm adapters.
 * Handles registration and lookup.
 */

import { AlgorithmAdapter } from "./types";

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
}

/**
 * Singleton instance of the algorithm registry.
 * Import this to register or lookup algorithms.
 */
export const algorithmRegistry = new AlgorithmRegistry();
