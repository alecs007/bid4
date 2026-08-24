import type { Metadata } from "next";
import { Suspense } from "react";

import { PageTransition } from "@/components/layout/PageTransition";
import { ProductBrowser } from "./_components/ProductBrowser";
import { ProductBrowserSkeleton } from "./_components/ProductBrowserSkeleton";

export const metadata: Metadata = {
  title: "Produse",
  description:
    "Catalogul bid4: obiecte listate pentru cauze verificate, de la modă și electronice la artă și colecții.",
};

export default function ProductsPage() {
  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <Suspense fallback={<ProductBrowserSkeleton />}>
          <ProductBrowser />
        </Suspense>
      </main>
    </PageTransition>
  );
}
