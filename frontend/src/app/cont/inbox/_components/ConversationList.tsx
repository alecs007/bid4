"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { Icons } from "@/components/icons";
import {
  Avatar,
  Bid4Icon,
  CrossFade,
  EmptyState,
  FadeImage,
  LoadMore,
  rowDelay,
  Skeleton,
} from "@/components/ui";
import { listConversations } from "@/lib/api/inbox";
import { lastOpenThread, useInboxRevision } from "@/lib/api/inbox-sync";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useIsPhone } from "@/lib/hooks/useBreakpoint";
import { useCursorList } from "@/lib/hooks/useCursorList";
import type { Conversation } from "@/lib/types";
import { formatRelativeRo } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

import { stepMark, stepTitle } from "./EventCard";

/**
 * Every thread this account is in, newest activity first.
 *
 * <p>One line of the last message, whoever wrote it. Which of the two people it was matters less
 * than what it said — the row is scanned for whether anything is waiting, and the unread mark
 * answers that better than a name would.
 */
export function ConversationList() {
  const { user } = useAuth();
  const params = useParams<{ id?: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const phone = useIsPhone();

  // Re-read when the inbox says something changed — a thread marked read, a
  // message arriving. This list is cursor-paged rather than held in SWR, so a
  // `mutate` elsewhere never reached it: the bar's badge cleared and the row it
  // belonged to went on claiming three unread until something unrelated
  // happened to refetch.
  const revision = useInboxRevision();

  const { items, error, loading, loadingMore, hasMore, loadMore } = useCursorList({
    load: (cursor) => listConversations(cursor),
    key: `inbox:conversations:${user?.id}`,
    revision,
  });

  /**
   * On a desktop, the right pane opens on a thread rather than on a prompt.
   *
   * <p>The one they were last reading, if it is still in the list — glancing at another page and
   * coming back should not put somebody mid-negotiation back at bid4's greeting. Otherwise the
   * first row, which is that greeting: the server pins it there and so does the mock, so this is
   * not "whatever happened to be top".
   *
   * <p>Checked against the rows rather than trusted: the remembered id is only ever used to pick
   * between conversations the server has just confirmed this account is in.
   *
   * <p>Replace rather than push: `/cont/inbox` is a pane that was never read, and leaving it in the
   * history would make Back look broken. Not on a phone, where this route *is* the list and opening
   * a thread over it would put the reader somewhere they did not ask to be.
   */
  useEffect(() => {
    if (phone || pathname !== "/cont/inbox" || !items?.length) return;
    const remembered = lastOpenThread();
    const open = items.find((row) => row.id === remembered) ?? items[0];
    if (open) router.replace(`/cont/inbox/${open.id}`);
  }, [phone, pathname, items, router]);

  if (error) {
    return (
      <EmptyState
        compact
        mood="sad"
        title="Nu am putut încărca mesajele"
        description={error}
      />
    );
  }

  // No empty state: bid4 writes to every account the first time it opens this,
  // so there is always at least the greeting to show. See Welcome on the server.
  const rows = items ?? [];

  return (
    <CrossFade ready={!loading} placeholder={<ListSkeleton />}>
      <ul className="flex flex-col gap-1">
        {rows.map((conversation, index) => (
          // One after another. Keyed by id, so this plays for a row that is new
          // and not for the ones already standing there.
          <li
            key={conversation.id}
            className="animate-fade-up"
            style={rowDelay(index)}
          >
            <Row
              conversation={conversation}
              active={params.id === conversation.id}
            />
          </li>
        ))}
      </ul>
      <LoadMore
        hasMore={hasMore}
        loading={loadingMore}
        onReach={loadMore}
        waiting={<ListSkeleton rows={2} />}
        className="mt-1"
      />
    </CrossFade>
  );
}

function Row({
  conversation,
  active,
}: {
  conversation: Conversation;
  active: boolean;
}) {
  // The open one is being read right now, whatever the page it was fetched with
  // said. The list does re-read when a thread is marked seen, but that is a
  // request, and for the row the reader is looking at the answer is already
  // known — a mark that stays lit for the length of a round trip on the
  // conversation being read is the one place the count is obviously wrong.
  const unread = !active && conversation.unreadCount > 0;
  const last = conversation.lastItem;
  const mark = last?.kind === "EVENT" ? stepMark(last.eventType) : null;

  return (
    <Link
      href={`/cont/inbox/${conversation.id}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-2xl p-2.5 transition",
        // The open row wears the hover fill, and keeps it. Anything heavier read
        // as a dimmed row rather than a chosen one.
        active ? "bg-ink-50" : "hover:bg-ink-50",
      )}
    >
      <span className="relative shrink-0">
        {conversation.kind === "SUPPORT" ? (
          // bid4 itself, wearing its own mark. A face would be a small lie —
          // the other side is the platform — but a generic icon made the one
          // thread that is genuinely from somebody look like the one that is not.
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50/50 ring-1 ring-edge">
            <Bid4Icon size={28} />
          </span>
        ) : conversation.listingImageUrl ? (
          // The object, not the person: an inbox of faces says nothing about
          // which sale is which, and the picture is what the thread is about.
          <span className="relative block h-12 w-12 overflow-hidden rounded-xl">
            <FadeImage
              src={conversation.listingImageUrl}
              sizes="48px"
              className="object-cover"
            />
          </span>
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink-100 text-ink-500">
            <Icons.auction aria-hidden="true" className="h-5 w-5" />
          </span>
        )}
        {conversation.otherParty && conversation.kind !== "SUPPORT" ? (
          <span className="absolute -right-1 -bottom-1">
            <Avatar
              name={conversation.otherParty.displayName}
              src={conversation.otherParty.avatarUrl}
              accountType={conversation.otherParty.accountType}
              size="xs"
            />
          </span>
        ) : null}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span
            className={cn(
              "min-w-0 flex-1 truncate font-display text-[15px]",
              unread ? "font-extrabold text-ink-900" : "font-bold text-ink-800",
            )}
          >
            {conversation.kind === "SUPPORT"
              ? "Echipa bid4"
              : (conversation.listingTitle ?? "Conversație")}
          </span>
          <span className="shrink-0 text-xs text-ink-500">
            {formatRelativeRo(conversation.lastItemAt)}
          </span>
        </span>

        <span className="mt-0.5 flex items-center gap-2">
          {/* The step's own mark, where the last thing to happen was a step.
              A row that reads "Plată confirmată" beside the same green tick the
              card carries is recognised without being read.
              Closer to its own words than to the count at the far end: the mark
              and the line are one phrase, so they keep the row's gap between
              them and the badge, not between each other. */}
          <span className="flex min-w-0 flex-1 items-center gap-1">
            {mark ? (
              <mark.Icon
                aria-hidden="true"
                className={cn("h-3.5 w-3.5 shrink-0", mark.accent.icon)}
              />
            ) : null}
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-[13px]",
                unread ? "font-semibold text-ink-800" : "text-ink-600",
              )}
            >
              {preview(conversation)}
            </span>
          </span>
          {unread ? (
            <span
              aria-label={`${conversation.unreadCount} necitite`}
              // A disc, not a lozenge: h-5 with a matching min-w-5 and the text
              // centred in it, so one digit sits in a circle and only a third
              // digit is allowed to stretch it.
              className="numeric inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary-600 px-1 text-[11px] leading-none font-extrabold text-white"
            >
              {conversation.unreadCount}
            </span>
          ) : null}
        </span>
      </span>
    </Link>
  );
}

/** What the row says when there is no text to show — a picture, or a step of the sale. */
function preview(conversation: Conversation): string {
  const item = conversation.lastItem;
  if (!item) return "Conversație deschisă";
  // The step before the words, or a sale reads as "something happened" all the
  // way from acceptance to release.
  if (item.kind === "EVENT") {
    return stepTitle(item.eventType) ?? item.body ?? "Pas nou în comandă";
  }
  if (item.body) return item.body;
  if (item.kind === "IMAGE") return "A trimis o fotografie";
  return "Actualizare";
}

/**
 * The list's own shape, bar for bar.
 *
 * <p>A 48px tile, then a title with a timestamp at the far end of the same line, then the preview
 * under it. The tile is what sets the row's height in both, so these line up whatever the type
 * does — but the bars sat where no text does, and a placeholder that is only the right height is
 * still the wrong picture.
 */
function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul className="flex flex-col gap-1">
      {Array.from({ length: rows }).map((_, index) => (
        <li key={index} className="flex items-center gap-3 p-2.5">
          <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <Skeleton className="h-[15px] flex-1" />
              <Skeleton className="h-3 w-10 shrink-0" />
            </span>
            <span className="mt-1 flex items-center gap-2">
              <Skeleton className="h-[13px] flex-1" />
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
