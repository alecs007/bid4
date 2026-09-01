import type { Metadata } from "next";
import { Suspense } from "react";

import { PageTransition } from "@/components/layout/PageTransition";
import { SkeletonGrid } from "@/components/ui";
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

export default function SearchPage() {
  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <Suspense fallback={<SkeletonGrid count={6} columns={3} />}>
          <SearchResults />
        </Suspense>
      </main>
    </PageTransition>
  );
}
