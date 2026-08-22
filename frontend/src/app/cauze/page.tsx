import type { Metadata } from "next";
import { Suspense } from "react";

import { SkeletonCauseCard } from "@/components/causes/CauseCard";
import { CauseBrowser } from "./_components/CauseBrowser";

export const metadata: Metadata = {
  title: "Cauze",
  description:
    "Cauzele verificate de pe bid4, cu documente confirmate și progres public către obiectiv.",
};

export default function CausesPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <h1 className="mb-4 font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
        Cauze
      </h1>
      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonCauseCard key={index} />
            ))}
          </div>
        }
      >
        <CauseBrowser />
      </Suspense>
    </main>
  );
}
