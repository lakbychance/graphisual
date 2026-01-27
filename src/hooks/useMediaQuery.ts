import { useState, useEffect } from "react";

/**
 * Hook to track if a media query matches
 * @param query - CSS media query string (e.g., '(min-width: 768px)')
 * @returns boolean indicating if the query matches
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [query]);

  return matches;
};

/**
 * Hook to check if viewport is desktop size (≥ 768px)
 */
export const useIsDesktop = (): boolean => {
  return useMediaQuery("(min-width: 768px)");
};

/**
 * Hook to check if device has hover capability (not touch-only)
 */
export const useHasHover = (): boolean => {
  return useMediaQuery("(hover: hover)");
};
