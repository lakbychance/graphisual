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

export type RenderMode = 'svg' | 'canvas' | '3d';

interface SettingsState {
  theme: Theme;
  renderMode: RenderMode;
  /** Synthesised press sounds for controls (each theme has its own kit). */
  soundEnabled: boolean;
}

interface SettingsActions {
  setTheme: (theme: Theme) => void;
  setRenderMode: (mode: RenderMode) => void;
  setSoundEnabled: (enabled: boolean) => void;
}

type SettingsStore = SettingsState & SettingsActions;

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      // State
      theme: THEME.SYSTEM,
      renderMode: 'svg' as RenderMode,
      soundEnabled: true,

      // Actions
      setTheme: (theme) => {
        set({ theme });
      },
      setRenderMode: (renderMode) => {
        set({ renderMode });
      },
      setSoundEnabled: (soundEnabled) => {
        set({ soundEnabled });
      },
    }),
    {
      name: STORE_NAME.SETTINGS,
    }
  )
);
