import { useMemo } from "react";
import { useSettingsStore } from "../store/settingsStore";

export type ResolvedTheme = 'light' | 'dark' | 'blueprint';

/**
 * Hook that returns the resolved theme, handling 'system' by checking prefers-color-scheme.
 * Also returns convenience booleans for each theme.
 */
export function useResolvedTheme() {
  const theme = useSettingsStore((state) => state.theme);

  const resolvedTheme = useMemo((): ResolvedTheme => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme as ResolvedTheme;
  }, [theme]);

  return {
    theme: resolvedTheme,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
    isBlueprint: resolvedTheme === 'blueprint',
  };
}
