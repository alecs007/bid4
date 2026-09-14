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
  UnreadBadge,
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

export function ConversationList() {
  const { user } = useAuth();
  const params = useParams<{ id?: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const phone = useIsPhone();

  const revision = useInboxRevision();

  const { items, error, loading, loadingMore, hasMore, loadMore } = useCursorList({
    load: (cursor) => listConversations(cursor),
    key: `inbox:conversations:${user?.id}`,
    revision,
  });

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

  const rows = items ?? [];

  return (
    <CrossFade ready={!loading} placeholder={<ListSkeleton />}>
      <ul className="flex flex-col gap-1">
        {rows.map((conversation, index) => (
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
  const unread = !active && conversation.unreadCount > 0;
  const last = conversation.lastItem;
  const mark = last?.kind === "EVENT" ? stepMark(last.eventType) : null;

  return (
    <Link
      href={`/cont/inbox/${conversation.id}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-2xl p-2.5 transition",
        active ? "bg-ink-50" : "hover:bg-ink-50",
      )}
    >
      <span className="relative shrink-0">
        {conversation.kind === "SUPPORT" ? (
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50/50 ring-1 ring-edge">
            <Bid4Icon size={28} />
          </span>
        ) : conversation.listingImageUrl ? (
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
            <UnreadBadge
              aria-label={`${conversation.unreadCount} necitite`}
              count={conversation.unreadCount}
              tone="bg-primary-600 text-white"
            />
          ) : null}
        </span>
      </span>
    </Link>
  );
}

function preview(conversation: Conversation): string {
  const item = conversation.lastItem;
  if (!item) return "Conversație deschisă";
  if (item.kind === "EVENT") {
    return (
      stepTitle(item.eventType, conversation.viewerRole !== "SELLER") ??
      item.body ??
      "Pas nou în comandă"
    );
  }
  if (item.body) return item.body;
  if (item.kind === "IMAGE") return "A trimis o fotografie";
  return "Actualizare";
}

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
