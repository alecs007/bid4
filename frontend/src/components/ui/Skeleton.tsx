import { cn } from "@/lib/utils/cn";

/**
 * Loading placeholders. The mock layer deliberately waits 220–700 ms so these
 * are visible during development instead of flashing past.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("shimmer block rounded-xl bg-ink-100", className)}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <span className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn("h-3.5", index === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </span>
  );
}

/** Matches the footprint of an auction card so the grid does not jump. */
export function SkeletonAuctionCard() {
  return (
    <div className="overflow-hidden rounded-3xl border border-ink-200 bg-white">
      <Skeleton className="aspect-4/3 w-full rounded-none" />
      <div className="flex flex-col gap-3 p-5">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-1/2" />
        <div className="mt-2 flex items-center justify-between gap-3">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Se încarcă"
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonAuctionCard key={index} />
      ))}
    </div>
  );
}

export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div role="status" aria-label="Se încarcă" className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 rounded-2xl border border-ink-200 bg-white p-4"
        >
          <Skeleton className="h-14 w-14 rounded-2xl" />
          <div className="flex-1">
            <Skeleton className="mb-2 h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Detail-page skeleton: gallery + panel, used by /licitatii/[id]-style routes. */
export function SkeletonDetail() {
  return (
    <div
      role="status"
      aria-label="Se încarcă"
      className="grid gap-6 lg:grid-cols-[1.2fr_1fr]"
    >
      <div className="flex flex-col gap-3">
        <Skeleton className="aspect-4/3 w-full rounded-3xl" />
        <div className="flex gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-20 rounded-2xl" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-4 rounded-3xl border border-ink-200 bg-white p-6">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-12 w-40" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-13 w-full rounded-2xl" />
        <SkeletonText lines={3} />
      </div>
    </div>
  );
}

/** Stat-tile row skeleton for dashboards. */
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Se încarcă"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-start gap-3 rounded-3xl border border-ink-200 bg-white p-5"
        >
          <Skeleton className="h-11 w-11 rounded-2xl" />
          <div className="flex-1">
            <Skeleton className="mb-2 h-7 w-24" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Fades content in when it replaces a skeleton, so the swap reads as one
 * motion instead of a hard cut. Pair every Suspense boundary with this.
 */
export function Reveal({
  children,
  delayMs = 0,
  className,
}: {
  children: React.ReactNode;
  delayMs?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("animate-fade-in", className)}
      style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
