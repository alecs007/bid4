import type { Metadata } from "next";

import { PageTransition } from "@/components/layout/PageTransition";

import { OrderDetail } from "./_components/OrderDetail";

export const metadata: Metadata = {
  title: "Detaliile comenzii",
  description: "Parcursul, sumele, documentele și istoricul unei comenzi.",
  robots: { index: false, follow: false },
};

/**
 * One sale, in full.
 *
 * <p>Reachable from the conversation and from the list, by either party. The list answers "which
 * of my orders is this"; this page answers everything else, and is what somebody opens when they
 * need to prove something rather than when they want to know what happens next.
 */
export default async function OrderPage({
  params,
}: PageProps<"/cont/comenzi/[id]">) {
  const { id } = await params;

  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <OrderDetail orderId={id} />
      </main>
    </PageTransition>
  );
}
