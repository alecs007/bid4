import type { Metadata } from "next";
import { Suspense } from "react";

import { PageTransition } from "@/components/layout/PageTransition";
import { Skeleton, SkeletonGrid } from "@/components/ui";
import { PAGINATION } from "@/lib/config";
import { SearchResults } from "./_components/SearchResults";

export const metadata: Metadata = {
  title: "Căutare",
  description:
    "Caută în licitațiile deschise, în cauzele verificate și printre membrii bid4.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/cautare" },
};

function SearchSkeleton() {
  return (
    <div className="flex min-h-[70vh] flex-col gap-5">
      <Skeleton className="h-8 w-64 max-w-full rounded-xl sm:h-9 sm:w-96" />

      <div className="flex gap-1">
        <Skeleton className="h-[38.5px] w-[112px] rounded-full" />
        <Skeleton className="h-[38.5px] w-[101px] rounded-full" />
        <Skeleton className="h-[38.5px] w-[112px] rounded-full" />
      </div>

      <SkeletonGrid count={PAGINATION.DEFAULT_PAGE_SIZE} columns={5} />
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
