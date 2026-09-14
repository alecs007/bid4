"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useSWRConfig } from "swr";

import { Icons } from "@/components/icons";
import {
  Bid4Icon,
  CrossFade,
  EmptyState,
  LoadMore,
  rowDelay,
  Skeleton,
} from "@/components/ui";
import { listNotifications, markNotificationsRead } from "@/lib/api/inbox";
import { unreadKey, withNotificationsRead } from "@/lib/api/inbox-sync";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useCursorList } from "@/lib/hooks/useCursorList";
import type { Notification } from "@/lib/types";
import { formatTimeRo } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

export function NotificationList() {
  const { user } = useAuth();
  const { mutate } = useSWRConfig();
  const { items, error, loading, loadingMore, hasMore, loadMore } =
    useCursorList({
      load: (cursor) => listNotifications(cursor),
      key: `inbox:notifications:${user?.id}`,
    });

  const rows = items ?? [];
  const unread = rows.some((row) => !row.read);

  useEffect(() => {
    if (!unread) return;
    void mutate(unreadKey(user?.id), withNotificationsRead, {
      revalidate: false,
    });
    void markNotificationsRead().then(() => {
      void mutate(unreadKey(user?.id));
    });
  }, [unread, mutate, user?.id]);

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

  return (
    <CrossFade ready={!loading} placeholder={<NotificationSkeleton />}>
      <div className="flex flex-col gap-5">
        {groupByDay(rows).map((group) => (
          <section key={group.label}>
            <h2 className="mb-2 px-1 text-xs font-semibold text-ink-500">
              {group.label}
            </h2>
            <ul className="flex flex-col gap-2">
              {group.rows.map((row, index) => (
                <li
                  key={row.id}
                  className="animate-fade-up"
                  style={rowDelay(group.offset + index)}
                >
                  <Row notification={row} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <LoadMore
        hasMore={hasMore}
        loading={loadingMore}
        onReach={loadMore}
        waiting={<NotificationSkeleton rows={2} heading={false} />}
      />
    </CrossFade>
  );
}

function Row({ notification }: { notification: Notification }) {
  const { Mark, tint } = markFor(notification.type);

  const body = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-edge",
          tint,
        )}
      >
        <Mark />
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
          {formatTimeRo(notification.createdAt)}
        </span>
      </span>

      {notification.read ? null : (
        <span
          aria-label="Necitită"
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-600"
        />
      )}
    </>
  );

  const shell =
    "flex items-start gap-3 rounded-2xl bg-white p-3 ring-1 ring-edge transition";

  return notification.deepLink ? (
    <Link
      href={notification.deepLink}
      className={cn(shell, "hover:ring-ink-300")}
    >
      {body}
    </Link>
  ) : (
    <div className={shell}>{body}</div>
  );
}

function markFor(type: string): {
  Mark: () => React.ReactElement;
  tint: string;
} {
  const glyph = (Icon: (typeof Icons)[keyof typeof Icons], tone: string) => ({
    Mark: () => <Icon className={cn("h-4.5 w-4.5", tone)} />,
  });

  switch (type) {
    case "MESSAGE_RECEIVED":
      return { ...glyph(Icons.inbox, "text-sky-700"), tint: "bg-sky-50" };
    case "OFFER_ACCEPTED":
      return {
        ...glyph(Icons.auction, "text-primary-700"),
        tint: "bg-primary-50",
      };
    case "CAUSE_APPROVED":
      return { ...glyph(Icons.cause, "text-accent-700"), tint: "bg-accent-50" };
    case "WELCOME":
      return { Mark: () => <Bid4Icon size={20} />, tint: "bg-primary-50/50" };
    default:
      return {
        ...glyph(Icons.notification, "text-ink-500"),
        tint: "bg-ink-50",
      };
  }
}

function groupByDay(rows: Notification[]): {
  label: string;
  offset: number;
  rows: Notification[];
}[] {
  const groups: { label: string; offset: number; rows: Notification[] }[] = [];

  rows.forEach((row, index) => {
    const label = dayLabel(row.createdAt);
    const last = groups.at(-1);
    if (last?.label === label) last.rows.push(row);
    else groups.push({ label, offset: index, rows: [row] });
  });

  return groups;
}

function dayLabel(value: string): string {
  const date = new Date(value);
  const midnight = (at: Date) =>
    new Date(at.getFullYear(), at.getMonth(), at.getDate()).getTime();

  const days = Math.round(
    (midnight(new Date()) - midnight(date)) / 86_400_000,
  );
  if (days <= 0) return "Astăzi";
  if (days === 1) return "Ieri";

  return date.toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    ...(date.getFullYear() === new Date().getFullYear()
      ? {}
      : { year: "numeric" }),
  });
}

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

function NotificationSkeleton({
  rows = 5,
  heading = true,
}: {
  rows?: number;
  heading?: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      <section>
        {heading ? <Skeleton className="mb-2 ml-1 h-4 w-20" /> : null}
        <ul className="flex flex-col gap-2">
          {Array.from({ length: rows }).map((_, index) => (
            <li
              key={index}
              className="flex items-start gap-3 rounded-2xl bg-white p-3 ring-1 ring-edge"
            >
              <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
              <span className="min-w-0 flex-1">
                <Skeleton className="h-[21px] w-3/4" />
                <Skeleton className="mt-1 h-[21px] w-1/2 sm:hidden" />
                <Skeleton className="mt-0.5 h-4 w-10" />
              </span>
              <Skeleton className="mt-1.5 h-2 w-2 shrink-0 rounded-full" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
