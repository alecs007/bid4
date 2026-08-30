"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Icons } from "@/components/icons";
import {
  CountdownInline,
  SkeletonAuctionCard,
  useToast,
} from "@/components/ui";
import { toggleWatch } from "@/lib/api/auctions";
import { AUCTION_STATUS } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import type { AuctionDetail } from "@/lib/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { revealDelay } from "@/lib/utils/reveal";
import { cn } from "@/lib/utils/cn";
import {
  CARD_BODY,
  CARD_FOOTER,
  CARD_IMPACT,
  CARD_IMPACT_MARK,
  CARD_MEDIA,
  CARD_PRICE,
  CARD_SHELL,
  CARD_TITLE_BOX,
  CARD_TITLE_TYPE,
} from "./cardChrome";

export function AuctionCard({
  auction,
  className,
  style,
}: {
  auction: AuctionDetail;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { user } = useAuth();
  const toast = useToast();

  const [override, setOverride] = useState<boolean | null>(null);
  const watched = override ?? Boolean(auction.isWatched);

  const live = auction.status === "LIVE";
  const cover = auction.images[0] ?? "";

  /** The icon turns before the request leaves; a failed call puts it back. */
  const handleWatch = async () => {
    if (!user) {
      toast.info("Intră în cont pentru a urmări licitații.");
      return;
    }

    const next = !watched;
    setOverride(next);
    // Only the save is worth announcing; removing one speaks for itself.
    if (next) toast.success("Adăugat la urmărite", auction.title);

    try {
      const result = await toggleWatch(auction.id, user.id);
      setOverride(result.watched);
    } catch {
      setOverride(!next);
      toast.error("Licitația nu a putut fi urmărită.");
    }
  };

  return (
    <article
      className={cn(
        CARD_SHELL,
        "group relative transition-transform duration-200 hover:-translate-y-0.5",
        className,
      )}
      style={style}
    >
      <div className={cn(CARD_MEDIA, "bg-ink-100")}>
        <Image
          src={cover}
          alt=""
          fill
          unoptimized
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          draggable={false}
        />
        <button
          type="button"
          onClick={handleWatch}
          aria-pressed={watched}
          aria-label={watched ? "Scoate din listă" : "Salvează în listă"}
          className={cn(
            "absolute top-2 right-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/95 backdrop-blur-sm sm:top-2.5 sm:right-2.5 sm:h-9 sm:w-9",
            "transition duration-200 active:scale-90",
            watched ? "text-primary-600" : "text-ink-500 hover:text-ink-900",
          )}
        >
          <Icons.watchlist
            aria-hidden="true"
            /* fill-transparent, not fill="none": a colour animates to a colour, `none` cannot. */
            className={cn(
              "h-4 w-4 shrink-0 fill-transparent transition-[fill,transform] duration-200 sm:h-[18px] sm:w-[18px]",
              watched && "scale-110 fill-current",
            )}
          />
        </button>
      </div>
      <div className={CARD_BODY}>
        <Link
          href={`/licitatii/${auction.id}`}
          className={cn(
            CARD_TITLE_TYPE,
            "font-bold text-ink-900 after:absolute after:inset-0",
          )}
        >
          <span className={cn(CARD_TITLE_BOX, "line-clamp-2")}>
            {auction.title}
          </span>
        </Link>

        {/* Off the photograph and onto its own line. Two pills over the picture
            covered the thing being sold, which is the one part of a card nobody
            can do without, and the cause still ended up truncated. */}
        <div className={CARD_IMPACT}>
          <span className={CARD_IMPACT_MARK}>
            <Image
              src={auction.cause.imageUrl}
              alt=""
              fill
              unoptimized
              sizes="18px"
              className="object-cover"
              draggable={false}
            />
          </span>
          <span className="min-w-0 truncate text-ink-600">
            <span className="font-extrabold text-primary-800">
              {auction.donationPercent}%
            </span>{" "}
            către {auction.cause.name}
          </span>
        </div>

        <div className={CARD_FOOTER}>
          <span className={CARD_PRICE}>
            {formatMoney(auction.currentPrice, { compact: true })}
          </span>
          {live ? (
            <CountdownInline
              endTime={auction.endTime}
              className="min-w-0 text-xs"
            />
          ) : (
            <span
              className={cn(
                "min-w-0 truncate rounded-md px-1.5 py-0.5 text-xs font-bold",
                auction.status === "SOLD"
                  ? "bg-success-50 text-success-700"
                  : "bg-ink-100 text-ink-600",
              )}
            >
              {AUCTION_STATUS[auction.status].label}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export function AuctionGrid({
  auctions,
  loading,
  skeletonCount = 8,
  columns = 4,
  emptyState,
}: {
  auctions: AuctionDetail[];
  loading?: boolean;
  skeletonCount?: number;
  columns?: 3 | 4;
  emptyState?: React.ReactNode;
}) {
  const gridClass = cn(
    "grid grid-cols-2 gap-3 sm:gap-4",
    columns === 4 ? "lg:grid-cols-4" : "md:grid-cols-3",
  );

  if (loading) {
    return (
      <div
        role="status"
        aria-label="Se încarcă licitațiile"
        className={gridClass}
      >
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <SkeletonAuctionCard key={index} />
        ))}
      </div>
    );
  }

  if (auctions.length === 0) return <>{emptyState}</>;

  return (
    <div className={gridClass}>
      {auctions.map((auction, index) => (
        <AuctionCard
          key={auction.id}
          auction={auction}
          className="animate-reveal"
          style={revealDelay(index)}
        />
      ))}
    </div>
  );
}
