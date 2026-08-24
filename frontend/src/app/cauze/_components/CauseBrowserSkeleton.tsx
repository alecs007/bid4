import { SkeletonCauseCard } from "@/components/causes/CauseCard";
import { Skeleton } from "@/components/ui";
import { CAUSE_CATEGORIES } from "@/lib/config";

/** How many causes the unfiltered directory holds — keeps the number of
    placeholder cards, and so the page height, level with the real thing. */
const PUBLIC_CAUSE_COUNT = 10;

/**
 * Everything `<CauseBrowser>` renders below the page title, as placeholders:
 * search field, category row, result count, grid.
 *
 * Shared by `loading.tsx` and the page's Suspense fallback so the two are
 * never different. The category chips carry their real labels with visibility
 * off, which reproduces the row's exact widths and wrapping.
 */
export function CauseBrowserSkeleton() {
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="w-full font-display text-2xl font-extrabold text-ink-900 sm:text-3xl lg:w-auto">
          Cauze
        </h1>
        <Skeleton className="ml-auto h-12 w-full rounded-2xl sm:w-72" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {CAUSE_CATEGORIES.map((category) => (
          <span
            key={category.id}
            aria-hidden="true"
            className="shimmer inline-flex items-center gap-1.5 rounded-md border border-line bg-ink-100 px-3 py-1.5 text-sm font-bold"
          >
            <span className="invisible">{category.emoji}</span>
            <span className="invisible">{category.label}</span>
          </span>
        ))}
      </div>

      <div className="mb-3 hidden h-5 sm:block">
        <Skeleton className="h-5 w-40" />
      </div>

      <div
        role="status"
        aria-label="Se încarcă"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {Array.from({ length: PUBLIC_CAUSE_COUNT }).map((_, index) => (
          <SkeletonCauseCard key={index} />
        ))}
      </div>
    </>
  );
}
