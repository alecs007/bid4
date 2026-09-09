"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Icons } from "@/components/icons";
import { EmptyState, Skeleton } from "@/components/ui";
import { listNotifications, markNotificationsRead } from "@/lib/api/inbox";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useCursorList } from "@/lib/hooks/useCursorList";
import type { Notification } from "@/lib/types";
import { formatRelativeRo } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

/**
 * The other tab: what bid4 has to say.
 *
 * <p>Each row is a pointer. The sentence is written here rather than stored, so the wording can
 * change without rewriting what people were told last month, and the destination is where the thing
 * actually happened — usually a thread.
 */
export function NotificationList() {
  const { user } = useAuth();
  const { items, error, loading, loadingMore, sentinel } = useCursorList({
    load: (cursor) => listNotifications(cursor),
    key: `inbox:notifications:${user?.id}`,
  });

  const rows = items ?? [];
  const unread = rows.some((row) => !row.read);

  // Opening the tab is reading them. A per-row "mark as read" would be a second
  // thing to do on a list whose whole purpose is to be glanced at. Not reloaded
  // afterwards: the rows are already on screen, and re-fetching to grey them out
  // would move the list under somebody mid-scroll.
  useEffect(() => {
    if (!unread) return;
    void markNotificationsRead();
  }, [unread]);

  if (loading) return <NotificationSkeleton />;

  if (error) {
    return (
      <EmptyState
        compact
        mood="sad"
        title="Nu am putut încărca notificările"
        description={error}
      />
    );
  }

  // No empty state: bid4 writes one to every account the first time it opens
  // this. See Welcome on the server.
  return (
    <>
      <ul className="flex animate-fade-in flex-col gap-1">
        {rows.map((row) => (
          <li key={row.id}>
            <Row notification={row} />
          </li>
        ))}
      </ul>
      <div ref={sentinel} aria-hidden="true" className="h-px" />
      {loadingMore ? <NotificationSkeleton rows={2} /> : null}
    </>
  );
}

function Row({ notification }: { notification: Notification }) {
  const body = (
    <>
      <span
        aria-hidden="true"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700"
      >
        <Icons.notification className="h-4.5 w-4.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-[15px] leading-snug",
            notification.read ? "text-ink-700" : "font-semibold text-ink-900",
          )}
        >
          {sentence(notification)}
        </span>
        <span className="mt-0.5 block text-xs text-ink-500">
          {formatRelativeRo(notification.createdAt)}
        </span>
      </span>
    </>
  );

  const shell = "flex items-start gap-3 rounded-2xl p-3 transition";

  return notification.deepLink ? (
    <Link href={notification.deepLink} className={cn(shell, "hover:bg-ink-50")}>
      {body}
    </Link>
  ) : (
    <div className={shell}>{body}</div>
  );
}

/**
 * The Romanian, built from the type and its values.
 *
 * <p>An unknown type is shown rather than hidden: a notification nobody can read is still a sign
 * that something happened, and swallowing it would hide the day a new one ships ahead of its copy.
 */
function sentence(notification: Notification): string {
  const value = (key: string) => notification.payload[key] ?? "";

  switch (notification.type) {
    case "MESSAGE_RECEIVED":
      return `${value("from")} ți-a scris despre „${value("listing")}”.`;
    case "OFFER_ACCEPTED":
      return `Oferta ta pentru „${value("listing")}” a fost acceptată.`;
    case "CAUSE_APPROVED":
      return `Cauza „${value("cause")}” a fost aprobată.`;
    case "WELCOME":
      return "Bun venit pe bid4! Ți-am lăsat un mesaj cu tot ce trebuie să știi.";
    default:
      return notification.type;
  }
}

function NotificationSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <ul className="flex flex-col gap-1">
      {Array.from({ length: rows }).map((_, index) => (
        <li key={index} className="flex items-start gap-3 p-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
          {/* The sentence and its timestamp, at the height they actually are:
              one line of sentence on a desktop and two on a phone, where these
              wrap. A skeleton that is one line everywhere is right on one
              breakpoint and twenty pixels short on the other. */}
          <span className="flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="mt-1 h-4 w-1/2 sm:hidden" />
            <Skeleton className="mt-1.5 h-4 w-24" />
          </span>
        </li>
      ))}
    </ul>
  );
}
