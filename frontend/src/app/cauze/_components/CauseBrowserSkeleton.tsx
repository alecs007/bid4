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
    <div className="flex flex-col gap-6">
      <Skeleton className="h-12 w-full max-w-lg rounded-2xl" />

      <div className="flex flex-wrap gap-2">
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

      <Skeleton className="h-5 w-40" />

      <div
        role="status"
        aria-label="Se încarcă"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {Array.from({ length: PUBLIC_CAUSE_COUNT }).map((_, index) => (
          <SkeletonCauseCard key={index} />
        ))}
      </div>
    </div>
  );
}
