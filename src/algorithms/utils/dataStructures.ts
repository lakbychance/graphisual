/**
 * Simple data structures for graph algorithms.
 */

/**
 * Simple Queue implementation for BFS algorithms.
 */
export class Queue<T> {
  private items: T[] = [];

  push(item: T): void {
    this.items.push(item);
  }

  shift(): T | undefined {
    return this.items.shift();
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

/**
 * Simple Stack implementation for DFS algorithms.
 */
export class Stack<T> {
  private items: T[] = [];

  push(item: T): void {
    this.items.push(item);
  }

  pop(): T | undefined {
    return this.items.pop();
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}
