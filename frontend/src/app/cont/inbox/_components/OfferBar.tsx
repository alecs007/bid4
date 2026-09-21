"use client";

import { Button, Skeleton } from "@/components/ui";
import { checkRetractEligibility } from "@/lib/api/bids";
import { formatMoney } from "@/lib/money";
import type { AuctionDetail, BidWithBidder } from "@/lib/types";
import { isOfferable } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const BAR =
  "flex shrink-0 animate-fade-in items-center gap-3 border-b border-line bg-canvas px-3 py-2";

function Figure({
  label,
  amount,
  note,
  noteTone = "muted",
}: {
  label: string;
  amount?: number;
  note?: string;
  noteTone?: "muted" | "good" | "warn";
}) {
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate text-[12px] text-ink-500">
        {label}
        {note ? (
          <span
            className={cn(
              "ml-1.5 font-bold",
              noteTone === "good" && "text-primary-700",
              noteTone === "warn" && "text-sun-700",
              noteTone === "muted" && "text-ink-500",
            )}
          >
            · {note}
          </span>
        ) : null}
      </p>
      {amount !== undefined ? (
        <p className="numeric font-display text-[17px] leading-tight font-extrabold text-ink-900">
          {formatMoney(amount)}
        </p>
      ) : null}
    </div>
  );
}

export function BuyerOfferBar({
  auction,
  viewerId,
  onModify,
  onWithdraw,
}: {
  auction: AuctionDetail | null;
  viewerId: string;
  onModify: () => void;
  onWithdraw: () => void;
}) {
  if (!auction) {
    return (
      <div className={BAR}>
        <div className="flex-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-1.5 h-4 w-24" />
        </div>
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>
    );
  }

  if (!isOfferable(auction.status)) {
    return (
      <div className={BAR}>
        <Figure label="Anunțul nu mai primește oferte" />
      </div>
    );
  }

  const amount = auction.viewerBidAmount;
  const reserved = auction.status === "RESERVED";
  const retract = checkRetractEligibility(auction, viewerId);

  if (!amount) {
    return (
      <div className={BAR}>
        <Figure
          label={
            reserved
              ? "Vânzătorul a acceptat o altă ofertă"
              : "Nicio ofertă transmisă"
          }
        />
        <Button size="sm" onClick={onModify} className="shrink-0">
          {reserved ? "Ofertă de rezervă" : "Fă o ofertă"}
        </Button>
      </div>
    );
  }

  return (
    <div className={BAR}>
      <Figure
        label="Oferta ta"
        amount={amount}
        note={
          reserved
            ? "de rezervă"
            : auction.viewerBidStatus === "WINNING"
              ? "cea mai mare"
              : "depășită"
        }
        noteTone={
          reserved
            ? "muted"
            : auction.viewerBidStatus === "WINNING"
              ? "good"
              : "warn"
        }
      />
      <div className="flex shrink-0 gap-1.5">
        <Button size="sm" variant="secondary" onClick={onModify}>
          Modifică
        </Button>
        {retract.canRetract ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={onWithdraw}
            className="text-danger-700 hover:bg-danger-50 hover:text-danger-700"
          >
            Retrage
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function SellerOfferBar({
  auction,
  offer,
  buyerName,
  accepting,
  onAccept,
}: {
  auction: AuctionDetail | null;
  offer: BidWithBidder | null | undefined;
  buyerName: string;
  accepting: boolean;
  onAccept: () => void;
}) {
  if (!auction || offer === undefined) {
    return (
      <div className={BAR}>
        <div className="flex-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-1.5 h-4 w-24" />
        </div>
      </div>
    );
  }

  if (!isOfferable(auction.status)) return null;

  if (!offer) {
    return (
      <div className={BAR}>
        <Figure label={`Nicio ofertă activă de la ${buyerName}`} />
      </div>
    );
  }

  return (
    <div className={BAR}>
      <Figure label="Oferta primită" amount={offer.amount} />
      {offer.status === "ACCEPTED" ? (
        <span className="shrink-0 rounded-lg bg-sky-50 px-2 py-1 text-xs font-bold text-sky-800">
          Acceptată
        </span>
      ) : (
        <Button
          size="sm"
          onClick={onAccept}
          loading={accepting}
          className="shrink-0"
        >
          Acceptă oferta
        </Button>
      )}
    </div>
  );
}
