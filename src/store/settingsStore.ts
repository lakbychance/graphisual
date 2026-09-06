/**
 * Settings Store
 *
 * App-level settings that persist across graph resets.
 * Separated from graphStore to prevent settings from being reset with the graph.
 * Uses zustand persist middleware to automatically save/load from localStorage.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { THEME, type Theme } from "@/theme/constants";
import { STORE_NAME } from "../constants/store";

type RenderMode = 'svg' | 'canvas' | '3d';

interface SettingsState {
  theme: Theme;
  renderMode: RenderMode;
}

interface SettingsActions {
  setTheme: (theme: Theme) => void;
  setRenderMode: (mode: RenderMode) => void;
}

type SettingsStore = SettingsState & SettingsActions;

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      // State
      theme: THEME.SYSTEM,
      renderMode: 'svg' as RenderMode,

      // Actions
      setTheme: (theme) => {
        set({ theme });
      },
      setRenderMode: (renderMode) => {
        set({ renderMode });
      },
    }),
    {
      name: STORE_NAME.SETTINGS,
    }
  )
);
