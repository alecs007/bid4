/**
 * A CSS fade rather than React's <ViewTransition>: that API snapshots the page
 * clipped to the viewport, and skips outright whenever the document is hidden.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
