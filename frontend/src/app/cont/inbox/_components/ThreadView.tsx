"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSWRConfig } from "swr";

import { Icons } from "@/components/icons";
import {
  Avatar,
  Bid4Icon,
  Button,
  EmptyState,
  FadeImage,
  Skeleton,
  tailDelay,
} from "@/components/ui";
import { getThread, markThreadRead, sendMessage } from "@/lib/api/inbox";
import {
  bumpInbox,
  rememberOpenThread,
  unreadKey,
  withThreadRead,
} from "@/lib/api/inbox-sync";
import {
  chooseDelivery,
  confirmReceipt,
  generateLabel,
  getOrder,
  payOrder,
  reportProblem,
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
  // lg:relative, so the placeholder can be laid over the panel while it fades
  // out. On a phone `fixed` already makes one.
  //
  // lg:overflow-hidden, so the rounded corner is the panel's actual edge: the
  // header's rule and the composer's ran square across it, and the corner read
  // as something clipping the content rather than as the shape of the card.
  "fixed inset-0 z-50 flex flex-col bg-white " +
  "lg:relative lg:z-auto lg:h-full lg:min-h-0 lg:overflow-hidden lg:rounded-3xl lg:ring-1 lg:ring-edge";

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
  /**
   * Whether a placeholder of this exact shape was just standing here.
   *
   * <p>If it was, the conversation does not animate in. The skeleton is the panel's own box in the
   * panel's own place, so the swap moves nothing — and fading the thread up once it is already
   * loaded is a quarter of a second of the screen doing something for no reason. It only arrives
   * when it arrives on its own: opened straight from the cache, with nothing in its place first.
   */
  const [afterSkeleton, setAfterSkeleton] = useState(false);
  const waited = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);
  const stream = useRef<HTMLDivElement>(null);
  const wasAtBottom = useRef(true);
  const settled = useRef(false);
  /** The last (thread, newest item) this told the server it had seen. */
  const marked = useRef<string | null>(null);
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
  const {
    data: order,
    loading: orderLoading,
    reload: reloadOrder,
  } = useApi(() => getOrder(orderId!, user!.id), `inbox:order:${orderId}`, {
    enabled: Boolean(orderId && user),
  });

  /**
   * Not until the sale behind it has arrived too.
   *
   * <p>The order decides which step of the deal is live and whether there is a button under it, so
   * a thread drawn before it lands is drawn a button short — and the one that appears afterwards
   * adds height to a stream already scrolled to its end, which shifts everything the reader is
   * looking at. Waiting costs a second request behind the placeholder; not waiting costs a jump in
   * the middle of the conversation.
   */
  const settlingOrder = Boolean(orderId) && orderLoading;

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

  /**
   * Over the page on a phone, in it on a desktop.
   *
   * <p>Portalled to the body rather than left where it sits, because the page wrapper animates its
   * own opacity and that makes it a stacking context for good — a z-50 inside it loses to the z-40
   * site header, and the conversation would open underneath the bar it is supposed to cover.
   */
  const place = (node: React.ReactElement) =>
    phone ? createPortal(node, document.body) : node;

  /** Plays the panel out, then goes. The wait is the animation's own duration. */
  const close = () => {
    setLeaving(true);
    window.setTimeout(() => router.push("/cont/inbox"), 200);
  };

  // A layout effect, so the panel's first frame already knows. An ordinary
  // effect set this a render late and the entrance had been handed to the
  // browser before the answer arrived.
  useLayoutEffect(() => {
    if (loading || settlingOrder) {
      waited.current = true;
      return;
    }
    if (!waited.current) return;
    waited.current = false;
    setAfterSkeleton(true);
  }, [loading, settlingOrder]);

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
      // Once per thread per newest item. This also runs on visibilitychange, and
      // the count below is moved on trust rather than on an answer — so without
      // this, a tab left and returned to before the refetch landed took one off
      // the bar twice for a thread it had already read once.
      const stamp = `${conversationId}:${newestId ?? ""}`;
      if (marked.current === stamp) return;
      marked.current = stamp;

      // The badge in the bar goes now, on what is already known, rather than
      // after the round trip — the reader is looking at the thread the number
      // is about, and a mark that lingers for a request is the one place the
      // count is visibly wrong. The refetch behind it is what makes it true.
      void mutate(unreadKey(user?.id), withThreadRead, { revalidate: false });
      void markThreadRead(conversationId).then(() => {
        void mutate(
          (key) => typeof key === "string" && key.startsWith("inbox:"),
        );
        // The list beside this one is cursor-paged and hears nothing from SWR.
        bumpInbox();
      });
    };

    markSeen();
    document.addEventListener("visibilitychange", markSeen);
    return () => document.removeEventListener("visibilitychange", markSeen);
  }, [conversationId, unreadCount, newestId, mutate, user?.id]);

  /**
   * Follows the conversation down, unless the reader has gone looking back through it.
   *
   * <p>Scrolling somebody to the bottom because a new line arrived is the shift they complain
   * about: they were reading something further up and the page moved. So the position is measured
   * before the change and only restored if they were already at the end of it.
   */
  // A different conversation is a first paint again. Both of these are refs that
  // outlive the route change — this component is one segment and React keeps the
  // instance — so without the reset a new thread inherited the last one's state:
  // it travelled to its end instead of opening there, or, if the reader had
  // scrolled up in the thread before, never went to the end at all.
  useLayoutEffect(() => {
    settled.current = false;
    wasAtBottom.current = true;
    // Where to come back to. Written on opening rather than on leaving, because
    // leaving is not always an event this sees — a closed tab is not.
    rememberOpenThread(conversationId);
  }, [conversationId]);

  // useLayoutEffect, so the end of the conversation is where it is painted
  // rather than where it arrives a frame later. As an effect this ran after the
  // browser had already drawn the thread at the top, and opening one was a jump.
  useLayoutEffect(() => {
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
    // settlingOrder is in here because the panel is not on the page while it is
    // true — the placeholder is. Without it this ran against a scroller that did
    // not exist yet, found nothing, and never came back once one did.
  }, [newestId, data?.items.length, settlingOrder]);

  /**
   * Holds the end of the conversation while it is still settling.
   *
   * <p>The scroll above lands the moment the items do, and the thread is not finished growing then:
   * a photograph decodes, a long line wraps once the font arrives, a card lays itself out. Each of
   * those adds height under a view that was already at the bottom, and the last message ends up cut
   * off below the fold — which is the load looking as though it clipped.
   *
   * <p>Only while they were at the end of it. Somebody who has scrolled back through a thread must
   * not be dragged to the bottom because a picture further down finished loading.
   */
  useEffect(() => {
    const scroller = stream.current;
    if (!scroller) return;

    const pin = () => {
      if (!wasAtBottom.current) return;
      // Assigned rather than animated: this is correcting a measurement, not
      // travelling anywhere, and a smooth scroll here would fight the next one.
      scroller.scrollTop = scroller.scrollHeight;
    };

    // The children rather than the scroller: its own box is fixed by the panel,
    // so it never resizes — what changes is what is inside it.
    const observer = new ResizeObserver(pin);
    for (const child of Array.from(scroller.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [data?.items.length, settlingOrder]);

  /**
   * Loading and failure are the same box in the same place as the thread itself.
   *
   * <p>They used to return early, before the portal — so on a phone the skeleton drew inside the
   * page, under the site bar, and the conversation then jumped out over it. Placing every state
   * the same way is the difference between a panel filling in and a panel arriving.
   */
  if (loading || settlingOrder)
    return place(
      <ThreadSkeleton className="animate-thread-in lg:animate-fade-in" />,
    );
  if (error || !data) {
    return place(
      <section className={cn(THREAD_SHELL, "items-center justify-center p-6")}>
        <EmptyState
          className="border-0 ring-0"
          mood="sad"
          title="Nu am putut încărca conversația"
          description={error ?? "Încearcă din nou."}
        />
      </section>,
    );
  }

  const { conversation } = data;
  const items = [...data.items].reverse();
  const viewerIsBuyer = order ? order.buyerId === user?.id : false;

  // Real names on both sides rather than "tu" for one of them: a thread is the
  // record of a sale, and a record does not change wording depending on who is
  // reading it.
  const otherName = conversation.otherParty?.displayName;
  const buyerName = viewerIsBuyer ? user?.displayName : otherName;
  const sellerName = viewerIsBuyer ? otherName : user?.displayName;
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
    // Copying is the card's own business — it never reaches the server.
    if (action === "COPY_AWB") return;

    setActing(true);
    setSendError(null);
    try {
      if (action === "PAY") await payOrder(order.id, user!.id);
      if (action === "LABEL") await generateLabel(order.id);
      if (action === "CONFIRM_RECEIPT") await confirmReceipt(order.id, user!.id);
      if (action === "REPORT_PROBLEM") await reportProblem(order.id, user!.id);
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
      // The row in the list beside this one shows the last line of the thread
      // and sorts on when it was written. Both just changed.
      bumpInbox();
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
        leaving && "animate-thread-out lg:animate-fade-in",
        !leaving && !afterSkeleton && "animate-thread-in lg:animate-fade-in",
      )}
    >
      {/* What the conversation is about, kept in view — three screens down a
          thread, "it" stops being obvious. */}
      {/* Two rows on a phone, one on a desktop. Squeezing the object and the
          person onto a single line left neither of them readable at 375px, and
          the person is who a conversation is with — so they lead, and what it
          is about sits under them as its own strip. */}
      <header className="shrink-0 border-b border-line">
        <div className="flex animate-fade-in items-center gap-2 p-3">
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
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50/50 ring-1 ring-edge"
              >
                <Bid4Icon size={24} />
              </span>
              {/* Both lines on leading-snug: an arbitrary font size carries no
                  line height of its own, so these inherited the body's 1.5 and
                  stood further apart than the two lines of a name and a price
                  in the same slot. */}
              <span className="min-w-0">
                <span className="block truncate font-display text-[15px] leading-snug font-extrabold text-ink-900">
                  Echipa bid4
                </span>
                <span className="block text-[13px] leading-snug text-ink-600">
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
                    {/* Which side of this listing they are on, rather than their
                        handle. The same two people are buyer in one thread and
                        seller in the next, and knowing which is the difference
                        between reading a step and working it out. */}
                    <span className="block truncate text-[12px] text-ink-500 lg:text-[11px]">
                      {conversation.viewerRole === "BUYER"
                        ? "Vânzător"
                        : conversation.viewerRole === "SELLER"
                          ? "Cumpărător"
                          : `@${conversation.otherParty.username}`}
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
        // no-scrollbar: the conversation scrolls, and a bar down the side of it
        // reads as a panel within a panel. The thread already tells you where
        // you are — it opens at the end and the messages are dated.
        className="no-scrollbar flex flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto overscroll-contain p-3"
      >
        {items.map((item, index) => (
          // One after another, towards the newest. Opacity and nothing else:
          // the stream is already scrolled to its end when this paints, and a
          // line that rises ten pixels into that end looks like the thread
          // scrolling itself after the fact.
          //
          // Wrapped rather than animated in place so a message and a step of
          // the sale arrive the same way, and keyed by id, so this plays for a
          // line that is new and leaves the ones already read alone.
          <div
            key={item.id}
            className="animate-fade-in"
            style={tailDelay(index, items.length, 60)}
          >
            {item.kind === "EVENT" ? (
              <EventCard
                item={item}
                order={order ?? null}
                newest={item.id === newestEventId}
                viewerIsBuyer={viewerIsBuyer}
                buyerName={buyerName}
                sellerName={sellerName}
                busy={acting}
                onAct={act}
              />
            ) : (
              <Item item={item} />
            )}
          </div>
        ))}
        <div ref={bottom} />
      </div>

      <DeliverySheet
        open={pickingDelivery}
        busy={acting}
        onClose={() => setPickingDelivery(false)}
        onChoose={pickDelivery}
        load={() => listDeliveryMethods(user!.id)}
      />

      <form
        onSubmit={send}
        className="animate-fade-in border-t border-line p-3"
        style={{ animationDelay: "60ms" }}
      >
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

  return place(panel);
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
    <div
      className={cn(
        "flex",
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

/**
 * The panel's box, empty.
 *
 * <p>It carries no entrance of its own: it is shown on its way in, where the caller gives it the
 * panel's animation, and again on its way out as a curtain over the loaded thread, where playing
 * that animation again would have it fading in and out at the same moment.
 */
export function ThreadSkeleton({ className }: { className?: string }) {
  return (
    <section className={cn(THREAD_SHELL, className)}>
      {/* The same three boxes the loaded thread has, at the same heights: a
          header of 40px marks, a run of bubbles, and the composer. A skeleton
          that is not the shape of what replaces it is a jump with extra steps. */}
      <div className="flex items-center gap-2 border-b border-line p-3">
        <Skeleton className="h-9 w-9 shrink-0 rounded-xl lg:hidden" />
        <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
        <span className="flex-1">
          {/* text-[15px] over text-[13px], which is what the name and the line
              under it occupy. */}
          <Skeleton className="h-[15px] w-40" />
          <Skeleton className="mt-1 h-[13px] w-24" />
        </span>
        <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-hidden p-3">
        <Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" />
        <Skeleton className="h-14 w-2/3 rounded-2xl" />
        <Skeleton className="mx-auto h-4 w-3/5 rounded-full" />
        <Skeleton className="mx-auto h-4 w-1/2 rounded-full" />
      </div>

      {/* The field and the button beside it, both 44px, the pair the composer
          actually is — a single bar across the bottom was the wrong shape and
          the send button appeared out of nothing. */}
      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-11 flex-1 rounded-2xl" />
          <Skeleton className="h-11 w-24 shrink-0 rounded-2xl" />
        </div>
      </div>
    </section>
  );
}
