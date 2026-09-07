"use client";

import { usePathname } from "next/navigation";

import { NavTabs } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

import { ConversationList } from "./ConversationList";

/**
 * Two panes on a desktop, one at a time on a phone.
 *
 * <p>A conversation is read beside the list it came from — losing sight of the other threads to
 * read one of them is what makes an inbox feel like a stack of pages rather than a place. There is
 * no room for that on a phone, so there the list and the thread take turns, and which one is
 * showing is decided by the route rather than by state: a thread has its own URL, so the back
 * button does what it looks like it does.
 *
 * <p>Notifications are one column. They are a list of pointers to other places, so there is no
 * second pane for them to open into.
 */
export function InboxShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const onNotifications = pathname.startsWith("/cont/inbox/notificari");
  // Anything below /cont/inbox that is not the notifications tab is a thread.
  const threadOpen = !onNotifications && pathname !== "/cont/inbox";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <NavTabs
        ariaLabel="Inbox"
        className="mb-4"
        items={[
          { href: "/cont/inbox", label: "Mesaje" },
          { href: "/cont/inbox/notificari", label: "Notificări" },
        ]}
      />

      {onNotifications ? (
        children
      ) : (
        <div className="lg:grid lg:grid-cols-[20rem_1fr] lg:gap-4">
          <div
            className={cn(
              // Its own scroll on a desktop, pinned under the header, so
              // reading a long thread does not carry the list away with it.
              "lg:sticky lg:top-16 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto",
              threadOpen ? "hidden lg:block" : "block",
            )}
            data-lenis-prevent
          >
            <ConversationList />
          </div>

          <div className={cn(threadOpen ? "block" : "hidden lg:block")}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
