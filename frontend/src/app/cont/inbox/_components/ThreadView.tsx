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
import { EventCard, NextStep, type OrderAction } from "./EventCard";

const THREAD_SHELL =
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
  const [afterSkeleton, setAfterSkeleton] = useState(false);
  const waited = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);
  const stream = useRef<HTMLDivElement>(null);
  const wasAtBottom = useRef(true);
  const settled = useRef(false);
  const marked = useRef<string | null>(null);
  const { user } = useAuth();
  const { mutate } = useSWRConfig();
  const router = useRouter();

  const phone = useIsPhone();

  const orderId = data?.conversation.orderId;
  const {
    data: order,
    loading: orderLoading,
    reload: reloadOrder,
  } = useApi(() => getOrder(orderId!, user!.id), `inbox:order:${orderId}`, {
    enabled: Boolean(orderId && user),
  });

  const settlingOrder = Boolean(orderId) && orderLoading;

  useEffect(() => {
    if (!phone) return;
    document.documentElement.style.overflow = "hidden";
    setPageScrollLocked(true);
    return () => {
      document.documentElement.style.overflow = "";
      setPageScrollLocked(false);
    };
  }, [phone]);

  const place = (node: React.ReactElement) =>
    phone ? createPortal(node, document.body) : node;

  const close = () => {
    setLeaving(true);
    window.setTimeout(() => router.push("/cont/inbox"), 200);
  };

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

  useEffect(() => {
    if (unreadCount < 1) return;

    const markSeen = () => {
      if (document.visibilityState !== "visible") return;
      const stamp = `${conversationId}:${newestId ?? ""}`;
      if (marked.current === stamp) return;
      marked.current = stamp;

      void mutate(unreadKey(user?.id), withThreadRead, { revalidate: false });
      void markThreadRead(conversationId).then(() => {
        void mutate(
          (key) => typeof key === "string" && key.startsWith("inbox:"),
        );
        bumpInbox();
      });
    };

    markSeen();
    document.addEventListener("visibilitychange", markSeen);
    return () => document.removeEventListener("visibilitychange", markSeen);
  }, [conversationId, unreadCount, newestId, mutate, user?.id]);

  useLayoutEffect(() => {
    settled.current = false;
    wasAtBottom.current = true;
    rememberOpenThread(conversationId);
  }, [conversationId]);

  useLayoutEffect(() => {
    const scroller = stream.current;
    if (!scroller) return;
    if (!wasAtBottom.current) return;

    scroller.scrollTo({
      top: scroller.scrollHeight,
      behavior: settled.current ? "smooth" : "auto",
    });
    settled.current = true;
  }, [newestId, data?.items.length, settlingOrder]);

  useEffect(() => {
    const scroller = stream.current;
    if (!scroller) return;

    const pin = () => {
      if (!wasAtBottom.current) return;
      scroller.scrollTop = scroller.scrollHeight;
    };

    const observer = new ResizeObserver(pin);
    for (const child of Array.from(scroller.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [data?.items.length, settlingOrder]);

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
  const viewerIsBuyer = conversation.viewerRole
    ? conversation.viewerRole === "BUYER"
    : order
      ? order.buyerId === user?.id
      : true;

  const causeName = data.items.find(
    (item) => item.eventType === "OFFER_ACCEPTED",
  )?.payload?.cause;

  const otherName = conversation.otherParty?.displayName;
  const buyerName = viewerIsBuyer ? user?.displayName : otherName;
  const sellerName = viewerIsBuyer ? otherName : user?.displayName;
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
      wasAtBottom.current = true;
      reload();
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
      <header className="shrink-0 border-b border-line">
        <div className="flex animate-fade-in items-center gap-2 p-3">
          <button
            type="button"
            aria-label="Înapoi la mesaje"
            onClick={close}
            className="-ml-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-700 transition hover:bg-ink-100 lg:hidden"
          >
            <Icons.crumb aria-hidden="true" className="h-5 w-5 rotate-180" />
          </button>

          {conversation.kind === "SUPPORT" ? (
            <span className="flex min-w-0 flex-1 items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50/50 ring-1 ring-edge"
              >
                <Bid4Icon size={24} />
              </span>
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
          const box = event.currentTarget;
          wasAtBottom.current =
            box.scrollHeight - box.scrollTop - box.clientHeight < 160;
        }}
        className="no-scrollbar flex flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto overscroll-contain p-3"
      >
        {items.map((item, index) => (
          <div
            key={item.id}
            className="animate-fade-in"
            style={tailDelay(index, items.length, 60)}
          >
            {item.kind === "EVENT" ? (
              <EventCard
                item={item}
                viewerIsBuyer={viewerIsBuyer}
                buyerName={buyerName}
                sellerName={sellerName}
              />
            ) : (
              <Item item={item} />
            )}
          </div>
        ))}
        {order ? (
          <div
            className="animate-fade-in"
            style={tailDelay(items.length, items.length + 1, 60)}
          >
            <NextStep
              order={order}
              viewerIsBuyer={viewerIsBuyer}
              buyerName={buyerName}
              sellerName={sellerName}
              causeName={causeName}
              busy={acting}
              onAct={act}
            />
          </div>
        ) : null}
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

export function ThreadSkeleton({ className }: { className?: string }) {
  return (
    <section className={cn(THREAD_SHELL, className)}>
      <div className="flex items-center gap-2 border-b border-line p-3">
        <Skeleton className="h-9 w-9 shrink-0 rounded-xl lg:hidden" />
        <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
        <span className="flex-1">
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

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-11 flex-1 rounded-2xl" />
          <Skeleton className="h-11 w-24 shrink-0 rounded-2xl" />
        </div>
      </div>
    </section>
  );
}
