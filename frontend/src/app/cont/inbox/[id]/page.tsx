import type { Metadata } from "next";

import { ThreadView } from "../_components/ThreadView";

export const metadata: Metadata = {
  title: "Conversație",
  robots: { index: false, follow: false },
};

export default async function ThreadPage({ params }: PageProps<"/cont/inbox/[id]">) {
  const { id } = await params;
  return <ThreadView key={id} conversationId={id} />;
}
