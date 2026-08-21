import type { Metadata } from "next";
import { Suspense } from "react";

import { SkeletonGrid } from "@/components/ui";
import { AuctionBrowser } from "./_components/AuctionBrowser";

export const metadata: Metadata = {
  title: "Licitații",
  description:
    "Licitații active pe bid4, filtrate după categorie, cauză, preț și cât din preț ajunge la cauză.",
};

export default function AuctionsPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <h1 className="mb-4 font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
        Licitații
      </h1>

      {/* useSearchParams needs a boundary; the grid skeleton is the fallback. */}
      <Suspense fallback={<SkeletonGrid count={9} />}>
        <AuctionBrowser />
      </Suspense>
    </main>
  );
}
