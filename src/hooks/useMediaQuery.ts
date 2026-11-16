import { useCallback, useSyncExternalStore } from "react";

/**
 * Hook to track if a media query matches.
 *
 * The answer is read from the browser during the very first render, so a
 * desktop page never paints its mobile layout first and then swaps.
 *
 * @param query - CSS media query string (e.g., '(min-width: 768px)')
 * @returns boolean indicating if the query matches
 */
const useMediaQuery = (query: string): boolean => {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener("change", onChange);
      return () => mediaQuery.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
};

/**
 * Hook to check if viewport is desktop size (≥ 768px)
 */
export const useIsDesktop = (): boolean => {
  return useMediaQuery("(min-width: 768px)");
};
