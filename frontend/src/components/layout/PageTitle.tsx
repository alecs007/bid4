export function PageTitle({ children }: { children: string }) {
  return (
    <div className="sticky top-12 z-30 flex h-10 items-center justify-center border-b border-line bg-white sm:top-14">
      <h1 className="font-display text-sm font-extrabold text-ink-700">
        {children}
      </h1>
    </div>
  );
}
