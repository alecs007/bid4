import { cn } from "@/lib/utils/cn";

/**
 * Skeletons mirror the real components box for box, so swapping placeholder for
 * content moves nothing. Change a layout and its skeleton changes with it.
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

/** 16px bars 10px apart plus 5px half-leading is 26px per line — what `leading-relaxed` occupies. */
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

/** Mirrors `<AuctionCard>`. */
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

/** Same grid as `<AuctionGrid>`. */
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

/** Mirrors the rows in `<BidHistory>`. */
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

/** Full `/licitatii/[id]` page. */
export function SkeletonDetail() {
  return (
    <div
      role="status"
      aria-label="Se încarcă"
      className="animate-fade-in flex flex-col gap-6"
    >
      <Skeleton className="h-5 w-64" />

      <div className="grid gap-x-12 gap-y-7 lg:grid-cols-[minmax(0,1fr)_21rem]">
        {/* title above the photographs on a desktop, under them on a phone */}
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-1">
          <div className="order-2 lg:order-1">
            <Skeleton className="h-9 w-4/5" />
            <div className="mt-2 flex gap-2">
              <Skeleton className="h-5 w-28 rounded-lg" />
              <Skeleton className="h-5 w-20 rounded-lg" />
              <Skeleton className="h-5 w-24 rounded-lg" />
            </div>
          </div>

          <div className="order-1 flex gap-3 lg:order-2">
            <div className="hidden w-16 shrink-0 flex-col gap-2 lg:flex">
              <Skeleton className="h-8 w-8 self-center rounded-xl" />
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="aspect-square w-full rounded-2xl" />
              ))}
            </div>
            <Skeleton className="aspect-4/3 min-w-0 flex-1 rounded-2xl" />
          </div>
        </div>

        {/* the one panel: clock, price, cause, bids, costs, payment */}
        <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <div className="divide-y divide-line rounded-xl bg-white ring-1 ring-edge">
            <div className="px-5 pt-4 pb-3">
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="hidden px-5 py-4 lg:block">
              <div className="flex justify-between gap-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex flex-1 flex-col items-center gap-1.5">
                    <Skeleton className="h-6 w-9" />
                    <Skeleton className="h-3 w-7" />
                  </div>
                ))}
              </div>
              <Skeleton className="mt-2.5 h-1 w-full rounded-full" />
            </div>
            <div className="px-5 py-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-8 w-32" />
              {/* the quick amounts, the field, the button and the rules link */}
              <div className="mt-4 hidden gap-2 lg:flex">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 flex-1 rounded-xl" />
                ))}
              </div>
              <Skeleton className="mt-3 hidden h-12 w-full rounded-2xl lg:block" />
              <Skeleton className="mt-2 hidden h-13 w-full rounded-2xl lg:block" />
              <Skeleton className="mt-3 hidden h-5 w-44 lg:block" />
            </div>
            <div className="flex items-center gap-3 px-5 py-4.5">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            </div>
            <div className="px-5 py-4.5">
              <Skeleton className="mb-3 h-4 w-40" />
              <SkeletonBidRows />
              {/* the "vezi toate ofertele" line the loaded panel ends on */}
              <Skeleton className="mt-1.5 h-4 w-32" />
            </div>
            <div className="px-5 py-4.5">
              <Skeleton className="mb-2.5 h-4 w-24" />
              <div className="flex flex-col gap-3">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-2/3" />
              </div>
              <Skeleton className="mt-3 h-4 w-36" />
            </div>
            <div className="px-5 py-4.5">
              <Skeleton className="mb-2 h-4 w-32" />
              <div className="flex gap-1.5">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-6 w-16 rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* description, details, seller */}
        <div className="flex min-w-0 flex-col gap-6 lg:col-start-1 lg:row-start-2">
          <div>
            <Skeleton className="mb-3 h-6 w-28" />
            <SkeletonParagraph lines={3} />
          </div>
          <div className="border-t border-line pt-5">
            <Skeleton className="mb-3 h-6 w-20" />
            <div className="grid gap-x-8 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="flex flex-col gap-2 border-b border-line py-2.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-24" />
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-line pt-5">
            <Skeleton className="mb-3 h-6 w-28" />
            <SkeletonPersonRow />
            <Skeleton className="mt-3 h-16 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

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

/** Full `/profil/[username]` page. */
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
