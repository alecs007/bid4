"use client";

import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils/cn";

import { ConversationList } from "./ConversationList";
import { InboxTabs } from "./InboxTabs";

const DESKTOP_FRAME = "lg:h-[calc(100dvh-10.5rem)] lg:min-h-[32rem]";
export function InboxShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const onNotifications = pathname.startsWith("/cont/inbox/notificari");
  const threadOpen = !onNotifications && pathname !== "/cont/inbox";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <InboxTabs className={threadOpen ? "hidden" : undefined} />

      {onNotifications ? (
        <div
          className={cn(
            "min-h-[60vh]",
            DESKTOP_FRAME,
            "lg:overflow-x-hidden lg:overflow-y-auto lg:px-px",
          )}
        >
          {children}
        </div>
      ) : (
        <div className={cn("lg:grid lg:grid-cols-[20rem_1fr] lg:gap-4", DESKTOP_FRAME)}>
          <div
            className={cn(
              "lg:h-full lg:overflow-x-hidden lg:overflow-y-auto lg:px-px",
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
