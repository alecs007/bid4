import type { Metadata } from "next";

import { EmptyState } from "@/components/ui";

export const metadata: Metadata = {
  title: "Mesaje",
  description: "Conversațiile tale despre anunțuri și comenzi.",
  robots: { index: false, follow: false },
};

/**
 * The right pane, before a thread is chosen.
 *
 * <p>Only ever seen on a desktop: on a phone this route is the list itself, and the shell hides
 * this side until there is something to show in it.
 */
export default function InboxPage() {
  return (
    <EmptyState
      title="Alege o conversație"
      description="Mesajele despre un anunț și pașii vânzării stau în același fir."
    />
  );
}
