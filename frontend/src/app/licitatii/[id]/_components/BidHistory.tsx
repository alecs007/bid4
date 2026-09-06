"use client";

import { useState } from "react";

import { Avatar, Sheet, SkeletonBidRows } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import type { BidWithBidder } from "@/lib/types";
import { formatRelativeRo } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

const INLINE_COUNT = 3;

function BidRow({
  bid,
  leading,
  className,
}: {
  bid: BidWithBidder;
  leading?: boolean;
  className?: string;
}) {
  return (
    <li className={cn("flex items-center gap-2.5 py-2", className)}>
      <Avatar
        name={bid.bidderDisplayName}
        src={bid.bidderAvatarUrl}
        size="xs"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink-900">
          {bid.bidderDisplayName}
        </p>
        <p className="text-xs text-ink-500">
          {formatRelativeRo(bid.createdAt)}
        </p>
      </div>
      <span
        className={cn(
          "numeric font-display font-extrabold",
          leading ? "text-primary-700" : "text-ink-700",
        )}
      >
        {formatMoney(bid.amount, { compact: true })}
      </span>
    </li>
  );
}

export function BidHistory({
  bids,
  loading,
  startingPrice,
}: {
  bids: BidWithBidder[] | null;
  loading: boolean;
  startingPrice: number;
}) {
  const [open, setOpen] = useState(false);

  // Only before there is anything to show. Falling back to the skeleton on
  // every revalidation swapped a list of offers for a block of a different
  // height and back again, which shoved everything below it down the page for
  // as long as the refetch took.
  if (loading && !bids) return <SkeletonBidRows />;

  if (!bids || bids.length === 0) {
    return (
      <p className="text-sm text-ink-500">
        Nicio ofertă încă. Pornește de la {formatMoney(startingPrice)}.
      </p>
    );
  }

  const inline = bids.slice(0, INLINE_COUNT);
  const rest = bids.length - inline.length;

  return (
    <>
      <ul className="divide-y divide-line">
        {inline.map((bid, index) => (
          <BidRow key={bid.id} bid={bid} leading={index === 0} />
        ))}
      </ul>

      {rest > 0 ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-1.5 text-sm font-bold text-primary-700 hover:text-primary-800"
        >
          Vezi toate ofertele ({bids.length})
        </button>
      ) : null}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={`${bids.length} licitații`}
      >
        <ul className="divide-y divide-line">
          {bids.map((bid, index) => (
            <BidRow key={bid.id} bid={bid} leading={index === 0} />
          ))}
        </ul>
      </Sheet>
    </>
  );
}
