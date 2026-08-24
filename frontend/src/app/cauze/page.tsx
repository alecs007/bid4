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
        {/* The title lives in the browser so it can share a row with the
            search field; the skeleton renders the same heading. */}
        <Suspense fallback={<CauseBrowserSkeleton />}>
          <CauseBrowser />
        </Suspense>
      </main>
    </PageTransition>
  );
}
