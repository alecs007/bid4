"use client";

import { useMemo, useState } from "react";

import { AuctionRow, AuctionRowSkeleton } from "@/components/auctions/AuctionRow";
import { Icons } from "@/components/icons";
import { ListState } from "@/app/cont/_components/ListState";
import { cancelAuction, listMyAuctions } from "@/lib/api/auctions";
import { useAction, useApi, useRevalidate } from "@/lib/hooks/useApi";
import { useCurrentUserId } from "@/lib/auth/AuthProvider";
import { AUCTION_STATUS } from "@/lib/labels";
import { PAGINATION } from "@/lib/config";
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
  useToast,
} from "@/components/ui";

/**
 * Statuses a seller can still withdraw.
 *
 * <p>Only decides whether the button is worth showing. The API refuses on its own
 * terms, so a listing that settled a second ago is refused there rather than
 * trusted here.
 */
const WITHDRAWABLE = new Set<AuctionStatus>([
  "DRAFT",
  "PENDING_REVIEW",
  "SCHEDULED",
  "LIVE",
]);

type Filter = "all" | "review" | "active" | "closed";

/** Four buckets, because those are the four things a seller does about a listing. */
const BUCKETS: Record<Exclude<Filter, "all">, Set<AuctionStatus>> = {
  review: new Set(["DRAFT", "PENDING_REVIEW"]),
  active: new Set(["SCHEDULED", "LIVE"]),
  closed: new Set(["ENDED", "SOLD", "UNSOLD", "CANCELLED"]),
};

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Toate" },
  { value: "review", label: "În verificare" },
  { value: "active", label: "Active" },
  { value: "closed", label: "Încheiate" },
];

export function MyListings() {
  const userId = useCurrentUserId();
  const toast = useToast();
  const revalidate = useRevalidate();
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [pendingWithdrawal, setPendingWithdrawal] = useState<AuctionDetail | null>(null);

  const { data, error, loading, reload } = useApi(
    () => listMyAuctions(userId!),
    `my-listings:${userId}`,
    { enabled: Boolean(userId) },
  );

  const withdraw = useAction(async (auction: AuctionDetail) => {
    await cancelAuction(auction.id, userId!);
    return auction;
  });

  const counts = useMemo(() => {
    const all = data ?? [];
    return {
      all: all.length,
      review: all.filter((item) => BUCKETS.review.has(item.status)).length,
      active: all.filter((item) => BUCKETS.active.has(item.status)).length,
      closed: all.filter((item) => BUCKETS.closed.has(item.status)).length,
    } satisfies Record<Filter, number>;
  }, [data]);

  const matching = useMemo(() => {
    const all = data ?? [];
    return filter === "all" ? all : all.filter((item) => BUCKETS[filter].has(item.status));
  }, [data, filter]);

  const totalPages = Math.max(1, Math.ceil(matching.length / PAGINATION.DEFAULT_PAGE_SIZE));
  // Clamped rather than reset: withdrawing the last row on the last page should
  // step back a page, not throw the reader to the top of the list.
  const current = Math.min(page, totalPages);
  const shown = matching.slice(
    (current - 1) * PAGINATION.DEFAULT_PAGE_SIZE,
    current * PAGINATION.DEFAULT_PAGE_SIZE,
  );

  const choose = (next: Filter) => {
    setFilter(next);
    setPage(1);
  };

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
        <SegmentedControl
          ariaLabel="Filtrează anunțurile"
          options={FILTERS.map((item) => ({
            ...item,
            label: data ? `${item.label} (${counts[item.value]})` : item.label,
          }))}
          value={filter}
          onChange={choose}
        />
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
        <AuctionRowSkeleton rows={3} />
      ) : shown.length === 0 ? (
        <ListState
          filtered={counts.all > 0}
          onReset={() => choose("all")}
          title="Nu ai niciun anunț"
          description="Pune la licitație ceva ce nu mai folosești și alege cauza care primește o parte din preț."
          action={<ButtonLink href="/cont/anunturi/nou">Vinde acum</ButtonLink>}
        />
      ) : (
        <>
          <p className="sr-only" aria-live="polite">
            {countRo(matching.length, "anunț", "anunțuri")}
          </p>
          <ul className="flex flex-col gap-2.5">
            {shown.map((auction) => (
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
                  WITHDRAWABLE.has(auction.status) ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Retrage anunțul ${auction.title}`}
                      leftIcon={<Icons.remove aria-hidden="true" className="h-4 w-4" />}
                      onClick={() => setPendingWithdrawal(auction)}
                    >
                      Retrage
                    </Button>
                  ) : null
                }
              />
            ))}
          </ul>
          <Pagination page={current} totalPages={totalPages} onChange={setPage} />
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
