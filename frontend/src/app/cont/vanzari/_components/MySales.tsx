"use client";

import { useState } from "react";

import { AuctionRow, AuctionRowSkeleton } from "@/components/auctions/AuctionRow";
import type { RowStat } from "@/components/auctions/AuctionRow";
import { Icons } from "@/components/icons";
import { BiddersModal } from "@/app/cont/_components/BiddersModal";
import { ListState } from "@/app/cont/_components/ListState";
import { RowActions } from "@/app/cont/_components/RowActions";
import { useListView } from "@/app/cont/_components/useListView";
import { cancelAuction, listMyAuctions } from "@/lib/api/auctions";
import { useAction, useApi, useRevalidate } from "@/lib/hooks/useApi";
import { useCurrentUserId } from "@/lib/auth/AuthProvider";
import { AUCTION_STATUS } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import { formatDateTimeRo } from "@/lib/utils/date";
import { countRo } from "@/lib/utils/plural";
import type { AuctionDetail, AuctionStatus } from "@/lib/types";
import {
  Button,
  ButtonLink,
  ErrorState,
  Modal,
  Pagination,
  SegmentedControl,
  StatusBadge,
} from "@/components/ui";
import { useToast } from "@/components/ui";

const WITHDRAWABLE = new Set<AuctionStatus>(["DRAFT", "PENDING_REVIEW", "LIVE"]);

type Bucket = "all" | "review" | "live" | "reserved" | "closed";

const FILTERS: { value: Bucket; label: string }[] = [
  { value: "all", label: "Toate" },
  { value: "review", label: "În verificare" },
  { value: "live", label: "În desfășurare" },
  { value: "reserved", label: "Așteaptă plata" },
  { value: "closed", label: "Finalizate" },
];

function bucketOf(auction: AuctionDetail): Bucket {
  switch (auction.status) {
    case "DRAFT":
    case "PENDING_REVIEW":
      return "review";
    case "LIVE":
      return "live";
    case "RESERVED":
      return "reserved";
    default:
      return "closed";
  }
}

function statsFor(auction: AuctionDetail, onSeeBidders: () => void): RowStat[] {
  const start: RowStat = { label: "Preț de pornire", value: formatMoney(auction.startingPrice) };

  switch (auction.status) {
    case "DRAFT":
    case "PENDING_REVIEW":
      return [{ ...start, emphasis: true }];
    case "RESERVED":
    case "SOLD":
      return [
        start,
        {
          label:
            auction.status === "SOLD" ? "Preț final" : "Ofertă acceptată",
          value: formatMoney(auction.acceptedAmount ?? auction.currentPrice),
          emphasis: true,
          tone: "positive",
        },
      ];
    case "CANCELLED":
      return [start];
    default:
      return [start, highest(auction, onSeeBidders, "Cea mai mare ofertă")].filter(present);
  }
}

function present(stat: RowStat | null): stat is RowStat {
  return stat !== null;
}

function highest(
  auction: AuctionDetail,
  onSeeBidders: () => void,
  label: string,
): RowStat | null {
  if (!auction.bidCount) {
    return null;
  }
  return {
    label,
    value: formatMoney(auction.currentPrice),
    emphasis: true,
    tone: "positive",
    action: (
      <button
        type="button"
        onClick={onSeeBidders}
        className="rounded-md bg-ink-100 px-1.5 py-0.5 text-[10px] leading-none font-bold text-ink-700 transition hover:bg-ink-200"
      >
        {countRo(auction.bidCount, "ofertă", "oferte")}
      </button>
    ),
  };
}

function footnoteFor(auction: AuctionDetail): string {
  switch (auction.status) {
    case "PENDING_REVIEW":
    case "DRAFT":
      return "Se publică după verificare";
    case "CANCELLED":
      return "Retras de tine";
    case "RESERVED":
      return auction.acceptedAt
        ? `Acceptată la ${formatDateTimeRo(auction.acceptedAt)}`
        : "Așteaptă plata";
    case "SOLD":
      return auction.dispatchDeadline
        ? `Expediază până la ${formatDateTimeRo(auction.dispatchDeadline)}`
        : "Plătită";
    default:
      return `Publicată la ${formatDateTimeRo(auction.startTime)}`;
  }
}

export function MySales() {
  const userId = useCurrentUserId();
  const toast = useToast();
  const revalidate = useRevalidate();
  const [pendingWithdrawal, setPendingWithdrawal] = useState<AuctionDetail | null>(null);
  const [bidders, setBidders] = useState<AuctionDetail | null>(null);

  const { data, error, loading, reload } = useApi(
    () => listMyAuctions(userId!),
    `my-sales:${userId}`,
    { enabled: Boolean(userId) },
  );

  const view = useListView<AuctionDetail, Bucket>({
    rows: data,
    filters: FILTERS,
    bucketOf,
    all: "all",
  });

  const withdraw = useAction(async (auction: AuctionDetail) => {
    await cancelAuction(auction.id, userId!);
    return auction;
  });

  const confirmWithdrawal = async () => {
    if (!pendingWithdrawal) return;
    const done = await withdraw.run(pendingWithdrawal);
    if (!done) return;
    setPendingWithdrawal(null);
    toast.success("Anunț retras", `„${done.title}” nu mai este public.`);
    revalidate("my-sales", "auctions", "causes");
  };

  return (
    <section className="flex min-h-[60vh] flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
          Vânzările mele
        </h1>
        {view.options.length > 0 ? (
          <SegmentedControl
            ariaLabel="Filtrează vânzările"
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
          title="Nu ai nicio vânzare"
          description="Pune la licitație ceva ce nu mai folosești și alege cauza care primește o parte din preț."
          action={<ButtonLink href="/cont/vanzari/nou">Vinde acum</ButtonLink>}
        />
      ) : (
        <>
          <p className="sr-only" aria-live="polite">
            {countRo(view.matching.length, "vânzare", "vânzări")}
          </p>
          <ul
            key={`${view.filter}:${view.page}`}
            className="animate-reveal flex flex-col gap-2.5"
          >
            {view.shown.map((auction) => (
              <AuctionRow
                key={auction.id}
                auction={auction}
                badges={
                  <StatusBadge
                    meta={AUCTION_STATUS[auction.status]}
                    size="sm"
                    marker={false}
                    className="border-transparent text-[11px]"
                  />
                }
                stats={statsFor(auction, () => setBidders(auction))}
                footnote={footnoteFor(auction)}
                actions={
                  <RowActions
                    view={`/licitatii/${auction.id}`}
                    extra={[
                      {
                        label: "Retrage",
                        icon: <Icons.remove aria-hidden="true" className="h-4 w-4 shrink-0" />,
                        danger: true,
                        onClick: () => setPendingWithdrawal(auction),
                        unavailable: WITHDRAWABLE.has(auction.status)
                          ? undefined
                          : auction.status === "RESERVED"
                            ? "Ai acceptat o ofertă. Anuleaz-o mai întâi."
                            : auction.status === "SOLD"
                              ? "Anunțul este plătit și nu mai poate fi retras."
                              : "Anunțul este deja retras.",
                      },
                    ]}
                  />
                }
              />
            ))}
          </ul>
          <Pagination
            page={view.page}
            totalPages={view.totalPages}
            onChange={view.goToPage}
          />
        </>
      )}

      <BiddersModal
        auction={bidders}
        open={bidders !== null}
        onClose={() => setBidders(null)}
        sellerId={userId ?? undefined}
      />

      <Modal
        open={pendingWithdrawal !== null}
        onClose={() => setPendingWithdrawal(null)}
        title="Retragi anunțul?"
        description={
          pendingWithdrawal?.bidCount
            ? `„${pendingWithdrawal.title}” are ${countRo(pendingWithdrawal.bidCount, "ofertă", "oferte")}. Retragerea anulează toate ofertele primite.`
            : `„${pendingWithdrawal?.title}” nu va mai fi vizibil public.`
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingWithdrawal(null)}>
              Renunță
            </Button>
            <Button variant="danger" onClick={confirmWithdrawal} loading={withdraw.pending}>
              Retrage anunțul
            </Button>
          </>
        }
      >
        {withdraw.error ? <p className="text-sm text-danger-700">{withdraw.error}</p> : null}
      </Modal>
    </section>
  );
}
