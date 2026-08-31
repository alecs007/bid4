"use client";

import { useState } from "react";

import { acceptOffer, releaseOffer } from "@/lib/api/auctions";
import { listOffersOnMyAuction } from "@/lib/api/bids";
import { useAction, useApi, useRevalidate } from "@/lib/hooks/useApi";
import { formatMoney } from "@/lib/money";
import { formatDateTimeRo } from "@/lib/utils/date";
import { Avatar, Button, Modal, Skeleton, useToast } from "@/components/ui";
import { Icons } from "@/components/icons";
import { COPY } from "@/lib/labels";
import type { AuctionDetail, BidWithBidder } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * Who has offered what, for one of the seller's own listings — and which one they take.
 *
 * <p>This is the view the whole model turns on. A listing has no clock, so nothing picks a buyer
 * on the seller's behalf: they read the offers and choose, and they may choose **any** of them.
 * The highest is marked, not privileged.
 *
 * <p>Loaded when it is opened rather than with the list, because a page of twelve rows would
 * otherwise fetch twelve histories nobody asked for.
 *
 * <p>Unlike the public history on the listing page, names here are not shortened: the person
 * deciding who to sell to is not a stranger, and the API gives them what any public profile
 * already shows.
 */
export function BiddersModal({
  auction,
  open,
  onClose,
  sellerId,
}: {
  auction: AuctionDetail | null;
  open: boolean;
  onClose: () => void;
  /** Present when the viewer owns the listing, which is what unlocks accepting. */
  sellerId?: string;
}) {
  const toast = useToast();
  const revalidate = useRevalidate();
  const [confirming, setConfirming] = useState<BidWithBidder | null>(null);

  const canAct = Boolean(sellerId) && auction?.sellerId === sellerId;

  const { data, loading, error, reload } = useApi(
    () => listOffersOnMyAuction(auction!.id, sellerId!),
    `offers:${auction?.id}`,
    { enabled: open && Boolean(auction) && canAct },
  );

  const accept = useAction(async (bid: BidWithBidder) => {
    await acceptOffer(auction!.id, bid.id, sellerId!);
    return bid;
  });

  const release = useAction(async () => {
    await releaseOffer(auction!.id, sellerId!);
  });

  const settled = () => {
    reload();
    // The listing leaves the public catalogue's live set and changes on every
    // shelf that counted it.
    revalidate("my-sales", "auctions", "causes", "featured");
  };

  const confirmAccept = async () => {
    if (!confirming) return;
    const done = await accept.run(confirming);
    if (!done) return;
    setConfirming(null);
    toast.success(
      "Ofertă acceptată",
      `${done.bidderDisplayName} are de făcut plata.`,
    );
    settled();
  };

  const undoAccept = async () => {
    await release.run();
    toast.info("Anunțul a revenit în licitație");
    settled();
  };

  const reserved = auction?.status === "RESERVED";
  const pending = accept.pending || release.pending;

  return (
    <>
      <Modal
        open={open && confirming === null}
        onClose={onClose}
        title="Ofertele primite"
        description={auction?.title}
        size="sm"
      >
        {loading && !data ? (
          <ul className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <li key={index} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                <Skeleton className="h-5 flex-1 rounded-lg" />
              </li>
            ))}
          </ul>
        ) : error ? (
          <p className="text-sm text-danger-700">{error}</p>
        ) : !data?.length ? (
          <p className="text-sm text-ink-600">Nu a venit nicio ofertă încă.</p>
        ) : (
          <>
            {reserved ? (
              <div className="mb-3 rounded-2xl bg-sky-50 px-3 py-2.5">
                <p className="text-sm font-bold text-sky-900">
                  Ai acceptat o ofertă
                </p>
                <p className="mt-0.5 text-sm text-sky-800">
                  Aștepți plata. Până atunci poți anula acceptarea, iar anunțul
                  revine în licitație.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2.5"
                  loading={release.pending}
                  onClick={undoAccept}
                >
                  Anulează acceptarea
                </Button>
              </div>
            ) : (
              <p className="mb-3 text-sm text-ink-600">
                {COPY.sellerChoosesExplainer}
              </p>
            )}

            <ol className="flex flex-col gap-1.5">
              {data.map((bid, index) => {
                const accepted =
                  bid.status === "ACCEPTED" || bid.status === "WON";
                return (
                  <li
                    key={bid.id}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-2 py-1.5 ring-1",
                      accepted ? "bg-sky-50 ring-sky-200" : "ring-edge",
                    )}
                  >
                    <Avatar
                      name={bid.bidderDisplayName}
                      src={bid.bidderAvatarUrl}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink-900">
                        {bid.bidderDisplayName}
                      </span>
                      <span className="block truncate text-xs text-ink-500">
                        {accepted
                          ? "Ofertă acceptată"
                          : formatDateTimeRo(bid.createdAt)}
                      </span>
                    </span>

                    <span className="flex shrink-0 items-center gap-2">
                      {/* The list arrives highest first. Marked, not privileged:
                          the seller is free to take any row on this list. */}
                      <span
                        className={cn(
                          "font-display font-bold",
                          index === 0 ? "text-primary-700" : "text-ink-600",
                        )}
                      >
                        {formatMoney(bid.amount)}
                      </span>

                      {accepted ? (
                        <Icons.success
                          aria-label="Acceptată"
                          className="h-4 w-4 shrink-0 text-sky-700"
                        />
                      ) : canAct && !reserved ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={pending}
                          onClick={() => setConfirming(bid)}
                        >
                          Acceptă
                        </Button>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </Modal>

      <Modal
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        title="Accepți oferta?"
        description={
          confirming
            ? `Vinzi către ${confirming.bidderDisplayName} la ${formatMoney(confirming.amount)}. Anunțul nu mai primește oferte, iar cumpărătorul are de făcut plata.`
            : undefined
        }
        size="sm"
      >
        <div className="flex gap-2">
          <Button
            className="flex-1"
            loading={accept.pending}
            onClick={confirmAccept}
          >
            Acceptă oferta
          </Button>
          <Button variant="secondary" onClick={() => setConfirming(null)}>
            Renunță
          </Button>
        </div>
      </Modal>
    </>
  );
}
