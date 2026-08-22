import type { Metadata } from "next";
import { Suspense } from "react";

import { PageTransition } from "@/components/layout/PageTransition";
import { CauseBrowser } from "./_components/CauseBrowser";
import { CauseBrowserSkeleton } from "./_components/CauseBrowserSkeleton";

export const metadata: Metadata = {
  title: "Cauze",
  description:
    "Cauzele verificate de pe bid4, cu documente confirmate și progres public către obiectiv.",
};

export default function CausesPage() {
  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <h1 className="mb-4 font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
          Cauze
        </h1>
        <Suspense fallback={<CauseBrowserSkeleton />}>
          <CauseBrowser />
        </Suspense>
      </main>
    </PageTransition>
  );
}
