/**
 * Settings Store
 *
 * App-level settings that persist across graph resets.
 * Separated from graphStore to prevent settings from being reset with the graph.
 * Uses zustand persist middleware to automatically save/load from localStorage.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "system" | "light" | "dark";

interface SettingsState {
  theme: Theme;
}

interface SettingsActions {
  setTheme: (theme: Theme) => void;
}

type SettingsStore = SettingsState & SettingsActions;

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      // State
      theme: "system",

      // Actions
      setTheme: (theme) => {
        set({ theme });
      },
    }),
    {
      name: "graphisual-settings",
    }
  )
);
