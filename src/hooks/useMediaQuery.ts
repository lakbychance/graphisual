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

/**
 * A phone, upright (narrower than the app's 768 breakpoint) or on its side (500 tall or less). Phones
 * hold at most `PHONE_NODE_LIMIT` nodes (D71): a bigger graph can't fit at the zoom floor, nor its
 * run's tables in the notebook. Adding nodes stops there, and a bigger graph from a link opens as it
 * is but doesn't run. One check, so every limit starts and stops at the same sizes.
 */
export const PHONE_SCREEN = "(max-width: 767.98px), (max-height: 500px)";

/** The most nodes a phone holds (D71); the Generate maximum too. */
export const PHONE_NODE_LIMIT = 15;

/**
 * The node limit at this moment, for an action to check as it happens: `PHONE_NODE_LIMIT` on a
 * phone, none (undefined) on a bigger screen. Read when the learner acts, so turning the phone or
 * resizing the window never touches a run already playing.
 */
export const phoneNodeLimit = (): number | undefined =>
  (window.matchMedia(PHONE_SCREEN).matches ? PHONE_NODE_LIMIT : undefined);
