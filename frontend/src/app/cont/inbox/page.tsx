import type { Metadata } from "next";

import { ThreadSkeleton } from "./_components/ThreadView";

export const metadata: Metadata = {
  title: "Mesaje",
  description: "Conversațiile tale despre anunțuri și comenzi.",
  robots: { index: false, follow: false },
};

export default function InboxPage() {
  return <ThreadSkeleton className="animate-fade-in" />;
}
