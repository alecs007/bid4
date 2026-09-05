"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Icons } from "@/components/icons";
import { SkeletonAuctionCard, useToast } from "@/components/ui";
import { toggleWatch } from "@/lib/api/auctions";
import { AUCTION_STATUS } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import type { AuctionDetail } from "@/lib/types";
import { isOfferable } from "@/lib/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { countRo } from "@/lib/utils/plural";
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

  /**
   * How many people have this on their list, counting the reader's own tap before the server has
   * agreed to it — the icon turns immediately and a number beside it that lagged would read as the
   * save not having landed.
   */
  const following = Math.max(
    0,
    auction.watcherCount +
      (watched === Boolean(auction.isWatched) ? 0 : watched ? 1 : -1),
  );

  // Reserved reads as open here, because it is: the listing still takes offers,
  // and whose offer the seller took is between them and that buyer. A card that
  // announced it would discourage exactly the better offer the seller left the
  // listing up for.
  const live = isOfferable(auction.status);
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
          // Faded in rather than swapped in. next/image fires this after
          // decode(), and fires it too for an image already complete before
          // hydration, so the attribute always lands and a photo is never left
          // at zero. Without it a grid of cards snaps in one card at a time, in
          // whatever order the network answers.
          //
          // Written out as one `transition` because the two need different
          // speeds: the photograph should arrive in about a fifth of a second,
          // where the hover zoom is a 500ms move. It names translate/scale/
          // rotate as well, which is what `transition-transform` is short for
          // in Tailwind v4 — `scale-*` sets the standalone `scale` property, so
          // a list of just `transform` leaves the zoom to jump.
          onLoad={(event) =>
            event.currentTarget.setAttribute("data-loaded", "true")
          }
          className="object-cover opacity-0 [transition:opacity_220ms_ease-out,transform_500ms,translate_500ms,scale_500ms,rotate_500ms] group-hover:scale-[1.04] data-[loaded=true]:opacity-100"
          draggable={false}
        />
        <button
          type="button"
          onClick={handleWatch}
          aria-pressed={watched}
          aria-label={
            (watched ? "Scoate din listă" : "Salvează în listă") +
            (following > 0
              ? `, ${countRo(following, "urmăritor", "urmăritori")}`
              : "")
          }
          className={cn(
            // Bottom right of the picture rather than the top: the corner a
            // thumb reaches, and clear of the title and price below it.
            "absolute right-2 bottom-2 z-10 inline-flex h-6 items-center justify-center rounded-lg bg-white/95 px-1.5 ring-1 ring-ink-900/10 backdrop-blur-sm sm:right-2.5 sm:bottom-2.5 sm:h-7 sm:px-2",
            "transition duration-200 active:scale-90",
            watched ? "text-primary-600" : "text-ink-500 hover:text-ink-900",
          )}
        >
          {/* The reason to save it, said by the people who already did, and read
              first. Always mounted and opened by a grid column, so the first
              save widens the button rather than making it jump; the gap lives
              inside the column, which is what lets it close to nothing. Spoken
              as part of the button's own label, where a bare digit means
              nothing on its own. */}
          <span
            aria-hidden="true"
            className={cn(
              "grid transition-[grid-template-columns,opacity] duration-200 ease-[var(--ease-out-soft)]",
              // minmax(0,…): a bare 0fr track still floors at its content's
              // min width, and the digit's own right padding is part of that —
              // which left a sliver of empty space on the left of an icon that
              // had no count to show.
              following > 0
                ? "grid-cols-[minmax(0,1fr)] opacity-100"
                : "grid-cols-[minmax(0,0fr)] opacity-0",
            )}
          >
            <span className="numeric overflow-hidden pr-1 text-[11px] leading-none font-bold">
              {following}
            </span>
          </span>
          <Icons.watchlist
            aria-hidden="true"
            /* fill-transparent, not fill="none": a colour animates to a colour, `none` cannot. */
            className={cn(
              "h-3.5 w-3.5 shrink-0 fill-transparent transition-[fill,transform] duration-200 sm:h-4 sm:w-4",
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
          {/* Where the countdown was. A listing has no deadline to show, so the
              slot carries the one number that still says how much interest it
              has drawn — and nothing at all when there is none, because a row of
              cards each announcing "no offers" reads as a catalogue nobody
              wants. */}
          {live ? (
            auction.bidCount > 0 ? (
              <span className="min-w-0 truncate text-xs font-semibold text-ink-500">
                {countRo(auction.bidCount, "ofertă", "oferte")}
              </span>
            ) : null
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
