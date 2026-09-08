"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Icons } from "@/components/icons";
import {
  Avatar,
  Button,
  EmptyState,
  FadeImage,
  Skeleton,
} from "@/components/ui";
import { getThread, markThreadRead, sendMessage } from "@/lib/api/inbox";
import {
  chooseDelivery,
  confirmReceipt,
  dispatchOrder,
  generateLabel,
  getOrder,
  payOrder,
} from "@/lib/api/orders";
import { listDeliveryMethods } from "@/lib/api/users";
import { useApi } from "@/lib/hooks/useApi";
import { useAuth } from "@/lib/auth/AuthProvider";
import { formatMoney } from "@/lib/money";
import type { ThreadItem } from "@/lib/types";
import { formatTimeRo } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

import { DeliverySheet } from "./DeliverySheet";
import { EventCard, type OrderAction } from "./EventCard";

/**
 * One conversation, and — from phase two — one sale.
 *
 * <p>The items arrive newest first, the direction the index runs, and are drawn oldest first. There
 * is no separate panel for the deal: an accepted offer, a delivery choice and a payment will appear
 * between the messages, in the order they happened, because that is what makes the thread readable
 * as the history of a sale rather than as chat with a status bar bolted on.
 */
export function ThreadView({ conversationId }: { conversationId: string }) {
  const { data, error, loading, reload } = useApi(
    () => getThread(conversationId),
    `inbox:thread:${conversationId}`,
  );

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [pickingDelivery, setPickingDelivery] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // The sale behind the thread, if there is one. This is what decides which
  // card is live and who may press it — the items never decide that themselves.
  const orderId = data?.conversation.orderId;
  const { data: order, reload: reloadOrder } = useApi(
    () => getOrder(orderId!, user!.id),
    `inbox:order:${orderId}`,
    { enabled: Boolean(orderId && user) },
  );

  const unreadCount = data?.conversation.unreadCount ?? 0;
  useEffect(() => {
    if (unreadCount > 0) void markThreadRead(conversationId);
  }, [conversationId, unreadCount]);

  // The newest line is the one somebody came to read. Instant rather than
  // smooth: this is where the thread starts, not somewhere it travelled to.
  const newestId = data?.items[0]?.id;
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [newestId]);

  if (loading) return <ThreadSkeleton />;
  if (error || !data) {
    return (
      <EmptyState
        mood="sad"
        title="Nu am putut încărca conversația"
        description={error ?? "Încearcă din nou."}
      />
    );
  }

  const { conversation } = data;
  const items = [...data.items].reverse();
  const viewerIsBuyer = order ? order.buyerId === user?.id : false;
  // data.items is newest first, so the first EVENT in it is the last one written.
  const newestEventId = data.items.find((item) => item.kind === "EVENT")?.id;

  /**
   * A press on a card.
   *
   * <p>Every one of these is re-checked on the server against the order's own status and the
   * caller's id, so what happens here is asking — not deciding. Both the thread and the order are
   * re-read afterwards, because a step writes a card as well as moving the row.
   */
  const act = async (action: OrderAction) => {
    if (!order || acting) return;
    if (action === "CHOOSE_DELIVERY") {
      setPickingDelivery(true);
      return;
    }

    setActing(true);
    setSendError(null);
    try {
      if (action === "PAY") await payOrder(order.id, user!.id);
      if (action === "LABEL") await generateLabel(order.id);
      if (action === "DISPATCH") await dispatchOrder(order.id, user!.id);
      if (action === "CONFIRM_RECEIPT") await confirmReceipt(order.id, user!.id);
      reload();
      reloadOrder();
    } catch (failure) {
      setSendError(
        failure instanceof Error ? failure.message : "Pasul nu a putut fi făcut.",
      );
    } finally {
      setActing(false);
    }
  };

  const pickDelivery = async (deliveryMethodId: string) => {
    if (!order) return;
    setActing(true);
    try {
      await chooseDelivery(order.id, deliveryMethodId, user!.id);
      setPickingDelivery(false);
      reload();
      reloadOrder();
    } catch (failure) {
      setSendError(
        failure instanceof Error ? failure.message : "Livrarea nu a fost salvată.",
      );
    } finally {
      setActing(false);
    }
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setSendError(null);
    try {
      await sendMessage(conversationId, { body });
      setDraft("");
      reload();
    } catch (failure) {
      setSendError(
        failure instanceof Error ? failure.message : "Mesajul nu a plecat.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="flex min-h-[60vh] flex-col rounded-3xl bg-white ring-1 ring-edge lg:h-[calc(100dvh-9rem)]">
      {/* What the conversation is about, kept in view — three screens down a
          thread, "it" stops being obvious. */}
      <header className="flex items-center gap-3 border-b border-line p-3">
        <Link
          href="/cont/inbox"
          aria-label="Înapoi la mesaje"
          className="-ml-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-700 transition hover:bg-ink-100 lg:hidden"
        >
          <Icons.crumb aria-hidden="true" className="h-5 w-5 rotate-180" />
        </Link>

        {conversation.listingId ? (
          <Link
            href={`/licitatii/${conversation.listingId}`}
            className="flex min-w-0 flex-1 items-center gap-3"
          >
            {conversation.listingImageUrl ? (
              <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-xl">
                <FadeImage
                  src={conversation.listingImageUrl}
                  sizes="40px"
                  className="object-cover"
                />
              </span>
            ) : null}
            <span className="min-w-0">
              <span className="block truncate font-display text-[15px] font-extrabold text-ink-900">
                {conversation.listingTitle}
              </span>
              <span className="block text-[13px] text-ink-600">
                {formatMoney(conversation.listingPrice)}
              </span>
            </span>
          </Link>
        ) : (
          <span className="flex-1 font-display font-extrabold">Suport bid4</span>
        )}

        {conversation.otherParty ? (
          <Link
            href={`/profil/${conversation.otherParty.username}`}
            className="shrink-0"
            aria-label={conversation.otherParty.displayName}
          >
            <Avatar
              name={conversation.otherParty.displayName}
              src={conversation.otherParty.avatarUrl}
              accountType={conversation.otherParty.accountType}
              size="sm"
            />
          </Link>
        ) : null}
      </header>

      <div
        data-lenis-prevent
        className="flex flex-1 flex-col gap-2 overflow-y-auto p-3"
      >
        {items.map((item) =>
          item.kind === "EVENT" ? (
            <EventCard
              key={item.id}
              item={item}
              order={order ?? null}
              newest={item.id === newestEventId}
              viewerIsBuyer={viewerIsBuyer}
              busy={acting}
              onAct={act}
            />
          ) : (
            <Item key={item.id} item={item} />
          ),
        )}
        <div ref={bottom} />
      </div>

      <DeliverySheet
        open={pickingDelivery}
        busy={acting}
        onClose={() => setPickingDelivery(false)}
        onChoose={pickDelivery}
        load={() => listDeliveryMethods(user!.id)}
      />

      <form onSubmit={send} className="border-t border-line p-3">
        {sendError ? (
          <p className="mb-2 text-[13px] font-semibold text-danger-700">
            {sendError}
          </p>
        ) : null}
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              // Enter sends, shift+enter breaks the line: this is a
              // conversation, and most messages in one are a single line.
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send(event);
              }
            }}
            rows={1}
            placeholder="Scrie un mesaj..."
            aria-label="Scrie un mesaj"
            className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl bg-canvas px-3.5 py-2.5 text-base text-ink-900 ring-1 ring-ink-200 transition placeholder:text-ink-500 focus:ring-primary-500 focus:outline-none sm:text-[15px]"
          />
          <Button type="submit" disabled={!draft.trim() || sending} size="sm">
            Trimite
          </Button>
        </div>
      </form>
    </section>
  );
}

function Item({ item }: { item: ThreadItem }) {
  if (item.kind === "SYSTEM") {
    return (
      <p className="mx-auto max-w-md rounded-2xl bg-ink-50 px-4 py-2 text-center text-[13px] text-ink-700">
        {item.body}
      </p>
    );
  }

  return (
    <div className={cn("flex", item.mine ? "justify-end" : "justify-start")}>
      <div className="max-w-[80%]">
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed",
            item.mine
              ? "bg-primary-600 text-white"
              : "bg-ink-100 text-ink-900",
          )}
        >
          {item.imageUrls.map((url) => (
            <span
              key={url}
              className="relative mb-1.5 block h-48 w-48 overflow-hidden rounded-xl"
            >
              <FadeImage src={url} sizes="192px" className="object-cover" />
            </span>
          ))}
          {item.body ? (
            <p className="whitespace-pre-wrap break-words">{item.body}</p>
          ) : null}
        </div>

        {/* Delivered and marked, not dropped: refusing it teaches people to
            spell the number out, and the person reading is the one who needs
            to know what they are being asked to do. */}
        {item.flaggedReason ? (
          <p className="mt-1 flex items-start gap-1.5 rounded-xl bg-warning-50 px-2.5 py-1.5 text-[12px] leading-snug text-warning-800">
            <Icons.warning
              aria-hidden="true"
              className="mt-px h-3.5 w-3.5 shrink-0"
            />
            {FLAG_COPY[item.flaggedReason]}
          </p>
        ) : null}

        <p
          className={cn(
            "mt-0.5 text-[11px] text-ink-500",
            item.mine ? "text-right" : "text-left",
          )}
        >
          {formatTimeRo(item.createdAt)}
        </p>
      </div>
    </div>
  );
}

const FLAG_COPY: Record<string, string> = {
  PHONE_NUMBER:
    "Un număr de telefon. Plata prin bid4 e singura protejată, iar donația pleacă doar de aici.",
  EMAIL_ADDRESS:
    "O adresă de email. Ține discuția aici — altfel pierzi protecția plății și donația.",
  PAYMENT_DETAILS:
    "Detalii de plată în afara bid4. Banii nu mai sunt protejați, iar cauza nu primește nimic.",
};

function ThreadSkeleton() {
  return (
    <section className="flex min-h-[60vh] flex-col rounded-3xl bg-white ring-1 ring-edge">
      <div className="flex items-center gap-3 border-b border-line p-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <span className="flex-1">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="mt-2 h-3 w-20" />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-3">
        <Skeleton className="h-12 w-2/3 rounded-2xl" />
        <Skeleton className="ml-auto h-12 w-1/2 rounded-2xl" />
        <Skeleton className="h-12 w-3/5 rounded-2xl" />
      </div>
    </section>
  );
}
