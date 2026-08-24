import { cn } from "@/lib/utils/cn";

/**
 * Skeletons here mirror the real components box for box — same wrappers, same
 * paddings, same fixed heights — so that swapping placeholder for content does
 * not move anything on the page. When one of the real layouts changes, its
 * skeleton has to change with it.
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

/**
 * Paragraph placeholder on the rhythm of `leading-relaxed` body copy: 16px
 * bars 10px apart, plus 5px of half-leading top and bottom, is 26px per line —
 * the same height the real text occupies, for any number of lines.
 */
export function SkeletonParagraph({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2.5 py-[5px]", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn("h-4", index === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

/** Mirrors `<AuctionCard>`: square cover, two title lines, price row. */
export function SkeletonAuctionCard() {
  return (
    <div className="flex flex-col rounded-3xl bg-white ring-1 ring-edge p-2">
      <Skeleton className="aspect-square w-full rounded-2xl" />
      <div className="flex flex-1 flex-col px-2 pt-2 pb-1.5">
        {/* The real title is clamped to two lines at min-h-[2.6em] = 42px. */}
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/5" />
        </div>
        <div className="mt-auto flex items-end justify-between gap-1.5 pt-2.5">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-14" />
        </div>
      </div>
    </div>
  );
}

/** Same grid as `<AuctionGrid>`, including its two column choices. */
export function SkeletonGrid({
  count = 8,
  columns = 4,
}: {
  count?: number;
  columns?: 3 | 4;
}) {
  return (
    <div
      role="status"
      aria-label="Se încarcă"
      className={cn(
        "grid grid-cols-2 gap-3 sm:gap-4",
        columns === 4 ? "lg:grid-cols-4" : "md:grid-cols-3",
      )}
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
          className="flex items-center gap-4 rounded-2xl bg-white ring-1 ring-edge p-4"
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

/** Mirrors the rows in `<BidHistory>`: avatar, name over time, amount. */
export function SkeletonBidRows({ count = 3 }: { count?: number }) {
  return (
    <>
      <ul className="divide-y divide-line">
        {Array.from({ length: count }).map((_, index) => (
          <li key={index} className="flex items-center gap-3 py-2.5">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-6 w-16" />
          </li>
        ))}
      </ul>
      <Skeleton className="mt-2 h-5 w-40" />
    </>
  );
}

/** The card wrapper shared by the blocks under an auction or a cause. */
function SkeletonCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-3xl bg-white ring-1 ring-edge p-5", className)}>
      {children}
    </div>
  );
}

function SkeletonPersonRow() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="h-11 w-11 rounded-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3.5 w-1/3" />
      </div>
    </div>
  );
}

const DETAIL_GRID =
  "grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-6";

/** Full `/licitatii/[id]` page: gallery, bid panel, description, bids, sidebar. */
export function SkeletonDetail() {
  return (
    <div
      role="status"
      aria-label="Se încarcă"
      className="flex flex-col gap-4 pb-24 lg:pb-0"
    >
      {/* The breadcrumb trail the loaded page puts here. */}
      <Skeleton className="h-5 w-64" />

      <div className={DETAIL_GRID}>
        <div className="flex min-w-0 flex-col gap-3">
          <Skeleton className="aspect-4/3 w-full rounded-3xl" />
          <div className="flex gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-20 rounded-2xl" />
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div>
            <div className="mb-2 flex gap-2">
              <Skeleton className="h-7 w-28 rounded-lg" />
              <Skeleton className="h-7 w-20 rounded-lg" />
            </div>
            <Skeleton className="h-[38px] w-4/5" />
          </div>

          <SkeletonCard>
            <div className="flex items-end justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 w-32" />
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-7 w-24" />
              </div>
            </div>
            {/* On phones the bid form lives in the fixed bottom bar instead. */}
            <Skeleton className="mt-5 hidden h-13 w-full rounded-2xl lg:block" />
          </SkeletonCard>

          <Skeleton className="h-12 w-full rounded-2xl" />

          <div className="flex gap-2">
            <Skeleton className="h-11 flex-1 rounded-2xl" />
            <Skeleton className="h-11 flex-1 rounded-2xl" />
          </div>
        </div>
      </div>

      <div className={DETAIL_GRID}>
        <div className="flex min-w-0 flex-col gap-4">
          <SkeletonCard>
            <Skeleton className="mb-3 h-7 w-32" />
            <SkeletonParagraph lines={3} />
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-5 w-24" />
                </div>
              ))}
            </div>
          </SkeletonCard>

          <SkeletonCard>
            <Skeleton className="mb-3 h-7 w-24" />
            <SkeletonBidRows />
          </SkeletonCard>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <SkeletonCard>
            <div className="flex items-center gap-3">
              <Skeleton className="h-14 w-14 rounded-2xl" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
            <Skeleton className="mt-4 h-2 w-full rounded-full" />
          </SkeletonCard>

          <SkeletonCard>
            <Skeleton className="mb-3 h-5 w-20" />
            <SkeletonPersonRow />
          </SkeletonCard>
        </div>
      </div>

      {/* The "more like this" rail the loaded page ends on. */}
      <div className="mt-6 sm:mt-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
        <div className="-mx-4 flex gap-3 overflow-hidden px-4 pb-1 sm:mx-0 sm:gap-4 sm:px-0">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="w-40 shrink-0 sm:w-52">
              <SkeletonAuctionCard />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Full `/cauze/[slug]` page: hero, story, verification, its auctions. */
export function SkeletonCauseDetail() {
  return (
    <div
      role="status"
      aria-label="Se încarcă"
      className="flex flex-col gap-8 sm:gap-10"
    >
      <Skeleton className="-mb-4 h-5 w-64 sm:-mb-6" />

      <section className="grid gap-5 lg:grid-cols-2 lg:gap-8">
        <div className="min-w-0">
          <Skeleton className="aspect-4/3 w-full rounded-3xl" />
          <div className="mt-2 flex gap-2.5 py-1">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton
                key={index}
                className="h-16 w-16 shrink-0 rounded-xl sm:h-20 sm:w-20"
              />
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-col">
          <Skeleton className="h-[30px] w-4/5 sm:h-[45px]" />
          <Skeleton className="mt-2.5 h-6 w-full" />
          <div className="mt-6 flex items-baseline justify-between gap-3">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-7 w-12" />
          </div>
          <Skeleton className="mt-3 h-2.5 w-full rounded-full" />
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            {["w-36", "w-28", "w-28"].map((width, index) => (
              <Skeleton key={index} className={cn("h-[23px]", width)} />
            ))}
          </div>
          <Skeleton className="mt-6 h-13 w-full rounded-2xl" />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-8">
        <section className="min-w-0">
          <Skeleton className="mb-3 h-7 w-40" />
          <SkeletonParagraph lines={5} />
        </section>

        <div className="flex min-w-0 flex-col gap-4">
          <SkeletonCard>
            <Skeleton className="mb-3 h-6 w-36" />
            <div className="flex flex-col gap-2.5">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex justify-between gap-3">
                  <Skeleton className="h-[23px] w-24" />
                  <Skeleton className="h-[23px] w-28" />
                </div>
              ))}
            </div>
            <Skeleton className="mt-3 h-5 w-36" />
          </SkeletonCard>

          <SkeletonCard>
            <Skeleton className="mb-3 h-5 w-24" />
            <SkeletonPersonRow />
          </SkeletonCard>
        </div>
      </div>

      <section>
        <Skeleton className="mb-4 h-8 w-56" />
        <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <Skeleton className="h-11 w-full rounded-2xl sm:w-72" />
        </div>
        <SkeletonGrid count={4} />
      </section>
    </div>
  );
}

/** Full `/produse/[id]` page: gallery, price card, cause and seller, blocks. */
export function SkeletonProductDetail() {
  return (
    <div role="status" aria-label="Se încarcă" className="flex flex-col gap-4">
      <Skeleton className="h-5 w-64" />

      <div className={DETAIL_GRID}>
        <div className="flex min-w-0 flex-col gap-3">
          <Skeleton className="aspect-4/3 w-full rounded-3xl" />
          <div className="flex gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-20 rounded-2xl" />
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div>
            <div className="mb-2 flex gap-2">
              <Skeleton className="h-7 w-32 rounded-lg" />
              <Skeleton className="h-7 w-24 rounded-lg" />
            </div>
            <Skeleton className="h-[38px] w-4/5" />
          </div>

          <SkeletonCard>
            <div className="flex items-end justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 w-32" />
              </div>
              <Skeleton className="h-7 w-24 rounded-lg" />
            </div>
            <Skeleton className="mt-5 h-13 w-full rounded-2xl" />
          </SkeletonCard>

          <SkeletonCard className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 shrink-0 rounded-md" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-2/3" />
            </div>
          </SkeletonCard>

          <SkeletonCard>
            <Skeleton className="mb-3 h-5 w-20" />
            <SkeletonPersonRow />
          </SkeletonCard>
        </div>
      </div>

      <div className={DETAIL_GRID}>
        <SkeletonCard>
          <Skeleton className="mb-3 h-7 w-32" />
          <SkeletonParagraph lines={4} />
        </SkeletonCard>

        <SkeletonCard>
          <Skeleton className="mb-3 h-7 w-24" />
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex justify-between gap-3">
                <Skeleton className="h-[23px] w-24" />
                <Skeleton className="h-[23px] w-28" />
              </div>
            ))}
          </div>
        </SkeletonCard>
      </div>
    </div>
  );
}

/** Full `/profil/[username]` page: header, three stats, a grid of listings. */
export function SkeletonProfile() {
  return (
    <div
      role="status"
      aria-label="Se încarcă"
      className="flex flex-col gap-6 sm:gap-8"
    >
      <Skeleton className="h-5 w-48" />

      <SkeletonCard className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        <Skeleton className="h-24 w-24 shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-1 h-5 w-full max-w-2xl" />
        </div>
      </SkeletonCard>

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonCard key={index} className="flex items-start gap-3">
            <Skeleton className="h-11 w-11 rounded-2xl" />
            <div className="flex-1">
              <Skeleton className="mb-2 h-8 w-24" />
              <Skeleton className="h-4 w-28" />
            </div>
          </SkeletonCard>
        ))}
      </div>

      <div>
        <Skeleton className="mb-4 h-11 w-64 rounded-2xl" />
        <SkeletonGrid count={4} />
      </div>
    </div>
  );
}

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
          className="flex items-start gap-3 rounded-3xl bg-white ring-1 ring-edge p-5"
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
