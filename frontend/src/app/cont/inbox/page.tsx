import type { Metadata } from "next";

import { ThreadSkeleton } from "./_components/ThreadView";

export const metadata: Metadata = {
  title: "Mesaje",
  description: "Conversațiile tale despre anunțuri și comenzi.",
  robots: { index: false, follow: false },
};

/**
 * The right pane, for the moment before a thread is chosen.
 *
 * <p>Only ever seen on a desktop: on a phone this route is the list itself, and the shell hides
 * this side until there is something to show in it.
 *
 * <p>It used to say "alege o conversație", and there is no longer such a state — the list opens
 * bid4's own thread as soon as it knows what it is, which is the one conversation every account has
 * and the only sensible thing to land on. So what stands here is the panel that is arriving, in the
 * shape it will arrive in, rather than a message telling somebody to do what is already being done.
 */
export default function InboxPage() {
  return <ThreadSkeleton className="animate-fade-in" />;
}
