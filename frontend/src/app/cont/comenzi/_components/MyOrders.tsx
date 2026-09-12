"use client";

import { useState } from "react";

import Link from "next/link";

import {
  AuctionRowSkeleton,
  GRID,
  ROW,
  Stats,
  THUMB,
} from "@/components/auctions/AuctionRow";
import { FadeImage } from "@/components/ui";
import { ListState } from "@/app/cont/_components/ListState";
import { useListView } from "@/app/cont/_components/useListView";
import {
  Button,
  ButtonLink,
  ErrorState,
  Pagination,
  SegmentedControl,
  StatusBadge,
} from "@/components/ui";
import { listOrders } from "@/lib/api/orders";
import { useCurrentUserId } from "@/lib/auth/AuthProvider";
import { useApi } from "@/lib/hooks/useApi";
import { ORDER_STATUS } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import type { OrderDetail } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { countRo } from "@/lib/utils/plural";
import { formatDateRo } from "@/lib/utils/date";

import { OrderRecord } from "./OrderRecord";

/** Where a sale has got to, in the four answers a buyer actually wants. */
type Bucket = "all" | "active" | "delivery" | "done";

const FILTERS: { value: Bucket; label: string }[] = [
  { value: "all", label: "Toate" },
  { value: "active", label: "De rezolvat" },
  { value: "delivery", label: "În livrare" },
  { value: "done", label: "Finalizate" },
];

function bucketOf(order: OrderDetail): Bucket {
  switch (order.status) {
    case "AWAITING_CONFIRMATION":
    case "AWAITING_PAYMENT":
    case "PAYMENT_FAILED":
    case "DELIVERED":
      return "active";
    case "COMPLETED":
    case "REFUNDED":
    case "CANCELLED":
    case "DISPUTE_RESOLVED":
      return "done";
    default:
      return "delivery";
  }
}

/**
 * What this account has bought.
 *
 * <p>Purchases only: the other side of the market is {@code /cont/vanzari}, and a page that mixed
 * the two would make "what do I owe" and "what am I owed" the same list. Built on the same row, the
 * same filter strip and the same paging as that page, because a buyer and a seller are the same
 * person and should not have to learn the screen twice.
 */
export function MyOrders() {
  const userId = useCurrentUserId();
  const [open, setOpen] = useState<string | null>(null);

  const { data, error, loading, reload } = useApi(
    () => listOrders(userId!, { role: "BUYER" }),
    `orders:buyer:${userId}`,
    { enabled: Boolean(userId) },
  );

  const view = useListView<OrderDetail, Bucket>({
    rows: data,
    filters: FILTERS,
    bucketOf,
    all: "all",
  });

  return (
    // A short list must not leave the footer halfway up the screen.
    <section className="flex min-h-[60vh] flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
          Comenzile mele
        </h1>
        {view.options.length > 0 ? (
          <SegmentedControl
            ariaLabel="Filtrează comenzile"
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
          title="Nu ai nicio comandă"
          description="Comenzile apar aici după ce un vânzător îți acceptă oferta."
          action={<ButtonLink href="/licitatii">Vezi licitațiile</ButtonLink>}
        />
      ) : (
        <>
          <p className="sr-only" aria-live="polite">
            {countRo(view.matching.length, "comandă", "comenzi")}
          </p>
          <ul
            key={`${view.filter}:${view.page}`}
            className="animate-reveal flex flex-col gap-2.5"
          >
            {view.shown.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                open={open === order.id}
                onToggle={() => setOpen(open === order.id ? null : order.id)}
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
    </section>
  );
}

/**
 * One purchase, in the same box a sale uses.
 *
 * <p>Not `<AuctionRow>` itself: that one wants a full `AuctionDetail` so it can draw the cause
 * block, and an order carries only the listing and a slim cause. It shares the row's chrome and its
 * stat block, so the two lists are the same object rather than two that resemble each other.
 */
function OrderRow({
  order,
  open,
  onToggle,
}: {
  order: OrderDetail;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <li className={cn(ROW, "transition hover:ring-ink-300")}>
      <div className={GRID}>
        <div className="flex items-start gap-3 sm:gap-4 lg:contents">
          <Link
            href={`/licitatii/${order.auctionId}`}
            className={cn(THUMB, "relative block overflow-hidden")}
          >
            {order.auction.images[0] ? (
              <FadeImage
                src={order.auction.images[0]}
                sizes="96px"
                className="object-cover"
              />
            ) : null}
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/licitatii/${order.auctionId}`}
                className="font-display text-[15px] font-extrabold text-ink-900 hover:text-primary-700"
              >
                {order.auction.title}
              </Link>
              <StatusBadge meta={ORDER_STATUS[order.status]} />
            </div>
            <p className="numeric mt-0.5 text-[13px] text-ink-500">
              {order.reference} · deschisă {formatDateRo(order.createdAt)}
            </p>
          </div>
        </div>

        <div className="mt-3 lg:mt-0">
          <Stats
            stats={[
              { label: "Total plătit", value: formatMoney(order.totalPaid), emphasis: true },
              {
                label: `Către ${order.cause.name}`,
                value: formatMoney(order.donationAmount),
                tone: "positive",
              },
            ]}
          />
        </div>

        <div className="mt-3 lg:mt-0">
          <Button
            variant="secondary"
            size="sm"
            aria-expanded={open}
            onClick={onToggle}
          >
            {open ? "Ascunde detaliile" : "Vezi detaliile"}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="mt-3 border-t border-line pt-3">
          <OrderRecord order={order} />
        </div>
      ) : null}
    </li>
  );
}
