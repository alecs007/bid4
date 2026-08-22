import { ViewTransition } from "react";

/**
 * Wraps the root element of every `page.tsx`. A route change plays exactly two
 * beats and no more: the old page fades out and up, the new one fades in from
 * below with its skeleton, and when the data lands the skeleton crossfades
 * into the content in place (`update`).
 *
 * It belongs on the pages themselves, not on the layout. A layout persists
 * across navigations, so a boundary there never sees an enter/exit pair — and
 * forcing one by keying it on the pathname remounts the whole route subtree,
 * which makes React fall back to the *outermost* pending boundary. That is
 * what put the auctions-list skeleton on a single auction page.
 *
 * `default="none"` keeps this boundary out of transitions it has no business
 * animating; every state is named explicitly.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition
      enter="page-enter"
      exit="page-exit"
      update="page-reveal"
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
