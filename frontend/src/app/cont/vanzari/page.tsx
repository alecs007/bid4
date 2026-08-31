import type { Metadata } from "next";

import { PageTransition } from "@/components/layout/PageTransition";
import { MySales } from "./_components/MySales";

export const metadata: Metadata = {
  title: "Vânzările mele",
  description: "Ce ai pus la licitație, cu starea fiecărei vânzări.",
  robots: { index: false, follow: false },
};

export default function MySalesPage() {
  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <MySales />
      </main>
    </PageTransition>
  );
}
