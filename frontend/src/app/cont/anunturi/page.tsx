import type { Metadata } from "next";

import { PageTransition } from "@/components/layout/PageTransition";
import { MyListings } from "./_components/MyListings";

export const metadata: Metadata = {
  title: "Anunțurile mele",
  description: "Anunțurile pe care le-ai publicat, cu starea fiecăruia.",
};

export default function MyListingsPage() {
  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <MyListings />
      </main>
    </PageTransition>
  );
}
