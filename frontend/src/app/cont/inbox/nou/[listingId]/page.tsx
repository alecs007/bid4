import type { Metadata } from "next";

import { DraftThread } from "../../_components/DraftThread";

export const metadata: Metadata = {
  title: "Mesaj nou",
  robots: { index: false, follow: false },
};

export default async function DraftThreadPage({
  params,
}: PageProps<"/cont/inbox/nou/[listingId]">) {
  const { listingId } = await params;
  return <DraftThread listingId={listingId} />;
}
