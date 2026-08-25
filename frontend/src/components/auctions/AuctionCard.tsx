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
  const cover = auction.product.images[0] ?? "";

  /**
   * The icon turns before the request leaves: saving is the viewer's decision,
   * not the server's opinion of it. The answer only confirms — or, if the call
   * fails, puts the icon back where it was.
   */
  const handleWatch = async () => {
    if (!user) {
      toast.info("Intră în cont ca să salvezi licitații.");
      return;
    }

    const next = !watched;
    setOverride(next);
    // Only the save is worth announcing; removing one speaks for itself.
    if (next) toast.success("Adăugat la salvate", auction.product.title);

    try {
      const result = await toggleWatch(auction.id, user.id);
      setOverride(result.watched);
    } catch {
      setOverride(!next);
      toast.error("Licitația nu a putut fi salvată.");
    }
  };

  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-3xl bg-white ring-1 ring-edge p-2 transition-transform duration-200 hover:-translate-y-0.5",
        className,
      )}
      style={style}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-ink-100">
        <Image
          src={cover}
          alt=""
          fill
          unoptimized
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-lg bg-white/95 px-2 py-1 text-sm font-extrabold text-primary-800 backdrop-blur-sm">
          <Icons.donation aria-hidden="true" className="h-4 w-4" />
          {auction.donationPercent}%
        </span>
        <span className="absolute inset-x-2 bottom-2 flex items-center gap-1.5 rounded-lg bg-white/95 py-1 pr-2 pl-1 backdrop-blur-sm">
          <span className="relative h-5 w-5 shrink-0 overflow-hidden rounded-md bg-ink-100">
            <Image
              src={auction.cause.imageUrl}
              alt=""
              fill
              unoptimized
              sizes="20px"
              className="object-cover"
            />
          </span>
          <span className="min-w-0 truncate text-xs font-bold">
            <span className="text-primary-700">#bid4</span>{" "}
            <span className="text-ink-700">{auction.cause.name}</span>
          </span>
        </span>
        <button
          type="button"
          onClick={handleWatch}
          aria-pressed={watched}
          aria-label={watched ? "Scoate din listă" : "Salvează în listă"}
          className={cn(
            "absolute top-2.5 right-2.5 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/95 backdrop-blur-sm",
            "transition duration-200 active:scale-90",
            watched ? "text-primary-600" : "text-ink-500 hover:text-ink-900",
          )}
        >
          <Icons.watchlist
            aria-hidden="true"
            /* fill-transparent, not the svg's own fill="none": a colour can be
               animated to another colour, `none` cannot. */
            className={cn(
              "h-[18px] w-[18px] fill-transparent transition-[fill,transform] duration-200",
              watched && "scale-110 fill-current",
            )}
          />
        </button>
      </div>
      <div className="flex flex-1 flex-col px-2 pt-2 pb-1.5">
        <Link
          href={`/licitatii/${auction.id}`}
          className="font-display text-[15px] leading-[1.3] font-bold text-ink-900 after:absolute after:inset-0 sm:text-base"
        >
          <span className="line-clamp-2 min-h-[2.6em]">
            {auction.product.title}
          </span>
        </Link>
        <div className="mt-auto flex items-end justify-between gap-1.5 pt-2.5">
          <span className="numeric shrink-0 font-display text-xl leading-none font-extrabold tracking-tight whitespace-nowrap text-ink-900 sm:text-2xl">
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
