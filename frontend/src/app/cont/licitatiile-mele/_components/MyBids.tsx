"use client";

import { useMemo, useState } from "react";

import { AuctionRow } from "@/components/auctions/AuctionRow";
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
  EmptyState,
  ErrorState,
  SegmentedControl,
  Skeleton,
  StatusBadge,
  useToast,
} from "@/components/ui";

/**
 * Where a bidder finds out what happened.
 *
 * <p>Until auctions actually closed there was nothing to show here: every offer
 * sat at "Câștigi" forever, because no winner was ever recorded. The three tabs
 * are the three answers settlement produces.
 */

type Tab = "active" | "won" | "lost";

const TABS: { value: Tab; label: string }[] = [
  { value: "active", label: "În desfășurare" },
  { value: "won", label: "Câștigate" },
  { value: "lost", label: "Încheiate" },
];

/** Which tab an offer belongs under, decided by the bid rather than the auction. */
function tabOf(summary: MyBidSummary): Tab {
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
  const [tab, setTab] = useState<Tab>("active");

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
    const empty: Record<Tab, MyBidSummary[]> = { active: [], won: [], lost: [] };
    for (const summary of data ?? []) empty[tabOf(summary)].push(summary);
    return empty;
  }, [data]);

  const shown = grouped[tab];

  return (
    <section className="flex flex-col gap-5">
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
          onChange={setTab}
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
        <MyBidsSkeleton />
      ) : shown.length === 0 ? (
        <EmptyForTab tab={tab} />
      ) : (
        <>
          <p className="sr-only" aria-live="polite">
            {countRo(shown.length, "ofertă", "oferte")}
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

function EmptyForTab({ tab }: { tab: Tab }) {
  if (tab === "won") {
    return (
      <EmptyState
        title="Nicio licitație câștigată încă"
        description="Când câștigi o licitație, o găsești aici împreună cu pașii următori."
        action={<ButtonLink href="/licitatii">Vezi licitațiile</ButtonLink>}
      />
    );
  }
  if (tab === "lost") {
    return (
      <EmptyState
        title="Nicio licitație încheiată"
        description="Aici ajung licitațiile la care ai participat și care s-au închis."
      />
    );
  }
  return (
    <EmptyState
      title="Nu ai oferte active"
      description="Alege un obiect care îți place și susții o cauză în același timp."
      action={<ButtonLink href="/licitatii">Vezi licitațiile</ButtonLink>}
    />
  );
}

function MyBidsSkeleton() {
  return (
    <ul className="flex flex-col gap-2.5">
      {Array.from({ length: 4 }).map((_, index) => (
        <li
          key={index}
          className="flex items-center gap-3 rounded-3xl bg-white ring-1 ring-edge p-3 sm:gap-4 sm:p-4"
        >
          <Skeleton className="aspect-square w-16 shrink-0 rounded-2xl sm:w-20" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-5 w-32 rounded-full" />
            <Skeleton className="mt-1.5 h-6 w-3/4 rounded-xl" />
            <Skeleton className="mt-1 h-4 w-1/2 rounded-lg" />
          </div>
        </li>
      ))}
    </ul>
  );
}
