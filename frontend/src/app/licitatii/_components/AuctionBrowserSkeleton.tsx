import { Skeleton, SkeletonGrid } from "@/components/ui";
import { PAGINATION, PRODUCT_CATEGORIES } from "@/lib/config";
import { AUCTION_STATUS } from "@/lib/labels";

/**
 * Everything `<AuctionBrowser>` renders below the page title, as placeholders.
 *
 * Used both by `loading.tsx` (the server fallback for the route) and by the
 * page's own Suspense fallback, so whichever one the router reaches for, the
 * frame on screen is the same and nothing moves when the browser takes over.
 *
 * The filter chips come from the same static config as the real ones and are
 * rendered with their labels invisible: same widths, so the rail wraps to the
 * same number of rows.
 */

function ChipGhost({ emoji, label }: { emoji?: string; label: string }) {
  return (
    <span
      aria-hidden="true"
      className="shimmer inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-ink-100 px-3 py-2 text-sm font-bold"
    >
      {emoji ? <span className="invisible">{emoji}</span> : null}
      <span className="invisible">{label}</span>
    </span>
  );
}

function FilterGroup({
  labelWidth,
  children,
}: {
  labelWidth: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Skeleton className={`mb-2.5 h-5 ${labelWidth}`} />
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function AuctionBrowserSkeleton() {
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="w-full font-display text-2xl font-extrabold text-ink-900 sm:text-3xl lg:w-auto">
          Licitații
        </h1>
        <Skeleton className="h-10 w-28 rounded-2xl lg:hidden" />
        <Skeleton className="ml-auto h-10 w-44 rounded-xl sm:w-56" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[264px_minmax(0,1fr)]">
        <aside className="hidden min-w-0 lg:block">
          <div className="sticky top-24">
            <div className="rounded-3xl bg-white ring-1 ring-edge p-5">
              <div className="flex flex-col gap-7">
                <FilterGroup labelWidth="w-20">
                  {PRODUCT_CATEGORIES.map((category) => (
                    <ChipGhost
                      key={category.id}
                      emoji={category.emoji}
                      label={category.label}
                    />
                  ))}
                </FilterGroup>

                <FilterGroup labelWidth="w-14">
                  <ChipGhost emoji="⏰" label="Sub 24h" />
                  {(["LIVE", "SCHEDULED", "SOLD", "UNSOLD"] as const).map(
                    (status) => (
                      <ChipGhost
                        key={status}
                        label={AUCTION_STATUS[status].label}
                      />
                    ),
                  )}
                </FilterGroup>

                {/* The two sliders: label and track share one 48px row. */}
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />

                <div>
                  <Skeleton className="mb-2.5 h-5 w-16" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-3 hidden h-5 sm:block">
            <Skeleton className="h-5 w-32" />
          </div>
          <SkeletonGrid count={PAGINATION.DEFAULT_PAGE_SIZE} columns={3} />
          {/* Space the pagination will occupy once the results arrive. */}
          <div className="mt-8 h-10" />
        </div>
      </div>
    </>
  );
}
