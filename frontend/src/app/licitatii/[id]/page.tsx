import type { Metadata } from "next";

import { AuctionDetailView } from "./_components/AuctionDetailView";

export const metadata: Metadata = {
  title: "Licitație",
  description:
    "Licitează pentru un obiect și trimite o parte din preț către o cauză verificată.",
};

export default async function AuctionPage({ params }: PageProps<"/licitatii/[id]">) {
  const { id } = await params;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <AuctionDetailView auctionId={id} />
    </main>
  );
}
