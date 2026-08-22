import { ViewTransition } from "react";

/**
 * Wraps the root element of every `page.tsx` and every `loading.tsx`: the old
 * one fades out and up, the new one fades in from below.
 *
 * It belongs on the pages themselves, not on the layout. A layout persists
 * across navigations, so a boundary there never sees an enter/exit pair — and
 * forcing one by keying it on the pathname remounts the whole route subtree,
 * which makes React fall back to the *outermost* pending boundary. That is
 * what put the auctions-list skeleton on a single auction page.
 *
 * Because the skeletons are wrapped too, a route change reads as one
 * continuous motion: page out, skeleton in, skeleton out, content in.
 *
 * `default="none"` keeps this boundary out of transitions it has no business
 * animating; enter and exit are named explicitly.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-enter" exit="page-exit" default="none">
      {children}
    </ViewTransition>
  );
}
