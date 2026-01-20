/**
 * Settings Store
 *
 * App-level settings that persist across graph resets.
 * Separated from graphStore to prevent settings from being reset with the graph.
 * Uses zustand persist middleware to automatically save/load from localStorage.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { THEME, STORE_NAME, type Theme } from "../constants";
import { invalidateCSSVarCache } from "../utility/cssVariables";

interface SettingsState {
  theme: Theme;
  is3DMode: boolean;
}

interface SettingsActions {
  setTheme: (theme: Theme) => void;
  setIs3DMode: (is3DMode: boolean) => void;
}

type SettingsStore = SettingsState & SettingsActions;

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      // State
      theme: THEME.SYSTEM,
      is3DMode: false,

      // Actions
      setTheme: (theme) => {
        invalidateCSSVarCache();
        set({ theme });
      },
      setIs3DMode: (is3DMode) => {
        set({ is3DMode });
      },
    }),
    {
      name: STORE_NAME.SETTINGS,
    }
  )
);
