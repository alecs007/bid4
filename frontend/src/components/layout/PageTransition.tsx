export function PageTransition({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in relative z-0">{children}</div>;
}
