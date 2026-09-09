"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether a media query matches, as a value a render can use.
 *
 * <p>{@code useSyncExternalStore} rather than an effect that sets state: the query is exactly the
 * kind of outside thing it exists for, and it answers during the render that asks rather than one
 * after — which matters when the answer decides whether a subtree is portalled at all.
 *
 * <p>The server snapshot is false. Nothing is known about the viewport there, and a layout that
 * assumed a phone would be wrong for every desktop's first paint.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Below the `lg` breakpoint, where the layout stops having room for two panes. */
export function useIsPhone(): boolean {
  return useMediaQuery("(max-width: 1023px)");
}
