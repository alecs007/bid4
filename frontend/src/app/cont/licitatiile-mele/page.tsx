import type { Metadata } from "next";

import { PageTransition } from "@/components/layout/PageTransition";
import { MyBids } from "./_components/MyBids";

export const metadata: Metadata = {
  title: "Licitațiile mele",
  description: "Ofertele tale active, licitațiile câștigate și cele încheiate.",
};

export default function MyBidsPage() {
  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <MyBids />
      </main>
    </PageTransition>
  );
}
