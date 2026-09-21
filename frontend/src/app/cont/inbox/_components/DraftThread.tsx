"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { setPageScrollLocked } from "@/components/layout/SmoothScroll";
import { Icons } from "@/components/icons";
import { Avatar, Button, EmptyState, FadeImage } from "@/components/ui";
import { getAuction } from "@/lib/api/auctions";
import { findListingThread, openThread } from "@/lib/api/inbox";
import { bumpInbox } from "@/lib/api/inbox-sync";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useIsPhone } from "@/lib/hooks/useBreakpoint";
import { errorMessage } from "@/lib/hooks/useApi";
import { formatMoney } from "@/lib/money";
import type { AuctionDetail } from "@/lib/types";

import { THREAD_SHELL, ThreadSkeleton } from "./ThreadView";

export function DraftThread({ listingId }: { listingId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const phone = useIsPhone();

  const [auction, setAuction] = useState<AuctionDetail | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    void (async () => {
      try {
        const existing = await findListingThread(listingId);
        if (cancelled) return;
        if (existing) {
          router.replace(`/cont/inbox/${existing.conversation.id}`);
          return;
        }
        const listing = await getAuction(listingId, user.id);
        if (cancelled) return;
        if (listing.sellerId === user.id) {
          router.replace(`/licitatii/${listingId}`);
          return;
        }
        setAuction(listing);
      } catch (caught) {
        if (!cancelled) setFailure(errorMessage(caught));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [listingId, user, router]);

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

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setSendError(null);
    try {
      const thread = await openThread(listingId, body);
      bumpInbox();
      router.replace(`/cont/inbox/${thread.conversation.id}`);
    } catch (caught) {
      setSendError(errorMessage(caught));
      setSending(false);
    }
  };

  if (failure) {
    return place(
      <section className={`${THREAD_SHELL} items-center justify-center p-6`}>
        <EmptyState
          className="border-0 ring-0"
          mood="sad"
          title="Nu am putut deschide conversația"
          description={failure}
        />
      </section>,
    );
  }

  if (!auction) return place(<ThreadSkeleton className="lg:animate-fade-in" />);

  const seller = auction.seller;

  return place(
    <section className={`${THREAD_SHELL} animate-thread-in lg:animate-fade-in`}>
      <header className="shrink-0 border-b border-line">
        <div className="flex animate-fade-in items-center gap-2 p-3">
          <button
            type="button"
            aria-label="Înapoi"
            onClick={() => router.back()}
            className="-ml-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-700 transition hover:bg-ink-100 lg:hidden"
          >
            <Icons.crumb aria-hidden="true" className="h-5 w-5 rotate-180" />
          </button>

          <Link
            href={`/licitatii/${auction.id}`}
            className="hidden min-w-0 flex-1 items-center gap-3 lg:flex"
          >
            {auction.images[0] ? (
              <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-xl">
                <FadeImage
                  src={auction.images[0]}
                  sizes="40px"
                  className="object-cover"
                />
              </span>
            ) : null}
            <span className="min-w-0">
              <span className="block truncate font-display text-[15px] font-extrabold text-ink-900">
                {auction.title}
              </span>
              <span className="block text-[13px] text-ink-600">
                {formatMoney(auction.currentPrice)}
              </span>
            </span>
          </Link>

          <Link
            href={`/profil/${seller.username}`}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl p-1 transition hover:bg-ink-50 lg:max-w-[40%] lg:flex-none lg:pr-1 lg:pl-2"
          >
            <Avatar
              name={seller.displayName}
              src={seller.avatarUrl}
              accountType={seller.accountType}
              size="sm"
            />
            <span className="min-w-0 flex-1 lg:order-first lg:text-right">
              <span className="block truncate font-display text-[15px] font-bold text-ink-900 lg:text-[13px] lg:text-ink-800">
                {seller.displayName}
              </span>
              <span className="block truncate text-[12px] text-ink-500 lg:text-[11px]">
                Vânzător
              </span>
            </span>
          </Link>
        </div>

        <Link
          href={`/licitatii/${auction.id}`}
          className="flex items-center gap-2.5 border-t border-line px-3 py-2 transition hover:bg-ink-50 lg:hidden"
        >
          {auction.images[0] ? (
            <span className="relative block h-8 w-8 shrink-0 overflow-hidden rounded-lg">
              <FadeImage
                src={auction.images[0]}
                sizes="32px"
                className="object-cover"
              />
            </span>
          ) : null}
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink-700">
            {auction.title}
          </span>
          <span className="shrink-0 font-display text-[13px] font-extrabold text-ink-900">
            {formatMoney(auction.currentPrice)}
          </span>
        </Link>
      </header>

      <div className="flex-1" />

      <form onSubmit={send} className="animate-fade-in border-t border-line p-3">
        {sendError ? (
          <p className="mb-2 text-[13px] font-semibold text-danger-700">
            {sendError}
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <textarea
            value={draft}
            autoFocus={!phone}
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
            loading={sending}
          >
            Trimite
          </Button>
        </div>
      </form>
    </section>,
  );
}
