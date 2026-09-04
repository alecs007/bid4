/**
 * A CSS fade rather than React's <ViewTransition>: that API snapshots the page
 * clipped to the viewport, and skips outright whenever the document is hidden.
 *
 * <p>`z-0` makes the whole page one stacking context below the header's `z-40`, so nothing a
 * page raises for its own reasons — a sticky bar, a card's badge, anything mid-animation — can
 * come out over it. Opacity alone, and no transform: a transform here would make this the
 * containing block for every `position: fixed` child under it.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in relative z-0">{children}</div>;
}
