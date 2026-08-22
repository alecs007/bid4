import type { Metadata } from "next";

import { CauseDetailView } from "./_components/CauseDetailView";

export const metadata: Metadata = {
  title: "Cauză",
  description:
    "Povestea cauzei, documentele verificate, progresul către obiectiv și licitațiile care o susțin.",
};

export default async function CausePage({ params }: PageProps<"/cauze/[slug]">) {
  const { slug } = await params;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <CauseDetailView slug={slug} />
    </main>
  );
}
