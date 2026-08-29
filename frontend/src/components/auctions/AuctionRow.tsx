"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui";
import { formatMoney, percentOf } from "@/lib/money";
import type { AuctionDetail } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * The frame, shared with the skeleton below so the two cannot drift. A
 * placeholder that is a different height from the thing it stands in for makes
 * the page jump when the data lands, which is the one job it had.
 */
const ROW = "rounded-3xl bg-white ring-1 ring-edge p-3 sm:p-4";

const THUMB = "aspect-square w-16 shrink-0 rounded-2xl sm:w-20";

/**
 * The identity block is capped at the height of the photo beside it, so the row
 * is the photo's height and not whatever the text happened to need. Three lines
 * fit: what state it is in, what it is, and the numbers.
 */
const IDENTITY = "flex min-w-0 flex-1 flex-col justify-center gap-1 sm:h-20";

export function AuctionRow({
  auction,
  badges,
  meta,
  footnote,
  actions,
}: {
  auction: AuctionDetail;
  badges?: ReactNode;
  meta?: ReactNode;
  footnote?: ReactNode;
  actions?: ReactNode;
}) {
  const cover = auction.images[0] ?? "";

  return (
    <li className={cn(ROW, "transition hover:ring-ink-300")}>
      <div className="flex items-start gap-3 sm:items-center sm:gap-4">
        <Link
          href={`/licitatii/${auction.id}`}
          // Decorative twice over: the title beside it is the same link, and the
          // photo says nothing a screen reader needs repeated.
          tabIndex={-1}
          aria-hidden="true"
          className={cn(THUMB, "relative overflow-hidden bg-ink-100")}
        >
          {cover ? (
            <Image src={cover} alt="" fill unoptimized sizes="80px" className="object-cover" />
          ) : null}
        </Link>

        {/* min-w-0 is what lets the title truncate instead of stretching the row. */}
        <div className={IDENTITY}>
          {badges ? <div className="flex flex-wrap items-center gap-1">{badges}</div> : null}
          <Link
            href={`/licitatii/${auction.id}`}
            className="block truncate font-display text-[15px] font-bold text-ink-900 underline-offset-4 hover:underline sm:text-base"
            title={auction.title}
          >
            {auction.title}
          </Link>
          {meta ? <p className="truncate text-sm text-ink-600">{meta}</p> : null}
          {footnote ? <p className="truncate text-xs text-ink-500">{footnote}</p> : null}
        </div>

        {/* From `sm` up the donation and the actions sit beside the item. Below
            it, both drop to their own rows — a 375px line cannot hold an item
            and its controls without one of them becoming unreadable. */}
        <div className="hidden shrink-0 items-center gap-3 sm:flex">
          <DonationBadge auction={auction} />
          {/* A fixed slot, so a row with one action puts it where a row with two
              puts its last one — otherwise the column zigzags down the list. */}
          {actions ? (
            <div className="flex w-44 items-center justify-end gap-1">{actions}</div>
          ) : null}
        </div>
      </div>

      <div className="mt-2.5 flex flex-col gap-2 sm:hidden">
        <DonationBadge auction={auction} />
        {actions ? <div className="flex items-center justify-end gap-1.5">{actions}</div> : null}
      </div>
    </li>
  );
}

/**
 * What this listing is actually for.
 *
 * <p>The donation is the reason the platform exists, and a bare "40%" is a
 * number about nothing. This carries the cause it belongs to, its picture, and
 * what the current price would hand over — so the row answers "how much help is
 * this, and to whom" without opening anything.
 *
 * <p>The figure moves with the bidding, and is what the price would give away if
 * the auction closed now.
 */
function DonationBadge({ auction }: { auction: AuctionDetail }) {
  const share = percentOf(auction.currentPrice, auction.donationPercent);

  return (
    <Link
      href={`/cauze/${auction.cause.slug}`}
      className="flex min-w-0 items-center gap-2 rounded-2xl bg-primary-50 py-1.5 pr-3 pl-1.5 ring-1 ring-primary-100 transition hover:bg-primary-100 sm:w-60"
    >
      <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-xl bg-white">
        {auction.cause.imageUrl ? (
          <Image
            src={auction.cause.imageUrl}
            alt=""
            fill
            unoptimized
            sizes="32px"
            className="object-cover"
          />
        ) : null}
      </span>
      <span className="min-w-0">
        <span className="block text-sm leading-tight font-extrabold text-primary-900">
          {formatMoney(share)}
          <span className="font-bold text-primary-800"> · {auction.donationPercent}%</span>
        </span>
        <span className="block truncate text-xs leading-tight text-primary-800">
          {auction.cause.name}
        </span>
      </span>
    </Link>
  );
}

/**
 * The same row with its content removed. Built from the same class constants, so
 * the placeholder is the height of the row it replaces by construction rather
 * than by somebody remembering to keep two numbers in step.
 */
export function AuctionRowSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="flex flex-col gap-2.5" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <li key={index} className={ROW}>
          <div className="flex items-start gap-3 sm:items-center sm:gap-4">
            <Skeleton className={THUMB} />
            <div className={IDENTITY}>
              <Skeleton className="h-4 w-24 rounded-full" />
              <Skeleton className="h-5 w-2/3 rounded-lg" />
              <Skeleton className="h-4 w-1/2 rounded-lg" />
            </div>
            <div className="hidden shrink-0 items-center gap-3 sm:flex">
              <Skeleton className="h-11 w-60 rounded-2xl" />
              <Skeleton className="h-8 w-44 rounded-xl" />
            </div>
          </div>
          <div className="mt-2.5 flex flex-col gap-2 sm:hidden">
            <Skeleton className="h-11 w-full rounded-2xl" />
            <Skeleton className="h-8 w-full rounded-xl" />
          </div>
        </li>
      ))}
    </ul>
  );
}
