import { PageTransition } from "@/components/layout/PageTransition";
import { InboxShell } from "./_components/InboxShell";

export default function InboxLayout({
  children,
}: LayoutProps<"/cont/inbox">) {
  return (
    <PageTransition>
      <main>
        <InboxShell>{children}</InboxShell>
      </main>
    </PageTransition>
  );
}
