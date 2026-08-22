/**
 * Wraps the root element of every `page.tsx`, so each page arrives instead of
 * appearing: it fades in over 450ms.
 *
 * This used to drive React's <ViewTransition>. Two things sank that. The API
 * replaces the page with a snapshot clipped to the viewport, so any movement
 * on it drags a cut edge into view on a page taller than the screen — and a
 * crossfade with no movement, between two layouts that are both white cards on
 * a near-white canvas, is invisible. On top of that the browser skips the
 * whole transition whenever the document is not visible, which is silent and
 * impossible to feel out.
 *
 * A CSS animation on the real element has none of those problems: nothing is
 * snapshotted, nothing is clipped, and it runs the same everywhere.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
