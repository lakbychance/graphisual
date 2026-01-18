import { create } from "zustand";
import { devtools } from "zustand/middleware";

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
