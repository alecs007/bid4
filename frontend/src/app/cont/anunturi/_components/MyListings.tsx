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

/**
 * Statuses a seller can still withdraw.
 *
 * <p>Only decides whether the action is worth offering. The API refuses on its
 * own terms, so a listing that settled a second ago is refused there rather than
 * trusted here.
 */
const WITHDRAWABLE = new Set<AuctionStatus>([
  "DRAFT",
  "PENDING_REVIEW",
  "SCHEDULED",
  "LIVE",
]);

type Bucket = "all" | "review" | "scheduled" | "live" | "closed";

const FILTERS: { value: Bucket; label: string }[] = [
  { value: "all", label: "Toate" },
  { value: "review", label: "În verificare" },
  { value: "scheduled", label: "Programate" },
  { value: "live", label: "În desfășurare" },
  { value: "closed", label: "Încheiate" },
];

function bucketOf(auction: AuctionDetail): Bucket {
  switch (auction.status) {
    case "DRAFT":
    case "PENDING_REVIEW":
      return "review";
    case "SCHEDULED":
      return "scheduled";
    case "LIVE":
      return "live";
    default:
      return "closed";
  }
}

/**
 * The figures worth showing, which depend on where the listing is.
 *
 * <p>Nothing has been offered on a listing still in review, so "current price"
 * there is the asking price wearing a misleading label. Once it is running the
 * pair that matters is what it opened at against what it has reached; once it is
 * over, what it finished at.
 */
function statsFor(auction: AuctionDetail, onSeeBidders: () => void): RowStat[] {
  const start: RowStat = { label: "Preț de pornire", value: formatMoney(auction.startingPrice) };

  switch (auction.status) {
    case "DRAFT":
    case "PENDING_REVIEW":
    case "SCHEDULED":
      return [{ ...start, emphasis: true }];
    case "SOLD":
      return [
        start,
        {
          label: "Preț final",
          value: formatMoney(auction.currentPrice),
          emphasis: true,
          // Green like the running figure it grew out of: it is the number that
          // went the seller's way, and it is what the donation comes out of.
          tone: "positive",
        },
      ];
    case "UNSOLD":
    case "ENDED":
      return [start, highest(auction, onSeeBidders, "Cea mai mare ofertă")].filter(present);
    case "CANCELLED":
      return [start];
    default:
      return [start, highest(auction, onSeeBidders, "Cea mai mare ofertă")].filter(present);
  }
}

/** Drops the figures that have nothing to say for this listing. */
function present(stat: RowStat | null): stat is RowStat {
  return stat !== null;
}

/**
 * What the bidding has reached, in green because it is the number going the
 * seller's way, with how many offers made it and a way to see whose.
 */
function highest(
  auction: AuctionDetail,
  onSeeBidders: () => void,
  label: string,
): RowStat | null {
  // Nothing at all rather than "Fără oferte": an empty figure is a column of
  // absence down the page, and the asking price beside it already says what
  // there is to know.
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

/** When the clock matters, and what it is doing. */
function footnoteFor(auction: AuctionDetail): string {
  switch (auction.status) {
    case "PENDING_REVIEW":
    case "DRAFT":
      return "Se publică după verificare";
    case "SCHEDULED":
      return `Începe la ${formatDateTimeRo(auction.startTime)}`;
    case "CANCELLED":
      return "Retras de tine";
    case "SOLD":
    case "UNSOLD":
    case "ENDED":
      return `Încheiată la ${formatDateTimeRo(auction.endTime)}`;
    default:
      return `Se încheie la ${formatDateTimeRo(auction.endTime)}`;
  }
}

export function MyListings() {
  const userId = useCurrentUserId();
  const toast = useToast();
  const revalidate = useRevalidate();
  const [pendingWithdrawal, setPendingWithdrawal] = useState<AuctionDetail | null>(null);
  const [bidders, setBidders] = useState<AuctionDetail | null>(null);

  const { data, error, loading, reload } = useApi(
    () => listMyAuctions(userId!),
    `my-listings:${userId}`,
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
    // It also leaves the public catalogue and any cause page that counted it.
    revalidate("my-listings", "auctions", "causes");
  };

  return (
    // A short list must not leave the footer halfway up the screen.
    <section className="flex min-h-[60vh] flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
          Anunțurile mele
        </h1>
        {view.options.length > 0 ? (
          <SegmentedControl
            ariaLabel="Filtrează anunțurile"
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
          title="Nu ai niciun anunț"
          description="Pune la licitație ceva ce nu mai folosești și alege cauza care primește o parte din preț."
          action={<ButtonLink href="/cont/anunturi/nou">Vinde acum</ButtonLink>}
        />
      ) : (
        <>
          <p className="sr-only" aria-live="polite">
            {countRo(view.matching.length, "anunț", "anunțuri")}
          </p>
          <ul className="flex flex-col gap-2.5">
            {view.shown.map((auction) => (
              <AuctionRow
                key={auction.id}
                auction={auction}
                badges={
                  <StatusBadge
                    meta={AUCTION_STATUS[auction.status]}
                    size="sm"
                    marker={false}
                    className="text-[11px]"
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
                          : "Licitația s-a încheiat și nu mai poate fi retrasă.",
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
