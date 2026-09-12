import { PAGINATION } from "@/lib/config";
import { cn } from "@/lib/utils/cn";
import {
  CARD_BODY,
  CARD_FOOTER,
  CARD_IMPACT,
  CARD_IMPACT_MARK,
  CARD_MEDIA,
  CARD_SHELL,
  CARD_TITLE_BOX,
  CARD_TITLE_TYPE,
} from "@/components/auctions/cardChrome";

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
export function SkeletonAuctionCard({ className }: { className?: string }) {
  return (
    <div className={cn(CARD_SHELL, className)}>
      <Skeleton className={CARD_MEDIA} />
      <div className={CARD_BODY}>
        {/* Sized in `em` inside the title's own type scale, so the two bars fill
            exactly the box the real two clamped lines will occupy — at 13px on a
            phone and at 16px from `sm`, without either size written twice. */}
        <div
          className={cn(
            CARD_TITLE_TYPE,
            CARD_TITLE_BOX,
            "flex flex-col gap-[0.4em]",
          )}
        >
          <Skeleton className="h-[1.1em] w-full rounded-md" />
          <Skeleton className="h-[1.1em] w-3/5 rounded-md" />
        </div>
        <div className={CARD_IMPACT}>
          <Skeleton className={CARD_IMPACT_MARK} />
          <Skeleton className="h-[1.1em] w-2/3 rounded-md" />
        </div>
        <div className={CARD_FOOTER}>
          {/* The price is text-lg then text-2xl; the countdown stays text-xs. */}
          <Skeleton className="h-[18px] w-20 rounded-md sm:h-6" />
          <Skeleton className="h-4 w-14 rounded-md" />
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
  columns?: 3 | 4 | 5;
}) {
  return (
    <div
      role="status"
      aria-label="Se încarcă"
      className={cn(
        "grid grid-cols-2 gap-3 sm:gap-4",
        columns === 5
          ? "md:grid-cols-3 lg:grid-cols-5"
          : columns === 4
            ? "lg:grid-cols-4"
            : "md:grid-cols-3",
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

/**
 * The three tiles, at the height `<StatTiles>` actually occupies.
 *
 * <p>Shared rather than drawn twice: the profile and the listing's seller block show the same three
 * tiles, and two copies of this drifted apart once already — one of them was a single 64px bar for a
 * row that stands 110px tall.
 *
 * <p>The bars mirror `<StatTile>` line for line: a drawing, a `text-lg`/`sm:text-xl` figure on
 * `leading-none`, and a `text-xs` label a `mt-1` below it.
 */
export function SkeletonStatTiles({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-3 gap-2 sm:gap-3", className)}>
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col items-center gap-2 rounded-2xl bg-canvas px-2 py-4 ring-1 ring-edge"
        >
          <Skeleton className="h-8 w-8 rounded-xl sm:h-10 sm:w-10" />
          <div className="flex flex-col items-center">
            <Skeleton className="h-[18px] w-12 rounded-md sm:h-5" />
            <Skeleton className="mt-1 h-[15px] w-16 rounded-md" />
          </div>
        </div>
      ))}
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
            {/* The heading is text-2xl/leading-tight, text-3xl from sm — 30px
                then 38px — and the two action squares stand beside it from lg,
                which is what sets that row's height there. */}
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-[30px] w-4/5 sm:h-[38px]" />
              <div className="hidden shrink-0 gap-1 lg:flex">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-10 w-10 rounded-xl" />
              </div>
            </div>
            <div className="mt-2 flex gap-3">
              <Skeleton className="h-5 w-28 rounded-lg" />
              <Skeleton className="h-5 w-20 rounded-lg" />
              <Skeleton className="h-5 w-24 rounded-lg" />
            </div>
          </div>

          <div className="order-1 flex gap-3 lg:order-2">
            <div className="hidden w-16 shrink-0 flex-col gap-2 lg:flex">
              <Skeleton className="h-8 w-8 self-center rounded-xl" />
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="aspect-square w-full rounded-2xl"
                />
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
                  <div
                    key={index}
                    className="flex flex-1 flex-col items-center gap-1.5"
                  >
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
        {/* Every heading here is a `<Section>` title: text-lg, so 28px. */}
        <div className="flex min-w-0 flex-col gap-6 lg:col-start-1 lg:row-start-2">
          <div>
            <Skeleton className="mb-3 h-7 w-28" />
            <SkeletonParagraph lines={3} />
          </div>
          <div className="border-t border-line pt-5">
            <Skeleton className="mb-3 h-7 w-20" />
            <div className="grid gap-x-8 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-2 border-b border-line py-2.5"
                >
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-24" />
                </div>
              ))}
            </div>
          </div>
          {/* The seller: a 44px avatar beside a text-lg name over the chips that
              say where they are and who they sell as, then the three tiles. */}
          <div className="border-t border-line pt-5">
            <Skeleton className="mb-3 h-7 w-28" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="flex min-w-0 flex-1 flex-col">
                <Skeleton className="h-7 w-1/2" />
                <div className="mt-1 flex gap-1.5">
                  <Skeleton className="h-5 w-24 rounded-lg" />
                  <Skeleton className="h-5 w-28 rounded-lg" />
                </div>
              </div>
            </div>
            <SkeletonStatTiles className="mt-4" />
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
        <SkeletonGrid count={5} columns={5} />
      </section>
    </div>
  );
}

/** Full `/profil/[username]` page. */
/**
 * Mirrors `<ProfileView>` box for box.
 *
 * <p>It had drifted: three wide `Stat` cards stacked on a phone, where the page now shows the same
 * three tiles the listing page uses, three across at every width. And no floor, so the footer rode
 * up while the profile loaded and dropped again when it arrived.
 */
export function SkeletonProfile() {
  return (
    <div
      role="status"
      aria-label="Se încarcă"
      className="flex min-h-[70vh] flex-col gap-6 sm:gap-8"
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

      {/* Three across on a phone as well — the shape StatTiles renders. */}
      <SkeletonStatTiles />

      {/* No tab row: it is drawn only for a profile that has both kinds, and
          which that is cannot be known while this is on screen. */}
      <SkeletonGrid count={PAGINATION.DEFAULT_PAGE_SIZE} columns={5} />
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
