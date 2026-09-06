import { Skeleton, SkeletonGrid } from "@/components/ui";
import { PAGINATION, AUCTION_CATEGORIES } from "@/lib/config";
import { ITEM_CONDITION } from "@/lib/labels";

/**
 * Used by `loading.tsx` and by the page's own Suspense fallback, so whichever the
 * router reaches for, nothing moves when the browser takes over. The filter chips
 * come from the same config, rendered with their labels invisible: same widths,
 * so the rail wraps to the same number of rows.
 */

function ChipGhost({ icon, label }: { icon?: boolean; label: string }) {
  return (
    <span
      aria-hidden="true"
      className="shimmer inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-ink-100 px-3 py-2 text-sm font-bold"
    >
      {icon ? <span className="h-4 w-4 shrink-0" /> : null}
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
      <div className="grid gap-8 lg:grid-cols-[264px_minmax(0,1fr)]">
        <aside className="hidden min-w-0 lg:block">
          <div className="sticky top-18">
            <div className="rounded-3xl bg-white ring-1 ring-edge p-5">
              <div className="mb-5 flex items-center justify-between gap-2 border-b border-line pb-2">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
              <div className="flex flex-col gap-7">
                <div>
                  <Skeleton className="mb-2.5 h-5 w-16" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>

                <FilterGroup labelWidth="w-20">
                  {AUCTION_CATEGORIES.map((category) => (
                    <ChipGhost key={category.id} icon label={category.label} />
                  ))}
                </FilterGroup>

                {/* Same order as the real panel, and the same labels: the two
                    have drifted before, and a skeleton that reflows on load is
                    worse than none. */}
                <FilterGroup labelWidth="w-14">
                  {(
                    ["NEW", "LIKE_NEW", "VERY_GOOD", "GOOD", "USED"] as const
                  ).map((condition) => (
                    <ChipGhost
                      key={condition}
                      label={ITEM_CONDITION[condition]}
                    />
                  ))}
                </FilterGroup>

                {/* The two sliders: label and track share one 48px row. */}
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
              Licitații
            </h1>
            <div className="flex shrink-0 items-center gap-2">
              <Skeleton className="h-10 w-10 rounded-xl lg:hidden" />
              <Skeleton className="h-10 w-40 rounded-xl sm:w-56" />
            </div>
          </div>

          <div className="mb-3 h-5">
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
