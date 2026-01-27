import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { debounce } from "../utils/debounce";
import { TIMING } from "../constants/ui";

interface HistoryState<T> {
  past: T[];
  future: T[];
}

interface HistoryActions<T> {
  push: (snapshot: T) => void;
  undo: (getCurrent: () => T, apply: (snapshot: T) => void) => void;
  redo: (getCurrent: () => T, apply: (snapshot: T) => void) => void;
  clear: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

type HistoryStore<T> = HistoryState<T> & HistoryActions<T>;

interface HistoryOptions<T> {
  name?: string;
  areEqual?: (a: T, b: T) => boolean;
}

export function createHistoryStore<T>(options: HistoryOptions<T> = {}) {
  const { name = "HistoryStore", areEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b) } = options;

  return create<HistoryStore<T>>()(
    devtools(
      (set, get) => ({
        past: [],
        future: [],

        push: (snapshot) => {
          const { past } = get();
          if (past.length > 0 && areEqual(snapshot, past[past.length - 1])) {
            return; // Deduplicate
          }
          set({ past: [...past, snapshot], future: [] });
        },

        undo: (getCurrent, apply) => {
          const { past, future } = get();
          if (past.length === 0) return;
          const previous = past[past.length - 1];
          const current = getCurrent();
          set({ past: past.slice(0, -1), future: [current, ...future] });
          apply(previous);
        },

        redo: (getCurrent, apply) => {
          const { past, future } = get();
          if (future.length === 0) return;
          const next = future[0];
          const current = getCurrent();
          set({ past: [...past, current], future: future.slice(1) });
          apply(next);
        },

        clear: () => set({ past: [], future: [] }),
        canUndo: () => get().past.length > 0,
        canRedo: () => get().future.length > 0,
      }),
      { name }
    )
  );
}

// ============================================================================
// Auto-History Middleware
// ============================================================================

/**
 * Creates a wrapper that automatically captures a snapshot before each mutation.
 * The snapshot is pushed to the history store for undo/redo support.
 */
export function withAutoHistory<TSnapshot, TArgs extends unknown[], TReturn>(
  historyStore: { getState: () => { push: (snapshot: TSnapshot) => void } },
  createSnapshot: () => TSnapshot,
  mutation: (...args: TArgs) => TReturn
): (...args: TArgs) => TReturn {
  return (...args: TArgs): TReturn => {
    const snapshot = createSnapshot();
    historyStore.getState().push(snapshot);
    return mutation(...args);
  };
}

/**
 * Batched auto-history wrapper for high-frequency mutations like dragging.
 *
 * Captures state on first call, then debounces pushing to history.
 * This ensures rapid calls (e.g., moving a node pixel by pixel) result
 * in a single undo entry rather than one per call.
 */
export function withBatchedAutoHistory<TSnapshot, TArgs extends unknown[], TReturn>(
  historyStore: { getState: () => { push: (snapshot: TSnapshot) => void } },
  createSnapshot: () => TSnapshot,
  mutation: (...args: TArgs) => TReturn,
  debounceMs: number = TIMING.DEBOUNCE
): (...args: TArgs) => TReturn {
  let pendingSnapshot: TSnapshot | null = null;

  // Create debounced function to push snapshot when batch ends
  const pushSnapshot = debounce(() => {
    if (pendingSnapshot) {
      historyStore.getState().push(pendingSnapshot);
      pendingSnapshot = null;
    }
  }, debounceMs);

  return (...args: TArgs): TReturn => {
    // Capture snapshot only on first call of batch
    if (!pendingSnapshot) {
      pendingSnapshot = createSnapshot();
    }

    // Execute mutation
    const result = mutation(...args);

    // Schedule push (debounced - will only fire after calls stop)
    pushSnapshot();

    return result;
  };
}
