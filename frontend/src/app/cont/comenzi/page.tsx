import type { Metadata } from "next";

import { PageTransition } from "@/components/layout/PageTransition";

import { MyOrders } from "./_components/MyOrders";

export const metadata: Metadata = {
  title: "Comenzile mele",
  description: "Comenzile tale, ca vânzător și ca cumpărător.",
  robots: { index: false, follow: false },
};

/**
 * Everything the conversation deliberately leaves out.
 *
 * <p>The thread is the story of a sale, written for whoever is reading it. This is the record:
 * the full address, the whole fee breakdown, every document, the courier's history, and what each
 * party agreed to and when. Somebody comes here when they need to prove something, not when they
 * want to know what happened next.
 */
export default function OrdersPage() {
  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <MyOrders />
      </main>
    </PageTransition>
  );
}
