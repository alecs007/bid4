"use client";

import { useState } from "react";

import { AuctionRow } from "@/components/auctions/AuctionRow";
import { Icons } from "@/components/icons";
import { cancelAuction, listMyAuctions } from "@/lib/api/auctions";
import { useAction, useApi, useRevalidate } from "@/lib/hooks/useApi";
import { useCurrentUserId } from "@/lib/auth/AuthProvider";
import { AUCTION_STATUS } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import { formatDateTimeRo } from "@/lib/utils/date";
import { countRo } from "@/lib/utils/plural";
import type { AuctionDetail } from "@/lib/types";
import {
  Button,
  ButtonLink,
  EmptyState,
  ErrorState,
  Modal,
  Skeleton,
  StatusBadge,
  useToast,
} from "@/components/ui";

/**
 * Statuses a seller can still withdraw.
 *
 * <p>Only decides whether the button is worth showing. The API refuses on its own
 * terms, and a listing that settled a second ago will be refused there rather
 * than here.
 */
const WITHDRAWABLE = new Set(["DRAFT", "PENDING_REVIEW", "SCHEDULED", "LIVE"]);

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
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
          Anunțurile mele
        </h1>
        <ButtonLink href="/cont/anunturi/nou">Vinde acum</ButtonLink>
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
        <MyListingsSkeleton />
      ) : !data?.length ? (
        <EmptyState
          title="Nu ai niciun anunț"
          description="Pune la licitație ceva ce nu mai folosești și alege cauza care primește o parte din preț."
          action={<ButtonLink href="/cont/anunturi/nou">Vinde acum</ButtonLink>}
        />
      ) : (
        <>
          <p className="sr-only" aria-live="polite">
            {countRo(data.length, "anunț", "anunțuri")}
          </p>
          <ul className="flex flex-col gap-2.5">
            {data.map((auction) => (
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

function MyListingsSkeleton() {
  return (
    <ul className="flex flex-col gap-2.5">
      {Array.from({ length: 3 }).map((_, index) => (
        <li
          key={index}
          className="flex items-center gap-3 rounded-3xl bg-white ring-1 ring-edge p-3 sm:gap-4 sm:p-4"
        >
          <Skeleton className="aspect-square w-16 shrink-0 rounded-2xl sm:w-20" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="mt-1.5 h-6 w-2/3 rounded-xl" />
            <Skeleton className="mt-1 h-4 w-1/2 rounded-lg" />
          </div>
        </li>
      ))}
    </ul>
  );
}
