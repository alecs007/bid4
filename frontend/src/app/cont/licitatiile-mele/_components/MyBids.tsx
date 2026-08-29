"use client";

import { useMemo, useState } from "react";

import { AuctionRow, AuctionRowSkeleton } from "@/components/auctions/AuctionRow";
import { ListState } from "@/app/cont/_components/ListState";
import { Icons } from "@/components/icons";
import { checkRetractEligibility, listMyBids, retractBid } from "@/lib/api/bids";
import { useAction, useApi, useRevalidate } from "@/lib/hooks/useApi";
import { useCurrentUserId } from "@/lib/auth/AuthProvider";
import { AUCTION_STATUS, BID_STATUS } from "@/lib/labels";
import { PAGINATION } from "@/lib/config";
import { formatMoney } from "@/lib/money";
import { formatDateTimeRo } from "@/lib/utils/date";
import { countRo } from "@/lib/utils/plural";
import type { MyBidSummary } from "@/lib/api/bids";
import {
  Badge,
  Button,
  ButtonLink,
  ErrorState,
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
 * lost are the three answers settlement produces; the fourth tab is just all of
 * them, and is what "show everything" resets to.
 */

type Tab = "all" | "active" | "won" | "lost";

const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "Toate" },
  { value: "active", label: "În desfășurare" },
  { value: "won", label: "Câștigate" },
  { value: "lost", label: "Încheiate" },
];

/** Which tab an offer belongs under, decided by the bid rather than the auction. */
function tabOf(summary: MyBidSummary): Exclude<Tab, "all"> {
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
  const [tab, setTab] = useState<Tab>("all");
  const [page, setPage] = useState(1);

  const { data, error, loading, reload } = useApi(
    () => listMyBids(userId!),
    `my-bids:${userId}`,
    { enabled: Boolean(userId) },
  );

  const retract = useAction(async (summary: MyBidSummary) => {
    await retractBid(summary.auction.id, userId!);
    return summary;
  });

  const handleRetract = async (summary: MyBidSummary) => {
    const done = await retract.run(summary);
    if (!done) {
      toast.error("Oferta nu a putut fi retrasă", retract.error ?? undefined);
      return;
    }
    toast.success("Ofertă retrasă", done.auction.title);
    revalidate("my-bids", "auctions");
  };

  const grouped = useMemo(() => {
    const all = data ?? [];
    const buckets: Record<Tab, MyBidSummary[]> = { all, active: [], won: [], lost: [] };
    for (const summary of all) buckets[tabOf(summary)].push(summary);
    return buckets;
  }, [data]);

  const matching = grouped[tab];
  const totalPages = Math.max(1, Math.ceil(matching.length / PAGINATION.DEFAULT_PAGE_SIZE));
  // Clamped rather than reset: retracting the last offer on the last page should
  // step back a page, not throw the reader to the top of the list.
  const current = Math.min(page, totalPages);
  const shown = matching.slice(
    (current - 1) * PAGINATION.DEFAULT_PAGE_SIZE,
    current * PAGINATION.DEFAULT_PAGE_SIZE,
  );

  const choose = (next: Tab) => {
    setTab(next);
    setPage(1);
  };

  return (
    // A short list must not leave the footer halfway up the screen.
    <section className="flex min-h-[60vh] flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
          Licitațiile mele
        </h1>
        <SegmentedControl
          ariaLabel="Filtrează ofertele"
          options={TABS.map((item) => ({
            ...item,
            // The number is the useful half: "Câștigate (2)" answers the question
            // the tab only asks.
            label: data ? `${item.label} (${grouped[item.value].length})` : item.label,
          }))}
          value={tab}
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
        <AuctionRowSkeleton />
      ) : shown.length === 0 ? (
        <ListState
          filtered={grouped.all.length > 0}
          onReset={() => choose("all")}
          title="Nu ai nicio ofertă"
          description="Alege un obiect care îți place și susții o cauză în același timp."
          action={<ButtonLink href="/licitatii">Vezi licitațiile</ButtonLink>}
        />
      ) : (
        <>
          <p className="sr-only" aria-live="polite">
            {countRo(matching.length, "ofertă", "oferte")}
          </p>
          <ul className="flex flex-col gap-2.5">
            {shown.map((summary) => (
              <BidRow
                key={summary.auction.id}
                summary={summary}
                pending={retract.pending}
                onRetract={() => handleRetract(summary)}
              />
            ))}
          </ul>
          <Pagination page={current} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </section>
  );
}

function BidRow({
  summary,
  pending,
  onRetract,
}: {
  summary: MyBidSummary;
  pending: boolean;
  onRetract: () => void;
}) {
  const { auction, myTopBid } = summary;
  const settled = myTopBid.status === "WON" || myTopBid.status === "LOST";
  // The same rule the auction page uses, rather than a second opinion about it.
  const canRetract = checkRetractEligibility(auction, myTopBid.bidderId).canRetract;

  return (
    <AuctionRow
      auction={auction}
      badges={
        <>
          <StatusBadge meta={BID_STATUS[myTopBid.status]} size="sm" />
          <Badge tone={AUCTION_STATUS[auction.status].tone} size="sm" variant="soft">
            {AUCTION_STATUS[auction.status].label}
          </Badge>
        </>
      }
      meta={
        <>
          Oferta ta:{" "}
          <strong className="text-ink-900">{formatMoney(myTopBid.amount)}</strong>
          {" · "}
          {/* Once it is over, the closing price is the fact that matters; while
              it runs, the same number is what you have to beat. */}
          {settled ? "Preț final" : "Preț curent"}{" "}
          <strong className="text-ink-900">{formatMoney(auction.currentPrice)}</strong>
        </>
      }
      footnote={`${settled ? "Încheiată" : "Se încheie"} ${formatDateTimeRo(auction.endTime)}`}
      actions={
        canRetract ? (
          <Button
            variant="ghost"
            size="sm"
            loading={pending}
            aria-label={`Retrage oferta pentru ${auction.title}`}
            leftIcon={<Icons.remove aria-hidden="true" className="h-4 w-4" />}
            onClick={onRetract}
          >
            Retrage
          </Button>
        ) : myTopBid.status === "WON" ? (
          <ButtonLink href={`/licitatii/${auction.id}`} size="sm">
            Vezi
          </ButtonLink>
        ) : null
      }
    />
  );
}
