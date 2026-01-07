import { useEffect } from "react";
import { useSettingsStore } from "../store/settingsStore";

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
    const applyTheme = (resolvedTheme: "light" | "dark") => {
      document.documentElement.setAttribute("data-theme", resolvedTheme);
    };

    if (theme === "system") {
      // Use system preference
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const systemTheme = mediaQuery.matches ? "dark" : "light";
      applyTheme(systemTheme);

      // Listen for system preference changes
      const handleChange = (e: MediaQueryListEvent) => {
        applyTheme(e.matches ? "dark" : "light");
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
export const getResolvedTheme = (
  theme: "system" | "light" | "dark"
): "light" | "dark" => {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
};
