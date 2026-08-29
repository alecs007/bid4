"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui";
import type { AuctionDetail } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * The frame, shared with the skeleton below so the two cannot drift. A
 * placeholder that is a different height from the thing it stands in for makes
 * the page jump when the data lands, which is the one job it had.
 */
const ROW =
  "flex items-center gap-3 rounded-3xl bg-white ring-1 ring-edge p-3 sm:gap-4 sm:p-4";

const THUMB = "aspect-square w-16 shrink-0 rounded-2xl sm:w-20";

/**
 * One auction as a wide row: thumbnail, then what it is, then what you can do
 * about it.
 *
 * <p>The account pages list the same object for two different reasons — what I am
 * selling, what I bid on — so the frame is shared and only the middle and the
 * buttons differ. Keeping it in one place is what stops the two lists drifting
 * into two slightly different cards.
 */
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
      <Link
        href={`/licitatii/${auction.id}`}
        // Decorative twice over: the title beside it is the same link, and the
        // photo says nothing a screen reader needs repeated.
        tabIndex={-1}
        aria-hidden="true"
        className={cn(THUMB, "relative overflow-hidden bg-ink-100")}
      >
        {cover ? (
          <Image
            src={cover}
            alt=""
            fill
            unoptimized
            sizes="80px"
            className="object-cover"
          />
        ) : null}
      </Link>

      {/* min-w-0 is what lets the title truncate instead of stretching the row. */}
      <div className="min-w-0 flex-1">
        {badges ? <div className="flex flex-wrap items-center gap-1.5">{badges}</div> : null}
        <Link
          href={`/licitatii/${auction.id}`}
          className={cn(
            "block truncate font-display font-bold text-ink-900 underline-offset-4 hover:underline",
            "text-base sm:text-lg",
            badges ? "mt-1.5" : null,
          )}
          title={auction.title}
        >
          {auction.title}
        </Link>
        {meta ? <p className="mt-1 truncate text-sm text-ink-600">{meta}</p> : null}
        {footnote ? <p className="mt-0.5 truncate text-xs text-ink-500">{footnote}</p> : null}
      </div>

      {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
    </li>
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
          <Skeleton className={THUMB} />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-[22px] w-28 rounded-full" />
            <Skeleton className="mt-1.5 h-7 w-2/3 rounded-xl" />
            <Skeleton className="mt-1 h-5 w-1/2 rounded-lg" />
            <Skeleton className="mt-0.5 h-4 w-40 rounded-lg" />
          </div>
        </li>
      ))}
    </ul>
  );
}
