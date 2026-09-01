import type { Metadata } from "next";
import { Suspense } from "react";

import { PageTransition } from "@/components/layout/PageTransition";
import { Skeleton, SkeletonGrid } from "@/components/ui";
import { SearchResults } from "./_components/SearchResults";

/**
 * A results page has nothing an index should keep: the content is somebody else's query, and every
 * term is a separate URL saying the same few things.
 */
export const metadata: Metadata = {
  title: "Căutare",
  description:
    "Caută în licitațiile deschise, în cauzele verificate și printre membrii bid4.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/cautare" },
};

/**
 * The whole page held still while the term is read off the URL.
 *
 * <p>A bare grid was the fallback before, and a three-column one at that: the page opened on six
 * cards the width of a cause card, then replaced them with twelve the width of an auction card,
 * under a heading and a tab row that had not been there a moment earlier. Every box below is the
 * one SearchResults puts in its place.
 */
function SearchSkeleton() {
  return (
    <div className="flex min-h-[70vh] flex-col gap-5">
      {/* The heading's own line box: text-2xl is 32px tall, text-3xl from sm is 36. */}
      <Skeleton className="h-8 w-64 max-w-full rounded-xl sm:h-9 sm:w-96" />

      {/* The three bubbles at the width their labels come to before a count has
          landed, which is the state they arrive in. */}
      <div className="flex gap-1">
        <Skeleton className="h-[38.5px] w-[112px] rounded-full" />
        <Skeleton className="h-[38.5px] w-[101px] rounded-full" />
        <Skeleton className="h-[38.5px] w-[112px] rounded-full" />
      </div>

      <SkeletonGrid count={12} columns={4} />
    </div>
  );
}

export default function SearchPage() {
  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <Suspense fallback={<SearchSkeleton />}>
          <SearchResults />
        </Suspense>
      </main>
    </PageTransition>
  );
}
