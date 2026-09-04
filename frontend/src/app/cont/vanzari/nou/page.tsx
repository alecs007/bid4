import type { Metadata } from "next";

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
      {/* Under the header and stuck to it: the form is long enough that a title
          at the top of the page is gone by the second field, and this is the
          only thing on screen saying which of the two things a seller can start
          here they are in the middle of. */}
      <div className="sticky top-12 z-30 border-b border-line bg-white/95 py-2.5 text-center backdrop-blur-sm sm:top-14">
        <h1 className="font-display text-sm font-extrabold text-ink-900">
          Vinde un obiect
        </h1>
      </div>

      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <ListingForm />
      </main>
    </PageTransition>
  );
}
