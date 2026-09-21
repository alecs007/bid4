"use client";

import { useState } from "react";

import {
  BiddersModal,
  OfferRow,
  sellerOrder,
  useAcceptOffer,
} from "@/app/cont/_components/BiddersModal";
import { Button, Sheet, SkeletonBidRows } from "@/components/ui";
import type { AuctionDetail, BidWithBidder } from "@/lib/types";
import { isOfferable } from "@/lib/types";

const INLINE_COUNT = 3;

const EMPTY = "Încă nu există oferte.";

export function BidHistory({
  bids,
  loading,
}: {
  bids: BidWithBidder[] | null;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (loading && !bids) return <SkeletonBidRows />;

  if (!bids || bids.length === 0) {
    return <p className="text-sm text-ink-500">{EMPTY}</p>;
  }

  const inline = bids.slice(0, INLINE_COUNT);
  const rest = bids.length - inline.length;

  return (
    <>
      <ul className="divide-y divide-line">
        {inline.map((bid, index) => (
          <OfferRow
            key={bid.id}
            bid={bid}
            highlight={index === 0}
            canAct={false}
            pending={false}
            busy={false}
            onAccept={() => undefined}
          />
        ))}
      </ul>

      {rest > 0 ? (
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          className="mt-3"
          onClick={() => setOpen(true)}
        >
          Vezi toate ofertele ({bids.length})
        </Button>
      ) : null}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Ofertele primite"
      >
        <ul className="divide-y divide-line">
          {bids.map((bid, index) => (
            <OfferRow
            key={bid.id}
            bid={bid}
            highlight={index === 0}
            canAct={false}
            pending={false}
            busy={false}
            onAccept={() => undefined}
          />
          ))}
        </ul>
      </Sheet>
    </>
  );
}

export function SellerOffers({
  auction,
  bids,
  loading,
  sellerId,
}: {
  auction: AuctionDetail;
  bids: BidWithBidder[] | null;
  loading: boolean;
  sellerId: string;
}) {
  const [open, setOpen] = useState(false);
  const { accept, pendingId } = useAcceptOffer(auction.id, sellerId);

  if (loading && !bids) return <SkeletonBidRows />;
  if (!bids || bids.length === 0) {
    return <p className="text-sm text-ink-500">{EMPTY}</p>;
  }

  const canAct = isOfferable(auction.status);

  return (
    <>
      <ul className="divide-y divide-line">
        {sellerOrder(bids).slice(0, INLINE_COUNT).map((bid) => (
          <OfferRow
            key={bid.id}
            bid={bid}
            highlight={bid.status === "WINNING"}
            canAct={canAct}
            pending={pendingId === bid.id}
            busy={pendingId !== null}
            onAccept={() => void accept(bid)}
          />
        ))}
      </ul>

      {bids.length > INLINE_COUNT ? (
        <>
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            className="mt-3"
            onClick={() => setOpen(true)}
          >
            Vezi toate ofertele ({bids.length})
          </Button>

          <BiddersModal
            auction={open ? auction : null}
            open={open}
            onClose={() => setOpen(false)}
            sellerId={sellerId}
          />
        </>
      ) : null}
    </>
  );
}
