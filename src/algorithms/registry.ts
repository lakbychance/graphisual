/**
 * Algorithm Registry
 *
 * Singleton registry for algorithm adapters.
 * Handles registration, lookup, and dropdown option generation.
 */

import { AlgorithmAdapter, AlgorithmType } from "./types";

/**
 * Dropdown option structure (UI-agnostic).
 */
export interface DropdownOption {
  key: string;
  text: string;
  data?: AlgorithmType;
  itemType?: "header" | "divider";
  disabled?: boolean;
}

/**
 * Algorithm Registry Class
 *
 * Manages all registered algorithm adapters and provides
 * lookup and UI option generation functionality.
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
   * Get all algorithms of a specific type.
   * @param type The algorithm type to filter by
   * @returns Array of matching algorithm adapters
   */
  getByType(type: AlgorithmType): AlgorithmAdapter[] {
    return Array.from(this.algorithms.values()).filter(
      (algo) => algo.metadata.type === type
    );
  }

  /**
   * Get all registered algorithms.
   * @returns Array of all algorithm adapters
   */
  getAll(): AlgorithmAdapter[] {
    return Array.from(this.algorithms.values());
  }

  /**
   * Get the number of registered algorithms.
   */
  get size(): number {
    return this.algorithms.size;
  }

  /**
   * Check if an algorithm is registered.
   * @param id The algorithm identifier
   */
  has(id: string): boolean {
    return this.algorithms.has(id);
  }

  /**
   * Generate dropdown options for UI components.
   * Lists all algorithms in a flat list.
   * @returns Array of dropdown options
   */
  getDropdownOptions(): DropdownOption[] {
    const options: DropdownOption[] = [
      { key: "select", text: "Select Algorithm", disabled: true },
    ];

    // Add all algorithms in a flat list
    this.getAll().forEach((algo) => {
      options.push({
        key: algo.metadata.id,
        text: algo.metadata.name,
        data: algo.metadata.type,
      });
    });

    return options;
  }

  /**
   * Get algorithm description/message for display.
   * @param id The algorithm identifier
   * @returns The description string or undefined
   */
  getDescription(id: string): string | undefined {
    return this.get(id)?.metadata.description;
  }

  /**
   * Get algorithm failure message.
   * @param id The algorithm identifier
   * @returns The failure message or a default message
   */
  getFailureMessage(id: string): string {
    return (
      this.get(id)?.metadata.failureMessage ||
      "Algorithm could not complete on this graph."
    );
  }

  /**
   * Clear all registered algorithms.
   * Useful for testing.
   */
  clear(): void {
    this.algorithms.clear();
  }
}

/**
 * Singleton instance of the algorithm registry.
 * Import this to register or lookup algorithms.
 */
export const algorithmRegistry = new AlgorithmRegistry();
