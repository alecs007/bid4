"use client";

import { useState } from "react";

import { AuctionRow, AuctionRowSkeleton } from "@/components/auctions/AuctionRow";
import type { RowStat } from "@/components/auctions/AuctionRow";
import { ListState } from "@/app/cont/_components/ListState";
import { RowActions } from "@/app/cont/_components/RowActions";
import { useListView } from "@/app/cont/_components/useListView";
import { Icons } from "@/components/icons";
import { checkRetractEligibility, listMyBids, retractBid } from "@/lib/api/bids";
import { useAction, useApi, useRevalidate } from "@/lib/hooks/useApi";
import { useCurrentUserId } from "@/lib/auth/AuthProvider";
import { AUCTION_STATUS, BID_STATUS } from "@/lib/labels";
import { cn } from "@/lib/utils/cn";
import { formatMoney } from "@/lib/money";
import { formatDateTimeRo } from "@/lib/utils/date";
import { countRo } from "@/lib/utils/plural";
import type { MyBidSummary } from "@/lib/api/bids";
import type { BidStatus } from "@/lib/types";
import {
  Badge,
  Button,
  ButtonLink,
  ErrorState,
  Modal,
  Pagination,
  SegmentedControl,
  useToast,
} from "@/components/ui";

type Bucket = "all" | "active" | "won" | "lost";

const FILTERS: { value: Bucket; label: string }[] = [
  { value: "all", label: "Toate" },
  { value: "active", label: "În așteptare" },
  { value: "won", label: "Acceptate" },
  { value: "lost", label: "Neacceptate" },
];

const OUTCOME: Record<BidStatus, { text: string; alert?: boolean }> = {
  ACTIVE: { text: "text-sky-700" },
  OUTBID: { text: "text-accent-700", alert: true },
  WINNING: { text: "text-primary-700" },
  ACCEPTED: { text: "text-success-700" },
  WON: { text: "text-success-700" },
  LOST: { text: "text-ink-500" },
};

function bucketOf(summary: MyBidSummary): Bucket {
  switch (summary.myTopBid.status) {
    case "ACCEPTED":
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
      ) : !userId || (loading && !data) ? (
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
          <ul
            key={`${view.filter}:${view.page}`}
            className="flex animate-fade-in flex-col gap-2.5"
          >
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
  const live = auction.status === "LIVE";
  const leading = myTopBid.amount >= auction.currentPrice;
  const retract = checkRetractEligibility(auction, myTopBid.bidderId);

  const stats: RowStat[] = [
    { label: "Oferta ta", value: formatMoney(myTopBid.amount), emphasis: !live || leading },
    {
      label: settled ? "Preț final" : "Preț curent",
      value: formatMoney(auction.currentPrice),
      emphasis: live && !leading,
      tone: live
        ? leading
          ? "positive"
          : "negative"
        : myTopBid.status === "WON" || myTopBid.status === "ACCEPTED"
          ? "positive"
          : undefined,
      note: live && leading ? "oferta ta" : undefined,
    },
  ];

  return (
    <AuctionRow
      auction={auction}
      badges={
        <>
          <Badge
            tone={AUCTION_STATUS[auction.status].tone}
            size="sm"
            variant="soft"
            marker={false}
            className="border-transparent text-[11px]"
          >
            {AUCTION_STATUS[auction.status].label}
          </Badge>
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[11px] font-bold",
              OUTCOME[myTopBid.status].text,
            )}
          >
            {OUTCOME[myTopBid.status].alert ? (
              <Icons.warning aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            ) : null}
            {BID_STATUS[myTopBid.status].label}
          </span>
        </>
      }
      stats={stats}
      footnote={
        auction.acceptedAt
          ? `Vânzătorul a ales la ${formatDateTimeRo(auction.acceptedAt)}`
          : `Publicată la ${formatDateTimeRo(auction.startTime)}`
      }
      actions={
        <RowActions
          view={`/licitatii/${auction.id}`}
          primary={
            live && !leading
              ? {
                  label: "Mărește oferta",
                  variant: "accent" as const,
                  icon: <Icons.auction aria-hidden="true" className="h-4 w-4 shrink-0" />,
                  href: `/licitatii/${auction.id}`,
                  onClick: undefined,
                }
              : undefined
          }
          extra={
            live
              ? [
                  {
                    label: "Retrage",
                    icon: <Icons.remove aria-hidden="true" className="h-4 w-4 shrink-0" />,
                    danger: true,
                    onClick: onRetract,
                    unavailable: retract.canRetract
                      ? undefined
                      : (retract.reason ?? "Poți retrage doar oferta aflată pe primul loc."),
                  },
                ]
              : []
          }
        />
      }
    />
  );
}
