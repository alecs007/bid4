import type { Metadata } from "next";

import { PageTransition } from "@/components/layout/PageTransition";
import { ProductDetailView } from "./_components/ProductDetailView";

export const metadata: Metadata = {
  title: "Produs",
  description:
    "Detaliile produsului, cauza pe care o susține și licitația în care poți licita pentru el.",
};

export default async function ProductPage({ params }: PageProps<"/produse/[id]">) {
  const { id } = await params;

  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <ProductDetailView productId={id} />
      </main>
    </PageTransition>
  );
}
