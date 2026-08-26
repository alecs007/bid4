import { Skeleton, SkeletonGrid } from "@/components/ui";
import { PAGINATION, PRODUCT_CATEGORIES } from "@/lib/config";

/**
 * Shared by the route's Suspense fallback so the frame never changes. The category
 * chips are the real ones with their labels hidden, which keeps the row's wrapping.
 */
export function ProductBrowserSkeleton() {
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="w-full font-display text-2xl font-extrabold text-ink-900 sm:text-3xl lg:w-auto">
          Produse
        </h1>
        <Skeleton className="ml-auto h-12 w-full rounded-2xl sm:w-72" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {PRODUCT_CATEGORIES.map((category) => (
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
        <Skeleton className="h-5 w-32" />
      </div>

      <SkeletonGrid count={PAGINATION.DEFAULT_PAGE_SIZE} columns={4} />
      {/* Space the pagination will occupy once the results arrive. */}
      <div className="mt-8 h-10" />
    </>
  );
}
