"use client";

import { useState } from "react";

import { AuctionRow, AuctionRowSkeleton } from "@/components/auctions/AuctionRow";
import { ListState } from "@/app/cont/_components/ListState";
import { RowAction } from "@/app/cont/_components/RowAction";
import { useListView } from "@/app/cont/_components/useListView";
import { Icons } from "@/components/icons";
import { checkRetractEligibility, listMyBids, retractBid } from "@/lib/api/bids";
import { useAction, useApi, useRevalidate } from "@/lib/hooks/useApi";
import { useCurrentUserId } from "@/lib/auth/AuthProvider";
import { AUCTION_STATUS, BID_STATUS } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import { formatDateTimeRo } from "@/lib/utils/date";
import { countRo } from "@/lib/utils/plural";
import type { MyBidSummary } from "@/lib/api/bids";
import {
  Badge,
  Button,
  ButtonLink,
  ErrorState,
  Modal,
  Pagination,
  SegmentedControl,
  StatusBadge,
  useToast,
} from "@/components/ui";

/**
 * Where a bidder finds out what happened.
 *
 * <p>Until auctions actually closed there was nothing to show here: every offer
 * sat at "Câștigi" forever, because no winner was ever recorded. Active, won and
 * lost are the three answers settlement produces.
 */

type Bucket = "all" | "active" | "won" | "lost";

const FILTERS: { value: Bucket; label: string }[] = [
  { value: "all", label: "Toate" },
  { value: "active", label: "În desfășurare" },
  { value: "won", label: "Câștigate" },
  { value: "lost", label: "Încheiate" },
];

/** Decided by the bid rather than the auction: it is the bidder's outcome. */
function bucketOf(summary: MyBidSummary): Bucket {
  switch (summary.myTopBid.status) {
    case "WON":
      return "won";
    case "LOST":
      return "lost";
    default:
      return "active";
  }
}

export function MyBids() {
  const userId = useCurrentUserId();
  const toast = useToast();
  const revalidate = useRevalidate();
  const [pendingRetraction, setPendingRetraction] = useState<MyBidSummary | null>(null);

  const { data, error, loading, reload } = useApi(
    () => listMyBids(userId!),
    `my-bids:${userId}`,
    { enabled: Boolean(userId) },
  );

  const view = useListView<MyBidSummary, Bucket>({
    rows: data,
    filters: FILTERS,
    bucketOf,
    all: "all",
  });

  const retract = useAction(async (summary: MyBidSummary) => {
    await retractBid(summary.auction.id, userId!);
    return summary;
  });

  const confirmRetraction = async () => {
    if (!pendingRetraction) return;
    const done = await retract.run(pendingRetraction);
    if (!done) return;
    setPendingRetraction(null);
    toast.success("Ofertă retrasă", done.auction.title);
    revalidate("my-bids", "auctions");
  };

  return (
    // A short list must not leave the footer halfway up the screen.
    <section className="flex min-h-[60vh] flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
          Licitațiile mele
        </h1>
        {view.options.length > 0 ? (
          <SegmentedControl
            ariaLabel="Filtrează ofertele"
            options={view.options}
            value={view.filter}
            onChange={view.choose}
          />
        ) : null}
      </div>

      {error ? (
        <ErrorState
          description={error}
          action={
            <Button variant="secondary" onClick={reload}>
              Încearcă din nou
            </Button>
          }
        />
      ) : loading && !data ? (
        <AuctionRowSkeleton rows={4} />
      ) : view.settling ? (
        <AuctionRowSkeleton rows={view.outgoing} />
      ) : view.shown.length === 0 ? (
        <ListState
          filtered={view.hiddenByFilter}
          onReset={() => view.choose("all")}
          title="Nu ai nicio ofertă"
          description="Alege un obiect care îți place și susții o cauză în același timp."
          action={<ButtonLink href="/licitatii">Vezi licitațiile</ButtonLink>}
        />
      ) : (
        <>
          <p className="sr-only" aria-live="polite">
            {countRo(view.matching.length, "ofertă", "oferte")}
          </p>
          <ul className="flex flex-col gap-2.5">
            {view.shown.map((summary) => (
              <BidRow
                key={summary.auction.id}
                summary={summary}
                onRetract={() => setPendingRetraction(summary)}
              />
            ))}
          </ul>
          <Pagination page={view.page} totalPages={view.totalPages} onChange={view.goToPage} />
        </>
      )}

      <Modal
        open={pendingRetraction !== null}
        onClose={() => setPendingRetraction(null)}
        title="Retragi oferta?"
        description={
          pendingRetraction
            ? `Oferta de ${formatMoney(pendingRetraction.myTopBid.amount)} pentru „${pendingRetraction.auction.title}” se anulează, iar licitația revine la prețul anterior.`
            : undefined
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingRetraction(null)}>
              Renunță
            </Button>
            <Button variant="danger" onClick={confirmRetraction} loading={retract.pending}>
              Retrage oferta
            </Button>
          </>
        }
      >
        {retract.error ? <p className="text-sm text-danger-700">{retract.error}</p> : null}
      </Modal>
    </section>
  );
}

function BidRow({ summary, onRetract }: { summary: MyBidSummary; onRetract: () => void }) {
  const { auction, myTopBid } = summary;
  const settled = myTopBid.status === "WON" || myTopBid.status === "LOST";
  // The same rule the auction page uses, rather than a second opinion about it.
  const canRetract = checkRetractEligibility(auction, myTopBid.bidderId).canRetract;

  return (
    <AuctionRow
      auction={auction}
      badges={
        <>
          <StatusBadge meta={BID_STATUS[myTopBid.status]} size="sm" className="text-[11px]" />
          <Badge tone={AUCTION_STATUS[auction.status].tone} size="sm" variant="soft" className="text-[11px]">
            {AUCTION_STATUS[auction.status].label}
          </Badge>
        </>
      }
      meta={
        <>
          Oferta ta: <strong className="text-ink-900">{formatMoney(myTopBid.amount)}</strong>
          {" · "}
          {/* Once it is over, the closing price is the fact that matters; while
              it runs, the same number is what you have to beat. */}
          {settled ? "Preț final" : "Preț curent"}{" "}
          <strong className="text-ink-900">{formatMoney(auction.currentPrice)}</strong>
        </>
      }
      footnote={`${settled ? "Încheiată" : "Se încheie"} ${formatDateTimeRo(auction.endTime)}`}
      actions={
        <>
          <RowAction
            label="Deschide"
            href={`/licitatii/${auction.id}`}
            icon={<Icons.forward aria-hidden="true" className="h-4 w-4" />}
          />
          {canRetract ? (
            <RowAction
              label="Retrage"
              danger
              icon={<Icons.remove aria-hidden="true" className="h-4 w-4" />}
              onClick={onRetract}
            />
          ) : null}
        </>
      }
    />
  );
}
