import type { Metadata } from "next";

import { PageTitle } from "@/components/layout/PageTitle";
import { PageTransition } from "@/components/layout/PageTransition";
import { ListingForm } from "./_components/ListingForm";

export const metadata: Metadata = {
  title: "Vinde un obiect",
  description:
    "Adaugi câteva fotografii, alegi prețul și cauza pe care o susții. Verificăm licitația înainte să apară public.",
  robots: { index: false, follow: false },
};

export default function NewListingPage() {
  return (
    <PageTransition>
      <PageTitle>Vinde un obiect</PageTitle>

      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <ListingForm />
      </main>
    </PageTransition>
  );
}
