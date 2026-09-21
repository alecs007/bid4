"use client";

import { useState } from "react";

import { Avatar, Button, Modal, Skeleton, useToast } from "@/components/ui";
import { acceptOffer } from "@/lib/api/auctions";
import { listOffersOnMyAuction } from "@/lib/api/bids";
import { bumpInbox } from "@/lib/api/inbox-sync";
import { errorMessage, useApi, useRevalidate } from "@/lib/hooks/useApi";
import { formatMoney } from "@/lib/money";
import type { AuctionDetail, BidWithBidder } from "@/lib/types";
import { formatDateTimeRo } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

export function isSettledOffer(bid: Pick<BidWithBidder, "status">): boolean {
  return bid.status === "ACCEPTED" || bid.status === "WON";
}

export function useAcceptOffer(auctionId: string | undefined, sellerId?: string) {
  const toast = useToast();
  const revalidate = useRevalidate();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const accept = async (bid: BidWithBidder) => {
    if (!auctionId || !sellerId || pendingId) return false;
    setPendingId(bid.id);
    try {
      await acceptOffer(auctionId, bid.id, sellerId);
      revalidate(
        `auction:${auctionId}`,
        `bids:${auctionId}`,
        `offers:${auctionId}`,
        "my-sales",
        "auctions",
        "featured",
        "inbox:",
      );
      bumpInbox();
      return true;
    } catch (failure) {
      toast.error(errorMessage(failure));
      return false;
    } finally {
      setPendingId(null);
    }
  };

  return { accept, pendingId };
}

export function OfferRow({
  bid,
  highlight,
  canAct,
  pending,
  busy,
  onAccept,
}: {
  bid: BidWithBidder;
  highlight: boolean;
  canAct: boolean;
  pending: boolean;
  busy: boolean;
  onAccept: () => void;
}) {
  const accepted = isSettledOffer(bid);

  return (
    <li className="flex items-center gap-3 py-2">
      <Avatar name={bid.bidderDisplayName} src={bid.bidderAvatarUrl} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-ink-900">
          {bid.bidderDisplayName}
        </span>
        <span className="block truncate text-xs text-ink-500">
          {formatDateTimeRo(bid.createdAt)}
        </span>
      </span>
      <span
        className={cn(
          "numeric shrink-0 font-display font-extrabold",
          highlight ? "text-primary-700" : "text-ink-700",
        )}
      >
        {formatMoney(bid.amount, { compact: true })}
      </span>
      {accepted ? (
        <span className="shrink-0 rounded-lg bg-sky-50 px-2 py-1 text-xs font-bold text-sky-800">
          Acceptată
        </span>
      ) : canAct && bid.status !== "LOST" ? (
        <Button
          size="sm"
          variant="secondary"
          className="shrink-0"
          loading={pending}
          disabled={busy && !pending}
          onClick={onAccept}
        >
          Acceptă
        </Button>
      ) : null}
    </li>
  );
}

export function BiddersModal({
  auction,
  open,
  onClose,
  sellerId,
}: {
  auction: AuctionDetail | null;
  open: boolean;
  onClose: () => void;
  sellerId?: string;
}) {
  const canAct =
    Boolean(sellerId) &&
    auction?.sellerId === sellerId &&
    (auction?.status === "LIVE" || auction?.status === "RESERVED");

  const { data, loading, error } = useApi(
    () => listOffersOnMyAuction(auction!.id, sellerId!),
    `offers:${auction?.id}`,
    {
      enabled:
        open && Boolean(auction) && Boolean(sellerId) && auction?.sellerId === sellerId,
    },
  );

  const { accept, pendingId } = useAcceptOffer(auction?.id, sellerId);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ofertele primite"
      description={auction?.title}
      size="sm"
    >
      {loading && !data ? (
        <ul className="flex flex-col divide-y divide-line">
          {Array.from({ length: 3 }).map((_, index) => (
            <li key={index} className="flex items-center gap-3 py-2">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <span className="flex-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-1 h-3 w-20" />
              </span>
              <Skeleton className="h-5 w-14" />
            </li>
          ))}
        </ul>
      ) : error ? (
        <p className="text-sm text-danger-700">{error}</p>
      ) : !data?.length ? (
        <p className="text-sm text-ink-600">Încă nu există oferte.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {data.map((bid, index) => (
            <OfferRow
              key={bid.id}
              bid={bid}
              highlight={index === 0}
              canAct={canAct}
              pending={pendingId === bid.id}
              busy={pendingId !== null}
              onAccept={() => void accept(bid)}
            />
          ))}
        </ul>
      )}
    </Modal>
  );
}
