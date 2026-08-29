"use client";

import { useState } from "react";

import { AuctionRow, AuctionRowSkeleton } from "@/components/auctions/AuctionRow";
import { Icons } from "@/components/icons";
import { ListState } from "@/app/cont/_components/ListState";
import { RowAction } from "@/app/cont/_components/RowAction";
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

export function MyListings() {
  const userId = useCurrentUserId();
  const toast = useToast();
  const revalidate = useRevalidate();
  const [pendingWithdrawal, setPendingWithdrawal] = useState<AuctionDetail | null>(null);

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
      ) : loading && !data ? (
        <AuctionRowSkeleton rows={4} />
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
                badges={<StatusBadge meta={AUCTION_STATUS[auction.status]} size="sm" />}
                meta={
                  <>
                    <strong className="text-ink-900">
                      {formatMoney(auction.currentPrice)}
                    </strong>
                    {" · "}
                    {countRo(auction.bidCount, "ofertă", "oferte")}
                    {" · "}
                    {auction.donationPercent}% către {auction.cause.name}
                  </>
                }
                footnote={`Se încheie ${formatDateTimeRo(auction.endTime)}`}
                actions={
                  <>
                    <RowAction
                      label="Vezi"
                      href={`/licitatii/${auction.id}`}
                      icon={<Icons.forward aria-hidden="true" className="h-4 w-4" />}
                    />
                    {WITHDRAWABLE.has(auction.status) ? (
                      <RowAction
                        label="Retrage"
                        danger
                        icon={<Icons.remove aria-hidden="true" className="h-4 w-4" />}
                        onClick={() => setPendingWithdrawal(auction)}
                      />
                    ) : null}
                  </>
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
