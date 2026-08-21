import type { Metadata } from "next";

import { CauseDetailView } from "./_components/CauseDetailView";

export const metadata: Metadata = {
  title: "Cauză",
  description:
    "Povestea cauzei, documentele verificate, progresul către obiectiv și licitațiile care o susțin.",
};

/**
 * TODO(backend): fetch the cause here once the API is live and pass it to the
 * client view as initial data, so the page can be server-rendered for search
 * engines and link previews.
 */
export default async function CausePage({ params }: PageProps<"/cauze/[slug]">) {
  const { slug } = await params;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <CauseDetailView slug={slug} />
    </main>
  );
}
