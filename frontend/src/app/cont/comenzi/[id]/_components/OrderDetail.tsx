"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { Icons } from "@/components/icons";
import {
  Button,
  ButtonLink,
  ErrorState,
  FadeImage,
  Skeleton,
  StatusBadge,
} from "@/components/ui";
import {
  getOrder,
  listAgreements,
  listDocuments,
  listTracking,
} from "@/lib/api/orders";
import { useCurrentUserId } from "@/lib/auth/AuthProvider";
import { useApi } from "@/lib/hooks/useApi";
import { ORDER_STATUS } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import type { OrderAgreement, OrderDetail as Sale, OrderDocument } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { formatDateTimeRo } from "@/lib/utils/date";

import { Parties } from "@/components/orders/Parties";
import { TrackingNumber } from "@/components/orders/TrackingNumber";

import { DeliverySteps } from "./DeliverySteps";

/**
 * One sale, in full, for either party.
 *
 * <p>The conversation is the story of the sale and this is the record. Everything a party might
 * have to produce later lives here: what was charged and how it divided, where the parcel went,
 * which documents exist and under what numbers, and a single chronological trail of everything
 * that happened, acceptances included.
 *
 * <p>Written for both sides off one component rather than two pages. The sale is one object and the
 * differences are narrow — which figures are yours, whether the address is yours to see — so
 * duplicating the page would mean two places to keep in step and one of them quietly going stale.
 */
export function OrderDetail({ orderId }: { orderId: string }) {
  const userId = useCurrentUserId();

  const { data: order, error, loading, reload } = useApi(
    () => getOrder(orderId, userId!),
    `order:${orderId}`,
    { enabled: Boolean(userId) },
  );

  if (error) {
    return (
      <ErrorState
        title="Comanda nu a putut fi încărcată"
        description={error}
        action={
          <Button variant="secondary" onClick={reload}>
            Încearcă din nou
          </Button>
        }
      />
    );
  }

  if (!order || loading) {
    return <OrderDetailSkeleton />;
  }

  const viewerIsBuyer = order.buyerId === userId;

  return (
    <div className="flex flex-col gap-4">
      <Header order={order} />

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr] lg:items-start">
        <div className="flex flex-col gap-4">
          <Panel title="Parcursul comenzii">
            <DeliverySteps order={order} />
          </Panel>

          <History order={order} viewerIsBuyer={viewerIsBuyer} />
        </div>

        <div className="flex flex-col gap-4">
          <Money order={order} viewerIsBuyer={viewerIsBuyer} />
          <Delivery order={order} viewerIsBuyer={viewerIsBuyer} />
          <Documents order={order} viewerId={userId!} />
        </div>
      </div>
    </div>
  );
}

/**
 * The cause, by name, and a word that still reads as a sentence when it has gone.
 *
 * <p>A cause can be withdrawn after a sale. The donation still happened and the order is exactly
 * the record somebody would be looking for, so the page says "cauză" rather than breaking.
 */
function causeName(order: Sale): string {
  return order.cause?.name ?? "cauză";
}

/* --- the top of the page -------------------------------------------------- */

/**
 * What this is, and who it is between.
 *
 * <p>The two parties are shown as a pair with the item between them rather than as two rows in a
 * table of fields: a sale is a relationship, and which way round it is the thing a reader wants
 * first. The reader's own side is marked, so a person who both buys and sells can tell at a glance
 * which of the two they are here.
 */
function Header({ order }: { order: Sale }) {
  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-white p-4 ring-1 ring-edge sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="numeric font-display text-lg font-extrabold text-ink-900">
            Comanda {order.reference}
          </p>
          <p className="mt-0.5 text-[13px] text-ink-500">
            Înregistrată la {formatDateTimeRo(order.createdAt)}
          </p>
        </div>
        {/* The same badge the list wears, so a card and the page it opens are
            plainly the same object rather than two that resemble each other. */}
        <StatusBadge
          meta={ORDER_STATUS[order.status]}
          size="sm"
          marker={false}
          className="shrink-0 border-transparent text-[11px]"
        />
      </div>

      <Link
        href={`/licitatii/${order.auctionId}`}
        className="flex items-center gap-3 rounded-2xl bg-ink-50 p-2.5 transition hover:bg-ink-100"
      >
        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink-100">
          {order.auction?.images[0] ? (
            <FadeImage
              src={order.auction.images[0]}
              sizes="56px"
              className="object-cover"
            />
          ) : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[15px] leading-snug font-extrabold text-ink-900">
            {order.auction?.title ?? "Anunț retras"}
          </span>
          <span className="numeric mt-0.5 block text-[13px] text-ink-600">
            Preț adjudecat {formatMoney(order.finalPrice)}
          </span>
        </span>
      </Link>

      <Parties seller={order.seller} buyer={order.buyer} size="md" />

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3.5">
        <ButtonLink
          href="/cont/inbox"
          variant="secondary"
          size="sm"
          leftIcon={<Icons.inbox aria-hidden="true" className="h-4 w-4 shrink-0" />}
        >
          Deschide conversația
        </ButtonLink>
        <Link
          href={`/cauze/${order.cause?.slug ?? ""}`}
          className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-[13px] font-bold text-primary-700 transition hover:bg-primary-50"
        >
          <Icons.donation aria-hidden="true" className="h-4 w-4 shrink-0" />
          {formatMoney(order.donationAmount)} către {causeName(order)}
        </Link>
      </div>
    </section>
  );
}

/* --- the panels ----------------------------------------------------------- */

/**
 * One section of the record.
 *
 * <p>Sentence case, not uppercase. A record is read, and a page of shouted labels reads as a form
 * to be filled in rather than a document to be trusted.
 */
function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-white p-4 ring-1 ring-edge sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-[15px] font-extrabold text-ink-900">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Line({
  label,
  value,
  strong = false,
  tone,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
  tone?: "positive";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-[13px]">
      <span className="text-ink-500">{label}</span>
      <span
        className={cn(
          "numeric text-right",
          strong ? "font-display text-[15px] font-extrabold text-ink-900" : "font-semibold",
          tone === "positive" ? "text-primary-700" : !strong && "text-ink-800",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * The money, from the side that is looking.
 *
 * <p>A buyer is told what they paid and what it divided into; a seller what reaches them. Showing a
 * seller the buyer's fee would invite them to price against it, and it is not theirs — bid4 charges
 * the buyer, over the price, and the seller pays no commission at all.
 */
function Money({ order, viewerIsBuyer }: { order: Sale; viewerIsBuyer: boolean }) {
  return (
    <Panel title={viewerIsBuyer ? "Suma achitată" : "Suma cuvenită"}>
      <div className="divide-y divide-line">
        {viewerIsBuyer ? (
          <>
            <div>
              <Line label="Preț produs" value={formatMoney(order.finalPrice)} />
              <Line label="Comision platformă" value={formatMoney(order.platformTax)} />
              <Line label="Livrare" value={formatMoney(order.shipping)} />
            </div>
            <div className="pt-1">
              <Line label="Total" value={formatMoney(order.totalPaid)} strong />
            </div>
            <div className="pt-1">
              <Line
                label={`Din preț, către ${causeName(order)}`}
                value={`${formatMoney(order.donationAmount)} (${order.donationPercent}%)`}
                tone="positive"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <Line label="Preț adjudecat" value={formatMoney(order.finalPrice)} />
              <Line
                label={`Donație către ${causeName(order)}`}
                value={`${formatMoney(order.donationAmount)} (${order.donationPercent}%)`}
                tone="positive"
              />
            </div>
            <div className="pt-1">
              <Line label="Îți revine" value={formatMoney(order.sellerShare)} strong />
            </div>
          </>
        )}
      </div>
    </Panel>
  );
}

/** Where the parcel goes, and the address only for the party it belongs to. */
function Delivery({ order, viewerIsBuyer }: { order: Sale; viewerIsBuyer: boolean }) {
  const method = order.deliveryMethod;

  return (
    <Panel title="Livrare">
      {!method ? (
        <p className="text-[13px] text-ink-500">
          Modalitatea de livrare nu a fost stabilită încă.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          <Line
            label="Modalitate"
            value={
              method.type === "HOME_COURIER" ? "Curier la adresă" : "Easybox"
            }
          />
          {order.courier ? <Line label="Curier" value={order.courier} /> : null}

          {/* The same box as in the conversation, rather than the number on a
              row of its own: a consignment number is something to copy and to
              track with, and a table cell offers neither. */}
          {order.awb ? (
            <TrackingNumber
              awb={order.awb}
              viewerIsBuyer={viewerIsBuyer}
              className="mt-2 max-w-none"
            />
          ) : null}

          {/* The delivery address is the buyer's own. A seller sees how the
              parcel travels, never where a person lives or collects. */}
          {viewerIsBuyer ? (
            <div className="mt-2 rounded-2xl bg-ink-50 p-3">
              <p className="text-[12px] font-bold text-ink-500">
                {method.type === "HOME_COURIER" ? "Adresă de livrare" : "Easybox ales"}
              </p>
              <p className="mt-0.5 text-[13px] leading-snug text-ink-800">
                {addressOf(method)}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </Panel>
  );
}

/** The delivery point, written out. Shown to the buyer alone. */
function addressOf(method: NonNullable<Sale["deliveryMethod"]>): string {
  if (method.lockerName) {
    return [method.lockerName, method.lockerAddress].filter(Boolean).join(" · ");
  }
  // Flat, the way the snapshot arrives. Falling back to the label rather than to
  // nothing: a buyer who named it "Acasă" is still told which of their addresses
  // this parcel went to.
  const written = [
    method.recipientName,
    method.street,
    method.addressDetails,
    method.city,
    method.county,
    method.postalCode,
  ].filter(Boolean);
  return written.length > 0 ? written.join(", ") : method.label;
}

/** What each document is, in the words the reader needs rather than the enum's. */
const DOCUMENTS: Record<OrderDocument["kind"], { title: string; what: string }> = {
  PROFORMA: {
    title: "Proformă",
    what: "Suma de achitat, emisă la înregistrarea plății.",
  },
  INVOICE: {
    title: "Factură",
    what: "Documentul fiscal al comenzii, emis la finalizare.",
  },
  DONATION_RECEIPT: {
    title: "Chitanță de donație",
    what: "Dovada sumei virate către cauză.",
  },
  PAYOUT_STATEMENT: {
    title: "Situația plății către vânzător",
    what: "Suma virată și reținerile aplicate.",
  },
  SHIPPING_LABEL: {
    title: "Etichetă de expediere",
    what: "Se atașează pe colet, înainte de predarea la curier.",
  },
};

/**
 * The sale's paperwork.
 *
 * <p>Documents that are due but not yet issued are listed as due, with their number where one has
 * been reserved. A page that hides them answers "there is no invoice" to somebody who is looking
 * for one, which is the question this section exists to answer.
 */
function Documents({ order, viewerId }: { order: Sale; viewerId: string }) {
  const { data: documents, loading } = useApi(
    () => listDocuments(order.id, viewerId),
    `order:documents:${order.id}:${viewerId}`,
  );

  return (
    <Panel title="Documente">
      {loading && !documents ? (
        <Skeleton className="h-16 w-full" />
      ) : !documents || documents.length === 0 ? (
        <p className="text-[13px] text-ink-500">
          Documentele se emit pe parcursul comenzii. Primul este proforma, la
          înregistrarea plății.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {documents.map((document) => {
            const copy = DOCUMENTS[document.kind];
            return (
              <li
                key={document.kind}
                className="flex items-start gap-2.5 rounded-2xl bg-ink-50 p-3"
              >
                <Icons.invoice
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-ink-500"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[13px] font-extrabold text-ink-900">
                    {copy.title}
                  </p>
                  {document.number ? (
                    <p className="numeric text-[12px] text-ink-600">
                      {document.number}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-[12px] leading-snug text-ink-500">
                    {copy.what}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!document.available}
                  title={
                    document.available
                      ? undefined
                      : "Se emite după integrarea serviciului de facturare"
                  }
                  className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-2.5 py-1.5 text-[12px] font-bold text-ink-700 ring-1 ring-edge transition hover:ring-ink-300 disabled:text-ink-500 disabled:opacity-70"
                >
                  <Icons.download aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                  {document.available ? "Descarcă" : "În curs"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/* --- the trail ------------------------------------------------------------ */

/**
 * One entry in the order's history: something that happened, when, and who caused it.
 *
 * <p>An acceptance carries no flag of its own. It used to be marked with a chip reading
 * "acceptare", which on a phone stole the width the sentence needed and said in a label what the
 * sentence can say in a word — so the entry states who accepted what, and reads as a record rather
 * than as a row with metadata bolted to it.
 */
interface Entry {
  at: string;
  what: string;
  who?: string;
}

/** What each acceptance governed, said once, in the terms the party was shown. */
const ACCEPTANCES: Record<OrderAgreement["kind"], { what: string; by: "BUYER" | "SELLER" }> = {
  SALE: {
    what: "Condițiile vânzării, inclusiv prețul, comisionul și costul livrării",
    by: "BUYER",
  },
  PAYMENT: {
    what: "Condițiile de plată și de păstrare a sumei de către bid4",
    by: "BUYER",
  },
  SHIPPING: {
    what: "Condițiile de expediere și conformitatea produsului cu anunțul",
    by: "SELLER",
  },
};

/**
 * Everything that happened, in one list.
 *
 * <p>This is what replaced a section headed "Termeni acceptați". A list of ticked boxes is not how
 * a consent is evidenced anywhere that has to stand behind one: what matters is that at a stated
 * moment a named party accepted a stated version, alongside everything else that happened to the
 * order. So the acceptances are entries in the order's own audit trail, marked as the legal ones,
 * rather than a separate panel implying they are a formality.
 *
 * <p>It is also the honest shape. An acceptance and a courier scan are the same kind of fact — an
 * event, timestamped, that nobody may edit afterwards — and the record either party is read back
 * in a dispute is the trail, not a checklist.
 */
function History({ order, viewerIsBuyer }: { order: Sale; viewerIsBuyer: boolean }) {
  const { data: agreements } = useApi(
    () => listAgreements(order.id),
    `order:agreements:${order.id}`,
  );

  // Fetched, not read off the order. The scans are their own resource — there
  // can be many and most screens want none — so the order response does not
  // carry them, and reading `order.trackingEvents` here threw on every page.
  const { data: scans } = useApi(
    () => listTracking(order.id),
    `order:tracking:${order.id}`,
  );

  const buyerName = order.buyer?.displayName ?? "Cumpărătorul";
  const sellerName = order.seller?.displayName ?? "Vânzătorul";

  const entries: Entry[] = [
    {
      at: order.createdAt,
      what: `Oferta de ${formatMoney(order.finalPrice)} a fost acceptată și comanda a fost înregistrată`,
      who: sellerName,
    },
    ...(agreements ?? []).map((row) => ({
      at: row.acceptedAt,
      what: `${ACCEPTANCES[row.kind].by === "BUYER" ? buyerName : sellerName} a acceptat ${ACCEPTANCES[row.kind].what}, versiunea ${row.termsVersion}`,
    })),
    ...(scans ?? []).map((event) => ({
      at: event.at,
      what: event.location ? `${event.label} · ${event.location}` : event.label,
      who: order.courier ?? undefined,
    })),
    ...(order.releasedAt
      ? [
          {
            at: order.releasedAt,
            what: `Suma a fost eliberată: ${formatMoney(order.donationAmount)} către ${causeName(order)}, ${formatMoney(order.sellerShare)} către vânzător`,
          },
        ]
      : []),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  return (
    <Panel title="Istoricul comenzii">
      <ol className="flex flex-col divide-y divide-line">
        {entries.map((entry, index) => (
          // Stacked on a phone, two columns from `sm` up. A fixed 7.5rem date
          // column is a third of the width on a 375px screen, so the sentence
          // it sits beside wrapped every two or three words.
          <li
            key={`${entry.at}-${index}`}
            className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:gap-3"
          >
            <span className="numeric text-[12px] leading-snug text-ink-500 sm:w-[7.5rem] sm:shrink-0">
              {formatDateTimeRo(entry.at)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] leading-snug text-ink-800">
                {entry.what}
              </span>
              {entry.who ? (
                <span className="mt-0.5 block text-[12px] text-ink-500">
                  {entry.who}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>

      <p className="mt-3 border-t border-line pt-3 text-[12px] leading-relaxed text-ink-500">
        {viewerIsBuyer
          ? "Suma achitată este păstrată de bid4 și va fi eliberată către vânzător și către cauză numai după confirmarea livrării sau după expirarea termenului de verificare."
          : "Suma achitată de cumpărător este păstrată de bid4 și va fi eliberată numai după confirmarea livrării sau după expirarea termenului de verificare."}
      </p>
    </Panel>
  );
}

/* --- loading -------------------------------------------------------------- */

/**
 * The loaded page, box for box.
 *
 * <p>Mirrors the two-column layout and the panel heights so the page fills in rather than jumping
 * once the order arrives.
 */
function OrderDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-[17.5rem] w-full rounded-3xl" />
      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr] lg:items-start">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-[21rem] w-full rounded-3xl" />
          <Skeleton className="h-56 w-full rounded-3xl" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-52 w-full rounded-3xl" />
          <Skeleton className="h-40 w-full rounded-3xl" />
          <Skeleton className="h-44 w-full rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
