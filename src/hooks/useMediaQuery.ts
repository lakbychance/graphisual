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

/**
 * Hook to check if viewport is short and wide, like a phone on its side, where a run's notebook
 * takes the full height beside the graph
 */
export const useIsShortWindow = (): boolean => {
  return useMediaQuery("(min-width: 560px) and (max-height: 500px)");
};

/**
 * A roomy screen: at least 1024 wide and 700 tall. Extras that help on a big screen but would only
 * crowd a small one (D69), like the edge list's graph facts, show only here. One check, so every
 * such extra appears and disappears at the same sizes.
 */
export const ROOMY_SCREEN = "(min-width: 1024px) and (min-height: 700px)";

export const useIsRoomyScreen = (): boolean => {
  return useMediaQuery(ROOMY_SCREEN);
};
