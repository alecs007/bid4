"use client";

import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils/cn";

import { ConversationList } from "./ConversationList";
import { InboxTabs } from "./InboxTabs";

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
 *
 * <p>One height, whatever is in it. The panes are sized from the viewport rather than from their
 * contents, so an inbox with two conversations is the same shape as one with forty and opening a
 * short thread after a long one does not resize the page under the reader. On a phone it is a floor
 * rather than a fixed height — there the page scrolls as a page, and only the emptiest states
 * needed rescuing from being a strip.
 */

/** Header, tabs and the page's own padding, taken off the viewport. */
const DESKTOP_FRAME = "lg:h-[calc(100dvh-10.5rem)] lg:min-h-[32rem]";
export function InboxShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const onNotifications = pathname.startsWith("/cont/inbox/notificari");
  // Anything below /cont/inbox that is not the notifications tab is a thread.
  const threadOpen = !onNotifications && pathname !== "/cont/inbox";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      {/* Inside a conversation on a phone there is nothing to switch between —
          the thread fills the screen and the way back is its own header. */}
      <InboxTabs className={threadOpen ? "hidden" : undefined} />

      {onNotifications ? (
        <div className={cn("min-h-[60vh]", DESKTOP_FRAME, "lg:overflow-y-auto")}>
          {children}
        </div>
      ) : (
        <div className={cn("lg:grid lg:grid-cols-[20rem_1fr] lg:gap-4", DESKTOP_FRAME)}>
          <div
            className={cn(
              // Its own scroll on a desktop, so reading a long thread does not
              // carry the list away with it.
              "lg:h-full lg:overflow-y-auto",
              threadOpen ? "hidden lg:block" : "block min-h-[60vh] lg:min-h-0",
            )}
            data-lenis-prevent
          >
            <ConversationList />
          </div>

          <div
            className={cn(
              "min-h-[60vh] lg:h-full lg:min-h-0",
              threadOpen ? "block" : "hidden lg:block",
            )}
          >
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
