"use client";

import Link from "next/link";

import { Icons } from "@/components/icons";
import { Skeleton } from "@/components/ui";
import { listAgreements } from "@/lib/api/orders";
import { useApi } from "@/lib/hooks/useApi";
import { formatMoney } from "@/lib/money";
import type { OrderDetail } from "@/lib/types";
import { formatDateTimeRo } from "@/lib/utils/date";

/** What each promise was about, said once, in the words the person was shown. */
const AGREEMENTS: Record<string, { title: string; what: string }> = {
  SALE: {
    title: "Termenii vânzării",
    what: "Prețul, comisionul și costul livrării, acceptate la alegerea metodei de livrare.",
  },
  PAYMENT: {
    title: "Termenii plății",
    what: "Suma este administrată de bid4 și se eliberează după confirmarea primirii.",
  },
  SHIPPING: {
    title: "Termenii expedierii",
    what: "Coletul este predat curierului cu eticheta emisă, în starea descrisă în anunț.",
  },
};

/**
 * One sale, in full.
 *
 * <p>Everything here is deliberately absent from the conversation: the conversation is read by both
 * parties and is the story of the sale, while this is the record, and some of it belongs to one
 * side only. The delivery address is the clearest case — the buyer sees theirs, the seller never
 * does.
 */
export function OrderRecord({ order }: { order: OrderDetail }) {
  const { data: agreements, loading } = useApi(
    () => listAgreements(order.id),
    `orders:agreements:${order.id}`,
  );

  // This page is the buying side; the seller reads their half at /cont/vanzari.
  const buyer = true;

  return (
    <div className="flex flex-col gap-5 border-t border-line p-4">
      <div className="grid gap-5 sm:grid-cols-2">
        <Block title="Comanda">
          <Line label="Număr" value={order.reference} mono />
          <Line label="Deschisă" value={formatDateTimeRo(order.createdAt)} />
          <Line
            label={buyer ? "Vânzător" : "Cumpărător"}
            value={
              <Link
                href={`/profil/${buyer ? order.seller.username : order.buyer.username}`}
                className="font-bold text-primary-700 hover:underline"
              >
                {buyer ? order.seller.displayName : order.buyer.displayName}
              </Link>
            }
          />
          <Line
            label="Cauza susținută"
            value={
              <Link
                href={`/cauze/${order.cause.slug}`}
                className="font-bold text-primary-700 hover:underline"
              >
                {order.cause.name}
              </Link>
            }
          />
        </Block>

        {/* The money, from the side that is looking. A buyer is told what they
            paid and what it was split into; a seller is told what reaches them.
            Showing a seller the buyer's fee would invite them to price against
            it, and it is not theirs. */}
        <Block title={buyer ? "Ce ai plătit" : "Ce încasezi"}>
          {buyer ? (
            <>
              <Line label="Preț produs" value={formatMoney(order.finalPrice)} mono />
              <Line label="Comision bid4" value={formatMoney(order.platformTax)} mono />
              <Line label="Livrare" value={formatMoney(order.shipping)} mono />
              <Line label="Total" value={formatMoney(order.totalPaid)} mono strong />
              <Line
                label={`Din preț, către ${order.cause.name}`}
                value={`${formatMoney(order.donationAmount)} (${order.donationPercent}%)`}
                mono
              />
            </>
          ) : (
            <>
              <Line label="Preț produs" value={formatMoney(order.finalPrice)} mono />
              <Line
                label={`Donație către ${order.cause.name}`}
                value={`${formatMoney(order.donationAmount)} (${order.donationPercent}%)`}
                mono
              />
              <Line label="Îți revine" value={formatMoney(order.sellerShare)} mono strong />
              <Line label="Comision de plătit" value="0,00 lei" mono />
            </>
          )}
        </Block>

        <Block title="Livrare">
          <Line
            label="Metodă"
            value={
              order.deliveryMethod?.type === "HOME_COURIER"
                ? "Curier la adresă"
                : "Easybox"
            }
          />
          {/* Only to the person it belongs to. */}
          {buyer && order.deliveryMethod ? (
            <Line
              label="Adresă"
              value={addressOf(order.deliveryMethod)}
            />
          ) : null}
          {order.awb ? <Line label="AWB" value={order.awb} mono /> : null}
          {order.courier ? <Line label="Curier" value={order.courier} /> : null}
        </Block>

        <Block title="Documente">
          <Document label="Proformă" available={Boolean(order.paidAt)} />
          <Document label="Factură" available={order.status === "COMPLETED"} />
          {!buyer && order.awb ? <Document label="Etichetă de expediere" available /> : null}
        </Block>
      </div>

      {order.trackingEvents.length > 0 ? (
        <Block title="Traseul coletului">
          <ol className="flex flex-col gap-1.5">
            {order.trackingEvents.map((event) => (
              <li key={event.id} className="flex items-baseline gap-2 text-[13px]">
                <span className="numeric shrink-0 text-ink-500">
                  {formatDateTimeRo(event.at)}
                </span>
                <span className="text-ink-700">{event.label}</span>
              </li>
            ))}
          </ol>
        </Block>
      ) : null}

      <Block title="Termeni acceptați">
        {loading ? (
          <Skeleton className="h-10 w-full" />
        ) : agreements && agreements.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {agreements.map((row) => {
              const copy = AGREEMENTS[row.kind];
              return (
                <li key={row.kind} className="flex items-start gap-2">
                  <Icons.check
                    aria-hidden="true"
                    className="mt-1 h-3.5 w-3.5 shrink-0 text-primary-700"
                  />
                  <span>
                    <span className="block text-[13px] font-semibold text-ink-800">
                      {copy?.title ?? row.kind}
                    </span>
                    <span className="block text-[12px] text-ink-500">
                      {copy?.what} Acceptați la {formatDateTimeRo(row.acceptedAt)}, versiunea{" "}
                      <span className="numeric">{row.termsVersion}</span>.
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[13px] text-ink-500">
            Nimic acceptat încă. Termenii se acceptă la fiecare pas al comenzii.
          </p>
        )}
      </Block>
    </div>
  );
}

/** The delivery point, written out. Shown to the buyer alone — it is their address. */
function addressOf(method: NonNullable<OrderDetail["deliveryMethod"]>): string {
  if (method.lockerName) {
    return [method.lockerName, method.lockerAddress].filter(Boolean).join(" · ");
  }
  const home = method.homeAddress;
  if (!home) return method.label;
  return [home.recipientName, home.street, home.city, home.county]
    .filter(Boolean)
    .join(", ");
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-display text-[13px] font-extrabold tracking-wide text-ink-500 uppercase">
        {title}
      </h3>
      <div className="flex flex-col gap-1">{children}</div>
    </section>
  );
}

function Line({
  label,
  value,
  mono = false,
  strong = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  strong?: boolean;
}) {
  return (
    <p className="flex items-baseline justify-between gap-3 text-[13px]">
      <span className="text-ink-500">{label}</span>
      <span
        className={
          (mono ? "numeric " : "") +
          (strong ? "font-extrabold text-ink-900" : "font-semibold text-ink-800") +
          " text-right"
        }
      >
        {value}
      </span>
    </p>
  );
}

/**
 * A document, and whether it exists yet.
 *
 * <p>Listed before it is available rather than appearing from nowhere, so somebody looking for an
 * invoice can see that there will be one and when. TODO(backend): GET /orders/{id}/documents/{kind}.
 */
function Document({ label, available }: { label: string; available: boolean }) {
  return (
    <button
      type="button"
      disabled
      title={
        available
          ? "Disponibil după integrarea serviciului de facturare"
          : "Se emite la pasul următor al comenzii"
      }
      className="flex items-center gap-2 rounded-lg px-1 py-0.5 text-left text-[13px] font-semibold text-ink-700 disabled:opacity-60"
    >
      <Icons.download aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ink-400" />
      {label}
      {!available ? <span className="text-[12px] text-ink-500">· în curând</span> : null}
    </button>
  );
}
