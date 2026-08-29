"use client";

import { listBids } from "@/lib/api/bids";
import { useApi } from "@/lib/hooks/useApi";
import { formatMoney } from "@/lib/money";
import { formatDateTimeRo } from "@/lib/utils/date";
import { Avatar, Modal, Skeleton } from "@/components/ui";
import type { AuctionDetail } from "@/lib/types";

/**
 * Who has offered what, for one listing.
 *
 * <p>A seller looking at "three offers" wants to know whose, and for how much,
 * and the count alone sends them to the public page to find out. Loaded when it
 * is opened rather than with the list, because a page of twelve rows would
 * otherwise fetch twelve histories nobody asked for.
 *
 * <p>Names are the pseudonymised ones the API already returns — "Andrei M." —
 * so this shows a seller no more than the listing does.
 */
export function BiddersModal({
  auction,
  open,
  onClose,
}: {
  auction: AuctionDetail | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data, loading, error } = useApi(
    () => listBids(auction!.id),
    `bids:${auction?.id}`,
    { enabled: open && Boolean(auction) },
  );

  return (
    <Modal
      open={open}
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
        <p className="text-sm text-ink-600">Nu s-a licitat încă.</p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {data.map((bid, index) => (
            <li
              key={bid.id}
              className="flex items-center gap-3 rounded-2xl px-2 py-1.5 ring-1 ring-edge"
            >
              <Avatar name={bid.bidderDisplayName} src={bid.bidderAvatarUrl} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-ink-900">
                  {bid.bidderDisplayName}
                </span>
                <span className="block truncate text-xs text-ink-500">
                  {formatDateTimeRo(bid.createdAt)}
                </span>
              </span>
              {/* The list arrives highest first, so the top row is the one in
                  front — worth saying rather than leaving to be inferred. */}
              <span
                className={
                  index === 0
                    ? "font-display font-bold text-primary-700"
                    : "font-display font-bold text-ink-600"
                }
              >
                {formatMoney(bid.amount)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}
