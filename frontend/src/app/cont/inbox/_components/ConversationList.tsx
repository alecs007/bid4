"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { Icons } from "@/components/icons";
import { Avatar, EmptyState, FadeImage, Skeleton } from "@/components/ui";
import { listConversations } from "@/lib/api/inbox";
import { useApi } from "@/lib/hooks/useApi";
import type { Conversation } from "@/lib/types";
import { formatRelativeRo } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

import { stepTitle } from "./EventCard";

/**
 * Every thread this account is in, newest activity first.
 *
 * <p>One line of the last message, whoever wrote it. Which of the two people it was matters less
 * than what it said — the row is scanned for whether anything is waiting, and the unread mark
 * answers that better than a name would.
 */
export function ConversationList() {
  const { data, error, loading } = useApi(
    () => listConversations(),
    "inbox:conversations",
  );
  const params = useParams<{ id?: string }>();

  if (loading) return <ListSkeleton />;

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

  const rows = data?.items ?? [];
  if (rows.length === 0) {
    return (
      <EmptyState
        compact
        title="Niciun mesaj încă"
        description="Când întrebi ceva despre un anunț, conversația apare aici — și tot aici se face vânzarea."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {rows.map((conversation) => (
        <li key={conversation.id}>
          <Row conversation={conversation} active={params.id === conversation.id} />
        </li>
      ))}
    </ul>
  );
}

function Row({
  conversation,
  active,
}: {
  conversation: Conversation;
  active: boolean;
}) {
  const unread = conversation.unreadCount > 0;

  return (
    <Link
      href={`/cont/inbox/${conversation.id}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-2xl p-2.5 transition",
        active ? "bg-ink-100" : "hover:bg-ink-50",
      )}
    >
      <span className="relative shrink-0">
        {conversation.listingImageUrl ? (
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
        {conversation.otherParty ? (
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
            {conversation.listingTitle ?? "Conversație"}
          </span>
          <span className="shrink-0 text-xs text-ink-500">
            {formatRelativeRo(conversation.lastItemAt)}
          </span>
        </span>

        <span className="mt-0.5 flex items-center gap-2">
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[13px]",
              unread ? "font-semibold text-ink-800" : "text-ink-600",
            )}
          >
            {preview(conversation)}
          </span>
          {unread ? (
            <span
              aria-label={`${conversation.unreadCount} necitite`}
              className="numeric shrink-0 rounded-full bg-primary-600 px-1.5 py-0.5 text-[11px] font-extrabold text-white"
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

function ListSkeleton() {
  return (
    <ul className="flex flex-col gap-1">
      {Array.from({ length: 6 }).map((_, index) => (
        <li key={index} className="flex items-center gap-3 p-2.5">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <span className="flex-1">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="mt-2 h-3 w-1/2" />
          </span>
        </li>
      ))}
    </ul>
  );
}
