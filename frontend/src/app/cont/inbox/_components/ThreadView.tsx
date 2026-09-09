"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSWRConfig } from "swr";

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
import { setPageScrollLocked } from "@/components/layout/SmoothScroll";
import { useApi } from "@/lib/hooks/useApi";
import { useIsPhone } from "@/lib/hooks/useBreakpoint";
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
/**
 * The panel's box, shared with its own skeleton.
 *
 * <p>Its height comes from the shell rather than from what is in it, so a short thread and a long
 * one are the same shape and the page does not resize when one replaces the other.
 */
const THREAD_SHELL =
  // A phone opens a conversation the way a phone does: over everything, edge to
  // edge, pushed in from the side. A desktop keeps it as the right-hand panel,
  // because there the list beside it is the point.
  "fixed inset-0 z-50 flex flex-col bg-white " +
  "lg:static lg:z-auto lg:h-full lg:min-h-0 lg:rounded-3xl lg:ring-1 lg:ring-edge";

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
  const [leaving, setLeaving] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const stream = useRef<HTMLDivElement>(null);
  const wasAtBottom = useRef(true);
  const settled = useRef(false);
  const { user } = useAuth();
  const { mutate } = useSWRConfig();
  const router = useRouter();

  // Only a phone gets the overlay, and only a phone gets the portal with it: on
  // a desktop this is `position: static` and portalling it would drop it out of
  // the two-pane grid and onto the end of the document.
  const phone = useIsPhone();

  // The sale behind the thread, if there is one. This is what decides which
  // card is live and who may press it — the items never decide that themselves.
  const orderId = data?.conversation.orderId;
  const { data: order, reload: reloadOrder } = useApi(
    () => getOrder(orderId!, user!.id),
    `inbox:order:${orderId}`,
    { enabled: Boolean(orderId && user) },
  );

  /**
   * While the conversation covers the screen, the page behind it holds still.
   *
   * <p>Only on a phone — from lg this is a panel inside the page, and locking the page would freeze
   * the list beside it. Turning a phone sideways past the breakpoint unlocks it, because the
   * overlay it belonged to is gone by then.
   */
  useEffect(() => {
    if (!phone) return;
    document.documentElement.style.overflow = "hidden";
    setPageScrollLocked(true);
    return () => {
      document.documentElement.style.overflow = "";
      setPageScrollLocked(false);
    };
  }, [phone]);

  /** Plays the panel out, then goes. The wait is the animation's own duration. */
  const close = () => {
    setLeaving(true);
    window.setTimeout(() => router.push("/cont/inbox"), 200);
  };

  const unreadCount = data?.conversation.unreadCount ?? 0;
  const newestId = data?.items[0]?.id;

  /**
   * Read when it has actually been seen.
   *
   * <p>Keyed on the newest item rather than run once on mount, so a message that arrives while the
   * thread is open is marked too — otherwise the badge in the bar keeps counting a conversation the
   * reader is looking at. A hidden tab is not somebody reading, so it waits for the tab to come
   * back.
   *
   * <p>The counts everywhere else are told immediately rather than waiting for the next fetch: the
   * mark in the bar is the one thing on screen that would otherwise stay wrong.
   */
  useEffect(() => {
    if (unreadCount < 1) return;

    const markSeen = () => {
      if (document.visibilityState !== "visible") return;
      void markThreadRead(conversationId).then(() => {
        void mutate(
          (key) => typeof key === "string" && key.startsWith("inbox:"),
        );
      });
    };

    markSeen();
    document.addEventListener("visibilitychange", markSeen);
    return () => document.removeEventListener("visibilitychange", markSeen);
  }, [conversationId, unreadCount, newestId, mutate]);

  /**
   * Follows the conversation down, unless the reader has gone looking back through it.
   *
   * <p>Scrolling somebody to the bottom because a new line arrived is the shift they complain
   * about: they were reading something further up and the page moved. So the position is measured
   * before the change and only restored if they were already at the end of it.
   */
  useEffect(() => {
    const scroller = stream.current;
    if (!scroller) return;
    if (!wasAtBottom.current) return;

    // The container rather than a sentinel inside it: scrollIntoView measures
    // against a box that is still settling while images load, and lands short.
    scroller.scrollTo({
      top: scroller.scrollHeight,
      // The first paint lands where it belongs; everything after it travels.
      behavior: settled.current ? "smooth" : "auto",
    });
    settled.current = true;
  }, [newestId, data?.items.length]);

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
      // Sending is asking to see it. Somebody reading further up the thread
      // keeps their place when a message arrives; they do not when it is theirs.
      wasAtBottom.current = true;
      reload();
    } catch (failure) {
      setSendError(
        failure instanceof Error ? failure.message : "Mesajul nu a plecat.",
      );
    } finally {
      setSending(false);
    }
  };

  const panel = (
    <section
      className={cn(
        THREAD_SHELL,
        leaving
          ? "animate-thread-out lg:animate-fade-in"
          : "animate-thread-in lg:animate-fade-in",
      )}
    >
      {/* What the conversation is about, kept in view — three screens down a
          thread, "it" stops being obvious. */}
      {/* Two rows on a phone, one on a desktop. Squeezing the object and the
          person onto a single line left neither of them readable at 375px, and
          the person is who a conversation is with — so they lead, and what it
          is about sits under them as its own strip. */}
      <header className="shrink-0 border-b border-line">
        <div className="flex items-center gap-2 p-3">
          {/* A button rather than a link, because leaving has to be played
              before it happens: a route change unmounts this instantly, and a
              panel that vanishes is not the same thing as one that closes.
              Browser back is still instant — nothing can animate a history
              entry that has already gone. */}
          <button
            type="button"
            aria-label="Înapoi la mesaje"
            onClick={close}
            className="-ml-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-700 transition hover:bg-ink-100 lg:hidden"
          >
            <Icons.crumb aria-hidden="true" className="h-5 w-5 rotate-180" />
          </button>

          {/* On a desktop the object leads and the person sits at the far end. */}
          {conversation.kind === "SUPPORT" ? (
            <span className="flex min-w-0 flex-1 items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700"
              >
                <Icons.donation className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-display text-[15px] font-extrabold text-ink-900">
                  Echipa bid4
                </span>
                <span className="block text-[13px] text-ink-600">
                  Suport și anunțuri
                </span>
              </span>
            </span>
          ) : (
            <>
              {conversation.listingId ? (
                <Link
                  href={`/licitatii/${conversation.listingId}`}
                  className="hidden min-w-0 flex-1 items-center gap-3 lg:flex"
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
              ) : null}

              {/* Who you are talking to, and a way to their profile — "who is
                  this" is the first question anybody has about a stranger they
                  are about to send money to. */}
              {conversation.otherParty ? (
                <Link
                  href={`/profil/${conversation.otherParty.username}`}
                  className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl p-1 transition hover:bg-ink-50 lg:max-w-[40%] lg:flex-none lg:pr-1 lg:pl-2"
                >
                  <Avatar
                    name={conversation.otherParty.displayName}
                    src={conversation.otherParty.avatarUrl}
                    accountType={conversation.otherParty.accountType}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1 lg:order-first lg:text-right">
                    <span className="block truncate font-display text-[15px] font-bold text-ink-900 lg:text-[13px] lg:text-ink-800">
                      {conversation.otherParty.displayName}
                    </span>
                    <span className="block truncate text-[12px] text-ink-500 lg:text-[11px]">
                      @{conversation.otherParty.username}
                    </span>
                  </span>
                </Link>
              ) : null}
            </>
          )}
        </div>

        {/* What it is about, on its own line where there is no room to share one. */}
        {conversation.listingId ? (
          <Link
            href={`/licitatii/${conversation.listingId}`}
            className="flex items-center gap-2.5 border-t border-line px-3 py-2 transition hover:bg-ink-50 lg:hidden"
          >
            {conversation.listingImageUrl ? (
              <span className="relative block h-8 w-8 shrink-0 overflow-hidden rounded-lg">
                <FadeImage
                  src={conversation.listingImageUrl}
                  sizes="32px"
                  className="object-cover"
                />
              </span>
            ) : null}
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink-700">
              {conversation.listingTitle}
            </span>
            <span className="shrink-0 font-display text-[13px] font-extrabold text-ink-900">
              {formatMoney(conversation.listingPrice)}
            </span>
          </Link>
        ) : null}
      </header>

      <div
        ref={stream}
        data-lenis-prevent
        onScroll={(event) => {
          // "Near enough" rather than exactly: a couple of pixels of inertia
          // should not count as having gone looking back through the thread.
          const box = event.currentTarget;
          // Generous on purpose: the stream has its own padding and the last
          // bubble rarely ends flush against the bottom, so a tight threshold
          // reads an ordinary resting position as "gone looking back".
          wasAtBottom.current =
            box.scrollHeight - box.scrollTop - box.clientHeight < 160;
        }}
        className="flex flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto overscroll-contain p-3"
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
        <div className="flex items-center gap-2">
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
          {/* md, so it is the field's own height — a short button beside a tall
              input reads as two controls that happen to be next to each other.
              Flat with it: the 3D edge belongs to buttons on a page, and beside
              an input it reads as the control sitting on something. */}
          <Button
            type="submit"
            size="md"
            className="shrink-0 [--btn-depth:0px]"
            disabled={!draft.trim() || sending}
          >
            Trimite
          </Button>
        </div>
      </form>
    </section>
  );

  /**
   * Over the page on a phone, in it on a desktop.
   *
   * <p>Portalled to the body rather than left where it sits, because the page wrapper animates its
   * own opacity and that makes it a stacking context for good — a z-50 inside it loses to the
   * z-40 site header, and the conversation would open underneath the bar it is supposed to cover.
   */
  return phone ? createPortal(panel, document.body) : panel;
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
    // Keyed by id upstream, so React reuses the node and this plays once per
    // message rather than on every re-render of the thread around it.
    <div
      className={cn(
        "flex animate-fade-in",
        item.mine ? "justify-end" : "justify-start",
      )}
    >
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
    <section className={THREAD_SHELL}>
      {/* The same three boxes the loaded thread has, at the same heights: a
          header of 40px marks, a run of bubbles, and the composer. A skeleton
          that is not the shape of what replaces it is a jump with extra steps. */}
      <div className="flex items-center gap-3 border-b border-line p-3">
        <Skeleton className="h-9 w-9 shrink-0 rounded-xl lg:hidden" />
        <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
        <span className="flex-1">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="mt-1.5 h-3 w-16" />
        </span>
        <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-hidden p-3">
        <Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" />
        <Skeleton className="h-14 w-2/3 rounded-2xl" />
        <Skeleton className="mx-auto h-4 w-3/5 rounded-full" />
        <Skeleton className="mx-auto h-4 w-1/2 rounded-full" />
      </div>

      <div className="border-t border-line p-3">
        <Skeleton className="h-11 w-full rounded-2xl" />
      </div>
    </section>
  );
}
