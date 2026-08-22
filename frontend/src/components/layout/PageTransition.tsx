import { ViewTransition } from "react";

/**
 * Wraps the root element of every `page.tsx`: one page dissolves into the next.
 *
 * Opacity only, deliberately. A view transition replaces the page with a
 * snapshot clipped to the viewport, so moving or blurring that snapshot drags
 * its cut edge into view on any page taller than the screen. Motion belongs on
 * real elements, which is where the content reveal does it.
 *
 * The reveal itself is not a view transition at all: a page-wide crossfade
 * dips the whole screen's opacity for a change that is usually confined to one
 * grid. Components animate their own content in instead.
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
    <ViewTransition enter="page-enter" exit="page-exit" default="none">
      {children}
    </ViewTransition>
  );
}
