import { useLayoutEffect, useSyncExternalStore } from "react";
import { useSettingsStore } from "../store/settingsStore";
import { THEME, type ResolvedTheme } from "./constants";
import { invalidateCSSVarCache } from "./css-variables";

const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";

// Constructed once and reused: getSnapshot runs on every render (per-node in
// the 3D graph), so we must not build a fresh MediaQueryList each call.
const systemDarkQuery =
  typeof window !== "undefined" ? window.matchMedia(SYSTEM_DARK_QUERY) : null;

/** Subscribe to OS light/dark changes (for useSyncExternalStore). */
function subscribeSystemPref(onChange: () => void): () => void {
  if (!systemDarkQuery) return () => { };
  systemDarkQuery.addEventListener("change", onChange);
  return () => systemDarkQuery.removeEventListener("change", onChange);
}

/** The current OS colour preference, expressed as a resolved theme. */
function getSystemTheme(): ResolvedTheme {
  return systemDarkQuery?.matches ? THEME.DARK : THEME.LIGHT;
}

/**
 * Resolve the active theme, expanding 'system' to the live OS preference.
 *
 * Reactive by design: `useSyncExternalStore` re-renders consumers when the OS
 * flips light/dark while the user is on 'system'. This is what keeps the 3D
 * graph (which reads the resolved theme to pick colour overrides) in sync with
 * the 2D/CSS side.
 */
export function useResolvedTheme() {
  const theme = useSettingsStore((state) => state.theme);

  // When theme !== 'system' this value is unused, but the subscription is cheap
  // and keeping the hook call unconditional satisfies the rules of hooks.
  const systemTheme = useSyncExternalStore(
    subscribeSystemPref,
    getSystemTheme,
    () => THEME.LIGHT, // server/no-window fallback (SPA never hits this)
  );

  const resolvedTheme: ResolvedTheme =
    theme === THEME.SYSTEM ? systemTheme : (theme as ResolvedTheme);

  return {
    theme: resolvedTheme,
    isDark: resolvedTheme === THEME.DARK,
    isLight: resolvedTheme === THEME.LIGHT,
    isBlueprint: resolvedTheme === THEME.BLUEPRINT,
  };
}

/**
 * Apply the resolved theme to the document. Call once, in App.tsx.
 *
 * Sets `data-theme` on <html> (the single switch that activates the matching
 * token block in tokens.css) and invalidates the CSS-var cache so JS render
 * paths (Canvas 2D, Three.js) re-read fresh values. useLayoutEffect ensures the
 * attribute is set before paint. User-preference persistence is handled by
 * settingsStore's zustand persist middleware.
 */
export function useApplyTheme(): void {
  const { theme } = useResolvedTheme();

  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    invalidateCSSVarCache();
  }, [theme]);
}
