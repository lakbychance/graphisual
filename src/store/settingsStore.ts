/**
 * Settings Store
 *
 * App-level settings that persist across graph resets.
 * Separated from graphStore to prevent settings from being reset with the graph.
 * Uses zustand persist middleware to automatically save/load from localStorage.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { THEME, type Theme } from "../constants/theme";
import { STORE_NAME } from "../constants/store";

export type RenderMode = 'svg' | 'canvas' | '3d';

interface SettingsState {
  theme: Theme;
  is3DMode: boolean;
  renderMode: RenderMode;
}

interface SettingsActions {
  setTheme: (theme: Theme) => void;
  setIs3DMode: (is3DMode: boolean) => void;
  setRenderMode: (mode: RenderMode) => void;
}

type SettingsStore = SettingsState & SettingsActions;

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      // State
      theme: THEME.SYSTEM,
      is3DMode: false,
      renderMode: 'svg' as RenderMode, // Default to SVG during migration

      // Actions
      setTheme: (theme) => {
        set({ theme });
      },
      setIs3DMode: (is3DMode) => {
        // Sync renderMode with is3DMode for backwards compatibility
        set({ is3DMode, renderMode: is3DMode ? '3d' : 'svg' });
      },
      setRenderMode: (renderMode) => {
        // Sync is3DMode with renderMode for backwards compatibility
        set({ renderMode, is3DMode: renderMode === '3d' });
      },
    }),
    {
      name: STORE_NAME.SETTINGS,
    }
  )
);
