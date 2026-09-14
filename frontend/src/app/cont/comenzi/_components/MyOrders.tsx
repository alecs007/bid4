"use client";

import Link from "next/link";

import { ListState } from "@/app/cont/_components/ListState";
import { useListView } from "@/app/cont/_components/useListView";
import { Parties } from "@/components/orders/Parties";
import {
  Button,
  ButtonLink,
  ErrorState,
  FadeImage,
  Pagination,
  SegmentedControl,
  Skeleton,
  StatusBadge,
} from "@/components/ui";
import { listOrders } from "@/lib/api/orders";
import { useCurrentUserId } from "@/lib/auth/AuthProvider";
import { useApi } from "@/lib/hooks/useApi";
import { ORDER_STATUS } from "@/lib/labels";
import type { OrderDetail } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { countRo } from "@/lib/utils/plural";

type Bucket = "all" | "active" | "delivery" | "done";

const FILTERS: { value: Bucket; label: string }[] = [
  { value: "all", label: "Toate" },
  { value: "active", label: "De rezolvat" },
  { value: "delivery", label: "În livrare" },
  { value: "done", label: "Încheiate" },
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

export function MyOrders() {
  const userId = useCurrentUserId();

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
        <OrderCardSkeleton rows={4} />
      ) : view.settling ? (
        <OrderCardSkeleton rows={view.outgoing} />
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
              <OrderCard key={order.id} order={order} />
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

function OrderCard({ order }: { order: OrderDetail }) {
  const status = ORDER_STATUS[order.status];

  return (
    <li>
      <Link
        href={`/cont/comenzi/${order.id}`}
        className="group flex flex-col gap-2.5 rounded-3xl bg-white p-3.5 ring-1 ring-edge transition hover:ring-ink-300 sm:p-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <Parties
            seller={order.seller}
            buyer={order.buyer}
            className="min-w-0 flex-1 basis-64"
          />
          <StatusBadge
            meta={status}
            size="sm"
            marker={false}
            className="shrink-0 border-transparent text-[11px]"
          />
        </div>

        {status.hint ? (
          <p className="text-[13px] leading-snug text-ink-600">{status.hint}</p>
        ) : null}

        <div className="flex items-center gap-2.5 border-t border-line pt-2.5">
          <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-ink-100">
            {order.auction?.images[0] ? (
              <FadeImage
                src={order.auction.images[0]}
                sizes="36px"
                className="object-cover"
              />
            ) : null}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-bold text-ink-800 group-hover:text-primary-700">
              {order.auction?.title ?? "Anunț retras"}
            </span>
            <span className="numeric block text-[11px] text-ink-500">
              {order.reference}
            </span>
          </span>

        </div>
      </Link>
    </li>
  );
}

function OrderCardSkeleton({ rows }: { rows: number }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {Array.from({ length: Math.max(1, rows) }).map((_, index) => (
        <li
          key={index}
          className={cn("rounded-3xl bg-white p-3.5 ring-1 ring-edge sm:p-4")}
        >
          <div className="flex items-start gap-3">
            <Skeleton className="h-16 w-16 shrink-0 rounded-2xl sm:h-[4.5rem] sm:w-[4.5rem]" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="mt-2.5 border-t border-line pt-2.5">
            <Skeleton className="h-4 w-48" />
          </div>
        </li>
      ))}
    </ul>
  );
}
