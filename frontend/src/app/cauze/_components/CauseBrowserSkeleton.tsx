import { SkeletonCauseCard } from "@/components/causes/CauseCard";
import { Skeleton } from "@/components/ui";
import { Icons } from "@/components/icons";
import { CAUSE_CATEGORIES } from "@/lib/config";

const PUBLIC_CAUSE_COUNT = 10;

export function CauseBrowserSkeleton() {
  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <h1 className="font-display flex items-center gap-2 text-2xl font-extrabold text-ink-900 sm:text-3xl">
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-600 text-white sm:h-6 sm:w-6">
            <Icons.check
              aria-hidden="true"
              strokeWidth={4}
              className="h-3 w-3 sm:h-4 sm:w-4"
            />
          </span>
          Cauze verificate
        </h1>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {CAUSE_CATEGORIES.map((category) => (
          <span
            key={category.id}
            aria-hidden="true"
            className="shimmer inline-flex items-center gap-1.5 rounded-md border border-line bg-ink-100 px-3 py-1.5 text-sm font-bold"
          >
            <span className="h-4 w-4 shrink-0" />
            <span className="invisible">{category.label}</span>
          </span>
        ))}
      </div>

      <div className="mb-3 h-5">
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
