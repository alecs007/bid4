import type { Metadata } from "next";
import { Suspense } from "react";

import { PageTransition } from "@/components/layout/PageTransition";
import { CauseBrowser } from "./_components/CauseBrowser";
import { CauseBrowserSkeleton } from "./_components/CauseBrowserSkeleton";

export const metadata: Metadata = {
  title: "Cauze verificate",
  description:
    "Fiecare cauză este verificată cu documente înainte de a apărea aici. Vezi povestea, cât s-a strâns până acum și licitațiile care o susțin.",
  keywords: ["cauze verificate", "donatii", "strangere de fonduri"],
  alternates: { canonical: "/cauze" },
  openGraph: {
    type: "website",
    url: "/cauze",
    title: "Cauze verificate | bid4",
    description: "Fiecare cauză este verificată cu documente înainte de a apărea aici. Vezi povestea, cât s-a strâns până acum și licitațiile care o susțin.",
  },
};

export default function CausesPage() {
  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <Suspense fallback={<CauseBrowserSkeleton />}>
          <CauseBrowser />
        </Suspense>
      </main>
    </PageTransition>
  );
}
