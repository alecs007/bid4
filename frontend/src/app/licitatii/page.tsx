import type { Metadata } from "next";
import { Suspense } from "react";

import { PageTransition } from "@/components/layout/PageTransition";
import { AuctionBrowser } from "./_components/AuctionBrowser";
import { AuctionBrowserSkeleton } from "./_components/AuctionBrowserSkeleton";

export const metadata: Metadata = {
  title: "Licitații",
  description:
    "Licitații active pe bid4, filtrate după categorie, cauză, preț și cât din preț ajunge la cauză.",
};

export default function AuctionsPage() {
  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        {/* The title lives in the browser, so it can share a row with the sort control. */}
        <Suspense fallback={<AuctionBrowserSkeleton />}>
          <AuctionBrowser />
        </Suspense>
      </main>
    </PageTransition>
  );
}
