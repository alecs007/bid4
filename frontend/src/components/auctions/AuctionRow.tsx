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

/**
 * Columns, declared, rather than fixed widths that hold their size and end up on
 * top of each other. The item takes what is left — `minmax(0,1fr)` is what lets
 * it shrink instead of pushing the cause block into the buttons — and the two
 * blocks on the right are sized by their content.
 *
 * <p>Only from `lg`. Between the phone and that there is not enough width for
 * four columns without the title becoming a word and a half, so everything
 * stacks instead.
 */
const GRID =
  "lg:grid lg:grid-cols-[auto_minmax(0,1fr)_auto_minmax(11rem,auto)] lg:items-center lg:gap-4";

const THUMB = "aspect-square w-20 shrink-0 rounded-2xl sm:w-24";

export interface RowStat {
  label: string;
  value: string;
  /** The figure that matters most in this row, given its state. */
  emphasis?: boolean;
}

export function AuctionRow({
  auction,
  badges,
  stats,
  footnote,
  actions,
}: {
  auction: AuctionDetail;
  badges?: ReactNode;
  stats?: RowStat[];
  footnote?: string;
  actions?: ReactNode;
}) {
  const cover = auction.images[0] ?? "";

  return (
    <li className={cn(ROW, GRID, "transition hover:ring-ink-300")}>
      <div className="flex items-start gap-3 sm:gap-4 lg:contents">
        <Link
          href={`/licitatii/${auction.id}`}
          // Decorative twice over: the title beside it is the same link, and the
          // photo says nothing a screen reader needs repeated.
          tabIndex={-1}
          aria-hidden="true"
          className={cn(THUMB, "relative overflow-hidden bg-ink-100")}
        >
          {cover ? (
            <Image src={cover} alt="" fill unoptimized sizes="96px" className="object-cover" />
          ) : null}
        </Link>

        {/* min-w-0 is what lets the title truncate instead of stretching the row. */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {badges ? <div className="flex flex-wrap items-center gap-1.5">{badges}</div> : null}
          <Link
            href={`/licitatii/${auction.id}`}
            className="block truncate font-display text-[15px] font-bold text-ink-900 underline-offset-4 hover:underline sm:text-base"
            title={auction.title}
          >
            {auction.title}
          </Link>
          {stats?.length ? <Stats stats={stats} /> : null}
          {footnote ? <p className="truncate text-xs text-ink-500">{footnote}</p> : null}
        </div>
      </div>

      {/* Below `lg` these are rows of their own. Beside the item they left the
          title about a third of the width, and the title is what is being read. */}
      <div className="mt-3 lg:mt-0">
        <CauseBlock auction={auction} />
      </div>
      {actions ? (
        <div className="mt-2 flex items-center justify-end gap-1.5 lg:mt-0">{actions}</div>
      ) : null}
    </li>
  );
}

/**
 * The figures, labelled.
 *
 * <p>Which ones appear is the caller's business, because it depends on what the
 * row is for and what state it is in: an unreviewed listing has only an asking
 * price, a running one has an asking price and what it has reached, and a
 * bidder cares about their own offer against the current one. A number with no
 * label above it is a number somebody has to guess at.
 */
function Stats({ stats }: { stats: RowStat[] }) {
  return (
    <dl className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
      {stats.map((stat) => (
        <div key={stat.label} className="min-w-0">
          <dt className="text-[11px] leading-tight font-bold text-ink-500">
            {stat.label}
          </dt>
          <dd
            className={cn(
              "font-display leading-tight font-bold",
              stat.emphasis ? "text-[15px] text-ink-900" : "text-sm text-ink-700",
            )}
          >
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * What this listing is actually for.
 *
 * <p>The donation is the reason the platform exists, and a bare percentage is a
 * number about nothing: this carries the cause's picture, its name, and what the
 * current price would hand over. The figure moves with the bidding.
 *
 * <p>Plain rather than a green panel. On a list where every row has one, a block
 * of colour per row is stripes, and the layout stops reading as a list — the
 * amount alone is coloured, which is the part worth the emphasis.
 */
function CauseBlock({ auction }: { auction: AuctionDetail }) {
  const share = percentOf(auction.currentPrice, auction.donationPercent);

  return (
    <Link
      href={`/cauze/${auction.cause.slug}`}
      className="flex min-w-0 items-center gap-2.5 rounded-2xl p-1.5 ring-1 ring-edge transition hover:bg-ink-50 hover:ring-ink-300 lg:w-56"
    >
      <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-ink-100">
        {auction.cause.imageUrl ? (
          <Image
            src={auction.cause.imageUrl}
            alt=""
            fill
            unoptimized
            sizes="36px"
            className="object-cover"
          />
        ) : null}
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] leading-tight font-bold text-ink-500">
          Donație de {auction.donationPercent}%
        </span>
        <span className="block truncate font-display text-sm leading-tight font-bold text-primary-800">
          {formatMoney(share)}
          <span className="font-bold text-ink-600"> · {auction.cause.name}</span>
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
        <li key={index} className={cn(ROW, GRID)}>
          <div className="flex items-start gap-3 sm:gap-4 lg:contents">
            <Skeleton className={THUMB} />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-[18px] w-28 rounded-full" />
              <Skeleton className="h-5 w-2/3 rounded-lg" />
              <div className="flex gap-5">
                <Skeleton className="h-8 w-24 rounded-lg" />
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
              <Skeleton className="h-4 w-40 rounded-lg" />
            </div>
          </div>
          <div className="mt-3 lg:mt-0">
            <Skeleton className="h-12 w-full rounded-2xl lg:w-56" />
          </div>
          <div className="mt-2 flex justify-end lg:mt-0">
            <Skeleton className="h-8 w-40 rounded-xl" />
          </div>
        </li>
      ))}
    </ul>
  );
}
