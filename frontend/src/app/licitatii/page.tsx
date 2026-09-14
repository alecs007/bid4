import type { Metadata } from "next";
import { Suspense } from "react";

import { PageTransition } from "@/components/layout/PageTransition";
import { AuctionBrowser } from "./_components/AuctionBrowser";
import { AuctionBrowserSkeleton } from "./_components/AuctionBrowserSkeleton";

export const metadata: Metadata = {
  title: "Licitații în desfășurare",
  description:
    "Toate licitațiile deschise acum. Filtrezi după categorie, cauză sau preț și vezi din start cât din ofertă ajunge la cauză.",
  keywords: ["licitatii online", "licitatii active", "obiecte second hand"],
  alternates: { canonical: "/licitatii" },
  openGraph: {
    type: "website",
    url: "/licitatii",
    title: "Licitații în desfășurare | bid4",
    description: "Toate licitațiile deschise acum. Filtrezi după categorie, cauză sau preț și vezi din start cât din ofertă ajunge la cauză.",
  },
};

export default function AuctionsPage() {
  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <Suspense fallback={<AuctionBrowserSkeleton />}>
          <AuctionBrowser />
        </Suspense>
      </main>
    </PageTransition>
  );
}
