import { useEffect } from "react";
import { useSettingsStore } from "../store/settingsStore";
import { THEME, type Theme, type ResolvedTheme } from "../constants";

/**
 * Hook to manage theme state and system preference detection.
 * Persistence is handled by settingsStore via zustand persist middleware.
 * Call this once in App.tsx to initialize theming.
 */
export const useTheme = () => {
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);

  // Apply theme to document
  useEffect(() => {
    const applyTheme = (resolvedTheme: ResolvedTheme) => {
      document.documentElement.setAttribute("data-theme", resolvedTheme);
    };

    if (theme === THEME.SYSTEM) {
      // Use system preference
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const systemTheme = mediaQuery.matches ? THEME.DARK : THEME.LIGHT;
      applyTheme(systemTheme);

      // Listen for system preference changes
      const handleChange = (e: MediaQueryListEvent) => {
        applyTheme(e.matches ? THEME.DARK : THEME.LIGHT);
      };
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else {
      // Use explicit preference
      applyTheme(theme);
    }
  }, [theme]);

  return { theme, setTheme };
};

/**
 * Get the resolved theme (light or dark), accounting for system preference.
 */
export const getResolvedTheme = (theme: Theme): ResolvedTheme => {
  if (theme === THEME.SYSTEM) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? THEME.DARK
      : THEME.LIGHT;
  }
  return theme;
};
