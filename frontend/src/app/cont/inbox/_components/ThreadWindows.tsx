"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { TrackingNumber } from "@/components/orders/TrackingNumber";
import { Icons } from "@/components/icons";
import {
  Avatar,
  Bid4Icon,
  Button,
  Checkbox,
  FadeImage,
  Field,
  Input,
  Legal,
  Skeleton,
  StatusBadge,
  Textarea,
} from "@/components/ui";
import { minimumBid } from "@/lib/api/bids";
import { searchLockers } from "@/lib/api/shipping";
import { addDeliveryMethod, listDeliveryMethods } from "@/lib/api/users";
import { ORDER, SHIPPING_PRICES } from "@/lib/config";
import { DISPUTE_REASON, ORDER_STATUS } from "@/lib/labels";
import { formatMoney, parseLeiInput } from "@/lib/money";
import type {
  AuctionDetail,
  Conversation,
  DeliveryMethod,
  DisputeReason,
  EasyboxLocker,
  OrderDetail,
} from "@/lib/types";
import { isOfferable } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

export type Pane =
  | "info"
  | "offer"
  | "withdraw"
  | "delivery"
  | "pay"
  | "label"
  | "receipt"
  | "problem";

export function PaneShell({
  title,
  onBack,
  footer,
  children,
}: {
  title: string;
  onBack: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 animate-fade-in flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Înapoi la conversație"
          className="-ml-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-700 transition hover:bg-ink-100"
        >
          <Icons.crumb aria-hidden="true" className="h-5 w-5 rotate-180" />
        </button>
        <h2 className="min-w-0 flex-1 truncate font-display text-[15px] font-extrabold text-ink-900">
          {title}
        </h2>
      </div>
      <div
        data-lenis-prevent
        className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
      >
        {children}
      </div>
      {footer ? (
        <div className="flex shrink-0 flex-col gap-2 border-t border-line p-3">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

function Lines({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 text-[15px] leading-relaxed text-ink-700">
      {children}
    </div>
  );
}

function Sum({
  rows,
  total,
}: {
  rows: { label: string; value: number }[];
  total?: { label: string; value: number };
}) {
  return (
    <dl className="flex flex-col rounded-2xl bg-canvas px-4 py-2 ring-1 ring-edge">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-baseline justify-between gap-3 py-1.5 text-[15px]"
        >
          <dt className="text-ink-600">{row.label}</dt>
          <dd className="numeric font-bold text-ink-900">
            {formatMoney(row.value)}
          </dd>
        </div>
      ))}
      {total ? (
        <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-line py-2">
          <dt className="font-display font-extrabold text-ink-900">
            {total.label}
          </dt>
          <dd className="numeric font-display text-lg font-extrabold text-ink-900">
            {formatMoney(total.value)}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

function InfoRow({
  href,
  icon,
  label,
  children,
}: {
  href?: string;
  icon: React.ReactNode;
  label?: string;
  children: React.ReactNode;
}) {
  const body = (
    <>
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-ink-50 text-ink-600"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        {label ? (
          <span className="block text-[12px] text-ink-500">{label}</span>
        ) : null}
        <span className="block text-[15px] text-ink-900">{children}</span>
      </span>
      {href ? (
        <Icons.crumb aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-400" />
      ) : null}
    </>
  );

  return (
    <li>
      {href ? (
        <Link
          href={href}
          className="-mx-2 flex items-center gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-ink-50"
        >
          {body}
        </Link>
      ) : (
        <div className="flex items-center gap-3 py-2.5">{body}</div>
      )}
    </li>
  );
}

const PAID = new Set([
  "PAID_HELD",
  "LABEL_GENERATED",
  "DROPPED_OFF",
  "IN_TRANSIT",
  "ARRIVED_AT_LOCKER",
  "DELIVERED",
  "DISPUTE_OPEN",
  "COMPLETED",
  "RELEASED",
]);

export function InfoPane({
  conversation,
  auction,
  order,
  viewerIsBuyer,
  onBack,
}: {
  conversation: Conversation;
  auction: AuctionDetail | null;
  order: OrderDetail | null;
  viewerIsBuyer: boolean;
  onBack: () => void;
}) {
  if (conversation.kind === "SUPPORT") {
    return (
      <PaneShell title="Detalii" onBack={onBack}>
        <ul className="flex flex-col divide-y divide-line">
          <InfoRow icon={<Bid4Icon size={22} />} label="Conversație cu">
            <span className="font-bold">Echipa bid4</span>
          </InfoRow>
          <InfoRow
            href="/ajutor"
            icon={<Icons.help className="h-5 w-5" />}
            label="Ai o întrebare?"
          >
            Centrul de ajutor
          </InfoRow>
        </ul>
      </PaneShell>
    );
  }

  const partner = conversation.otherParty;
  const delivery = order?.deliveryMethod;
  const offered = auction?.viewerBidAmount;

  return (
    <PaneShell title="Detalii" onBack={onBack}>
      <ul className="flex flex-col divide-y divide-line">
        {conversation.listingId ? (
          <InfoRow
            href={`/licitatii/${conversation.listingId}`}
            icon={
              conversation.listingImageUrl ? (
                <span className="relative block h-10 w-10">
                  <FadeImage
                    src={conversation.listingImageUrl}
                    sizes="40px"
                    className="object-cover"
                  />
                </span>
              ) : (
                <Icons.auction className="h-5 w-5" />
              )
            }
          >
            <span className="block truncate font-bold">
              {conversation.listingTitle}
            </span>
          </InfoRow>
        ) : null}

        {partner ? (
          <InfoRow
            href={`/profil/${partner.username}`}
            icon={
              <Avatar
                name={partner.displayName}
                src={partner.avatarUrl}
                accountType={partner.accountType}
                size="sm"
              />
            }
            label={viewerIsBuyer ? "Vânzător" : "Cumpărător"}
          >
            <span className="font-bold">{partner.displayName}</span>
          </InfoRow>
        ) : null}

        {order ? (
          <InfoRow
            href={`/cont/comenzi/${order.id}`}
            icon={<Icons.invoice className="h-5 w-5" />}
            label={`Comanda ${order.reference}`}
          >
            <StatusBadge
              meta={ORDER_STATUS[order.status]}
              size="sm"
              marker={false}
              className="mt-0.5 border-transparent text-[11px]"
            />
          </InfoRow>
        ) : viewerIsBuyer && auction ? (
          <InfoRow
            icon={<Icons.auction className="h-5 w-5" />}
            label="Oferta ta"
          >
            {offered ? (
              <span className="numeric font-bold">{formatMoney(offered)}</span>
            ) : isOfferable(auction.status) ? (
              "Nicio ofertă transmisă"
            ) : (
              "Anunțul nu mai primește oferte"
            )}
          </InfoRow>
        ) : null}

        {delivery ? (
          <InfoRow
            icon={
              delivery.type === "EASYBOX" ? (
                <Icons.locker className="h-5 w-5" />
              ) : (
                <Icons.delivery className="h-5 w-5" />
              )
            }
            label={
              delivery.type === "EASYBOX"
                ? "Livrare la Easybox"
                : "Livrare prin curier la adresă"
            }
          >
            {delivery.type === "EASYBOX"
              ? [delivery.lockerName, delivery.lockerAddress]
                  .filter(Boolean)
                  .join(", ")
              : [delivery.street, delivery.city, delivery.county]
                  .filter(Boolean)
                  .join(", ")}
          </InfoRow>
        ) : null}

        {order && viewerIsBuyer && PAID.has(order.status) ? (
          <InfoRow
            icon={<Icons.escrow className="h-5 w-5" />}
            label="Total achitat"
          >
            <span className="numeric font-bold">
              {formatMoney(order.totalPaid)}
            </span>
          </InfoRow>
        ) : null}

        <InfoRow
          href="/ajutor"
          icon={<Icons.help className="h-5 w-5" />}
          label="Ai o întrebare?"
        >
          Centrul de ajutor
        </InfoRow>
      </ul>

      {order?.awb ? (
        <TrackingNumber
          awb={order.awb}
          viewerIsBuyer={viewerIsBuyer}
          className="mt-3"
        />
      ) : null}
    </PaneShell>
  );
}

export function OfferPane({
  auction,
  busy,
  onBack,
  onSubmit,
}: {
  auction: AuctionDetail;
  busy: boolean;
  onBack: () => void;
  onSubmit: (amount: number) => Promise<boolean>;
}) {
  const minimum = minimumBid(auction);
  const [amount, setAmount] = useState(String(minimum / 100));
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = parseLeiInput(amount);
  const buysNow =
    parsed !== null &&
    auction.buyNowPrice !== undefined &&
    parsed >= auction.buyNowPrice;
  const price = buysNow ? auction.buyNowPrice! : parsed;
  const valid = price !== null && (buysNow || price >= minimum);

  const submit = async () => {
    if (price === null) {
      setError("Introdu o sumă validă.");
      return;
    }
    if (!buysNow && price < minimum) {
      setError(`Oferta minimă este ${formatMoney(minimum)}.`);
      return;
    }
    setError(null);
    await onSubmit(price);
  };

  return (
    <PaneShell
      title={auction.viewerBidAmount ? "Modifică oferta" : "Fă o ofertă"}
      onBack={onBack}
      footer={
        <Button
          size="lg"
          fullWidth
          disabled={!valid || !accepted}
          loading={busy}
          onClick={submit}
        >
          {price === null
            ? "Trimite oferta"
            : buysNow
              ? `Cumpără la ${formatMoney(price)}`
              : `Trimite oferta de ${formatMoney(price)}`}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {auction.viewerBidAmount ? (
          <p className="text-[15px] text-ink-600">
            Oferta ta actuală este de{" "}
            <strong className="numeric font-bold text-ink-900">
              {formatMoney(auction.viewerBidAmount)}
            </strong>
            . Noua ofertă o înlocuiește.
          </p>
        ) : null}

        <Field
          label="Suma oferită"
          hint={`Oferta minimă este ${formatMoney(minimum)}.`}
          error={error ?? undefined}
        >
          <Input
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            autoComplete="off"
            trailing={<span className="font-bold text-ink-500">lei</span>}
          />
        </Field>

        <Lines>
          <p>
            {buysNow
              ? "La acest preț oferta ta este acceptată imediat, fără acordul vânzătorului."
              : "Dacă vânzătorul acceptă oferta, ai obligația de a finaliza cumpărarea la această sumă, plus protecția cumpărătorului și livrarea."}
          </p>
          <p>
            Nu plătești nimic acum. După acceptare ai{" "}
            {ORDER.CONFIRMATION_HOURS} de ore pentru a alege livrarea și a
            plăti, din această conversație.
          </p>
        </Lines>

        <Checkbox
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
          label={
            <>
              Am citit cele de mai sus și accept{" "}
              <Legal href="/termeni">Termenii și Condițiile</Legal>.
            </>
          }
        />
      </div>
    </PaneShell>
  );
}

export function WithdrawPane({
  amount,
  busy,
  onBack,
  onConfirm,
}: {
  amount: number;
  busy: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <PaneShell
      title="Retrage oferta"
      onBack={onBack}
      footer={
        <>
          <Button
            variant="danger"
            size="lg"
            fullWidth
            loading={busy}
            onClick={onConfirm}
          >
            Retrage oferta de {formatMoney(amount)}
          </Button>
          <Button variant="ghost" size="lg" fullWidth onClick={onBack}>
            Păstrează oferta
          </Button>
        </>
      }
    >
      <Lines>
        <p>
          Oferta de{" "}
          <strong className="numeric font-bold text-ink-900">
            {formatMoney(amount)}
          </strong>{" "}
          va fi retrasă, iar vânzătorul nu o mai poate accepta.
        </p>
        <p>Poți trimite oricând o ofertă nouă, cât timp anunțul este activ.</p>
      </Lines>
    </PaneShell>
  );
}

const TYPE_PRICE = {
  EASYBOX: SHIPPING_PRICES.EASYBOX,
  HOME_COURIER: SHIPPING_PRICES.HOME_COURIER,
} as const;

function MethodChoice({
  method,
  selected,
  onSelect,
}: {
  method: DeliveryMethod;
  selected: boolean;
  onSelect: () => void;
}) {
  const where =
    method.type === "EASYBOX"
      ? [method.lockerName, method.lockerAddress].filter(Boolean).join(", ")
      : [
          method.homeAddress?.street,
          method.homeAddress?.city,
          method.homeAddress?.county,
        ]
          .filter(Boolean)
          .join(", ");

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 transition",
        selected
          ? "bg-primary-50/60 ring-2 ring-primary-500"
          : "ring-edge hover:bg-ink-50",
      )}
    >
      <span
        aria-hidden="true"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-primary-700 ring-1 ring-edge"
      >
        {method.type === "EASYBOX" ? (
          <Icons.locker className="h-4.5 w-4.5" />
        ) : (
          <Icons.delivery className="h-4.5 w-4.5" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-[15px] font-bold text-ink-900">
          {method.type === "EASYBOX" ? "Easybox" : "Curier la adresă"}
        </span>
        <span className="block truncate text-[13px] text-ink-600">{where}</span>
      </span>
      <span className="numeric shrink-0 text-[13px] font-bold text-ink-900">
        {formatMoney(TYPE_PRICE[method.type])}
      </span>
    </button>
  );
}

function EasyboxForm({
  userId,
  onSaved,
  first,
}: {
  userId: string;
  onSaved: (method: DeliveryMethod) => void;
  first: boolean;
}) {
  const [query, setQuery] = useState("");
  const [lockers, setLockers] = useState<EasyboxLocker[] | null>(null);
  const [locker, setLocker] = useState<EasyboxLocker | null>(null);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void searchLockers(query)
        .then((rows) => {
          if (!cancelled) setLockers(rows);
        })
        .catch(() => {
          if (!cancelled) setLockers([]);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const save = async () => {
    if (!locker || !phone.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const method = await addDeliveryMethod(userId, {
        type: "EASYBOX",
        label: locker.name,
        easyboxLockerId: locker.id,
        lockerName: locker.name,
        lockerAddress: `${locker.address}, ${locker.city}`,
        phone: phone.trim(),
        isDefault: first,
      });
      onSaved(method);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Lockerul nu a fost salvat.",
      );
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Field label="Caută un Easybox">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Oraș, stradă sau centru comercial"
          autoComplete="off"
        />
      </Field>

      <ul className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
        {lockers === null
          ? Array.from({ length: 3 }).map((_, index) => (
              <li key={index}>
                <Skeleton className="h-14 rounded-2xl" />
              </li>
            ))
          : lockers.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  aria-pressed={locker?.id === row.id}
                  onClick={() => setLocker(row)}
                  className={cn(
                    "w-full rounded-2xl px-3 py-2.5 text-left ring-1 transition",
                    locker?.id === row.id
                      ? "bg-primary-50/60 ring-2 ring-primary-500"
                      : "ring-edge hover:bg-ink-50",
                  )}
                >
                  <span className="block truncate text-[15px] font-bold text-ink-900">
                    {row.name}
                  </span>
                  <span className="block truncate text-[13px] text-ink-600">
                    {row.address}, {row.city} · {row.scheduleNote}
                  </span>
                </button>
              </li>
            ))}
        {lockers?.length === 0 ? (
          <li className="py-3 text-center text-[13px] text-ink-500">
            Niciun Easybox găsit.
          </li>
        ) : null}
      </ul>

      <Field label="Telefon" hint="Curierul trimite pe acest număr codul de ridicare." error={error ?? undefined}>
        <Input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </Field>

      <Button
        fullWidth
        disabled={!locker || !phone.trim()}
        loading={saving}
        onClick={save}
      >
        Salvează lockerul
      </Button>
    </div>
  );
}

function AddressForm({
  userId,
  onSaved,
  first,
}: {
  userId: string;
  onSaved: (method: DeliveryMethod) => void;
  first: boolean;
}) {
  const [draft, setDraft] = useState({
    recipientName: "",
    street: "",
    city: "",
    county: "",
    postalCode: "",
    details: "",
    phone: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set =
    (key: keyof typeof draft) => (event: React.ChangeEvent<HTMLInputElement>) =>
      setDraft((value) => ({ ...value, [key]: event.target.value }));

  const complete =
    draft.recipientName.trim() &&
    draft.street.trim() &&
    draft.city.trim() &&
    draft.county.trim() &&
    draft.phone.trim();

  const save = async () => {
    if (!complete) return;
    setSaving(true);
    setError(null);
    try {
      const method = await addDeliveryMethod(userId, {
        type: "HOME_COURIER",
        label: "Acasă",
        homeAddress: {
          recipientName: draft.recipientName.trim(),
          street: draft.street.trim(),
          city: draft.city.trim(),
          county: draft.county.trim(),
          postalCode: draft.postalCode.trim(),
          details: draft.details.trim() || undefined,
        },
        phone: draft.phone.trim(),
        isDefault: first,
      });
      onSaved(method);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Adresa nu a fost salvată.",
      );
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Field label="Nume destinatar">
        <Input
          autoComplete="name"
          value={draft.recipientName}
          onChange={set("recipientName")}
        />
      </Field>
      <Field label="Stradă și număr">
        <Input
          autoComplete="street-address"
          value={draft.street}
          onChange={set("street")}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Localitate">
          <Input
            autoComplete="address-level2"
            value={draft.city}
            onChange={set("city")}
          />
        </Field>
        <Field label="Județ">
          <Input
            autoComplete="address-level1"
            value={draft.county}
            onChange={set("county")}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cod poștal" optionalLabel>
          <Input
            autoComplete="postal-code"
            inputMode="numeric"
            value={draft.postalCode}
            onChange={set("postalCode")}
          />
        </Field>
        <Field label="Telefon">
          <Input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={draft.phone}
            onChange={set("phone")}
          />
        </Field>
      </div>
      <Field label="Bloc, scară, apartament" optionalLabel error={error ?? undefined}>
        <Input value={draft.details} onChange={set("details")} />
      </Field>
      <Button fullWidth disabled={!complete} loading={saving} onClick={save}>
        Salvează adresa
      </Button>
    </div>
  );
}

export function DeliveryPane({
  userId,
  busy,
  onBack,
  onChoose,
}: {
  userId: string;
  busy: boolean;
  onBack: () => void;
  onChoose: (deliveryMethodId: string) => void;
}) {
  const [methods, setMethods] = useState<DeliveryMethod[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState<"EASYBOX" | "HOME_COURIER" | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    void listDeliveryMethods(userId)
      .then((rows) => {
        if (cancelled) return;
        setMethods(rows);
        setSelected(rows.find((row) => row.isDefault)?.id ?? rows[0]?.id ?? null);
        if (rows.length === 0) setAdding("EASYBOX");
      })
      .catch(() => {
        if (cancelled) return;
        setMethods([]);
        setAdding("EASYBOX");
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const saved = (method: DeliveryMethod) => {
    setMethods((rows) => [...(rows ?? []), method]);
    setSelected(method.id);
    setAdding(null);
  };

  const chosen = methods?.find((row) => row.id === selected);

  return (
    <PaneShell
      title="Alege livrarea"
      onBack={adding && methods?.length ? () => setAdding(null) : onBack}
      footer={
        adding ? null : (
          <Button
            size="lg"
            fullWidth
            disabled={!chosen}
            loading={busy}
            onClick={() => chosen && onChoose(chosen.id)}
          >
            {chosen
              ? `Continuă · livrare ${formatMoney(TYPE_PRICE[chosen.type])}`
              : "Continuă"}
          </Button>
        )
      }
    >
      {methods === null ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
        </div>
      ) : adding ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-ink-100 p-1">
            {(["EASYBOX", "HOME_COURIER"] as const).map((type) => (
              <button
                key={type}
                type="button"
                aria-pressed={adding === type}
                onClick={() => setAdding(type)}
                className={cn(
                  "rounded-xl py-2 text-sm font-bold transition",
                  adding === type
                    ? "bg-white text-ink-900 shadow-sm"
                    : "text-ink-600 hover:text-ink-900",
                )}
              >
                {type === "EASYBOX" ? "Easybox" : "Curier la adresă"}{" "}
                <span className="numeric font-semibold text-ink-500">
                  {formatMoney(TYPE_PRICE[type], { compact: true })}
                </span>
              </button>
            ))}
          </div>
          {adding === "EASYBOX" ? (
            <EasyboxForm userId={userId} first={methods.length === 0} onSaved={saved} />
          ) : (
            <AddressForm userId={userId} first={methods.length === 0} onSaved={saved} />
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {methods.map((method) => (
            <MethodChoice
              key={method.id}
              method={method}
              selected={selected === method.id}
              onSelect={() => setSelected(method.id)}
            />
          ))}
          <button
            type="button"
            onClick={() => setAdding("EASYBOX")}
            className="mt-1 inline-flex items-center gap-2 self-start rounded-xl px-2 py-1.5 text-sm font-bold text-primary-700 transition hover:bg-primary-50"
          >
            <Icons.add aria-hidden="true" className="h-4 w-4" />
            Adaugă un Easybox sau o adresă
          </button>
        </div>
      )}
    </PaneShell>
  );
}

export function PayPane({
  order,
  busy,
  onBack,
  onPay,
}: {
  order: OrderDetail;
  busy: boolean;
  onBack: () => void;
  onPay: () => void;
}) {
  const delivery = order.deliveryMethod;
  return (
    <PaneShell
      title="Plătește comanda"
      onBack={onBack}
      footer={
        <Button size="lg" fullWidth loading={busy} onClick={onPay}>
          Plătește {formatMoney(order.totalPaid)}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Sum
          rows={[
            { label: "Preț produs", value: order.finalPrice },
            { label: "Protecția cumpărătorului", value: order.platformTax },
            { label: "Livrare", value: order.shipping },
          ]}
          total={{ label: "Total de plată", value: order.totalPaid }}
        />
        {delivery ? (
          <p className="flex items-start gap-2.5 text-[15px] text-ink-700">
            {delivery.type === "EASYBOX" ? (
              <Icons.locker aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ink-500" />
            ) : (
              <Icons.delivery aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ink-500" />
            )}
            <span>
              {delivery.type === "EASYBOX"
                ? `Livrare la ${delivery.lockerName ?? "Easybox"}`
                : `Livrare la ${[delivery.street, delivery.city].filter(Boolean).join(", ")}`}
            </span>
          </p>
        ) : null}
        <Lines>
          <p>
            Suma este păstrată de bid4 și eliberată vânzătorului și cauzei după
            finalizarea comenzii. Datele cardului sunt procesate securizat de
            partenerul de plăți și nu sunt vizibile vânzătorului.
          </p>
        </Lines>
      </div>
    </PaneShell>
  );
}

export function ConfirmPane({
  title,
  lines,
  confirm,
  tone = "primary",
  busy,
  onBack,
  onConfirm,
}: {
  title: string;
  lines: string[];
  confirm: string;
  tone?: "primary" | "danger";
  busy: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <PaneShell
      title={title}
      onBack={onBack}
      footer={
        <>
          <Button
            size="lg"
            fullWidth
            variant={tone}
            loading={busy}
            onClick={onConfirm}
          >
            {confirm}
          </Button>
          <Button variant="ghost" size="lg" fullWidth onClick={onBack}>
            Înapoi
          </Button>
        </>
      }
    >
      <Lines>
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </Lines>
    </PaneShell>
  );
}

export function ProblemPane({
  busy,
  onBack,
  onSubmit,
}: {
  busy: boolean;
  onBack: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState<DisputeReason | null>(null);
  const [details, setDetails] = useState("");

  return (
    <PaneShell
      title="Semnalează o problemă"
      onBack={onBack}
      footer={
        <Button
          size="lg"
          fullWidth
          variant="danger"
          disabled={!reason}
          loading={busy}
          onClick={() =>
            reason &&
            onSubmit(
              details.trim()
                ? `${DISPUTE_REASON[reason]}: ${details.trim()}`
                : DISPUTE_REASON[reason],
            )
          }
        >
          Trimite sesizarea
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-[15px] leading-relaxed text-ink-700">
          Suma rămâne la bid4 până la soluționare. Echipa bid4 analizează
          sesizarea și îți răspunde în această conversație.
        </p>
        <div className="flex flex-col gap-1.5">
          {(Object.keys(DISPUTE_REASON) as DisputeReason[]).map((code) => (
            <button
              key={code}
              type="button"
              aria-pressed={reason === code}
              onClick={() => setReason(code)}
              className={cn(
                "rounded-2xl px-3.5 py-3 text-left text-[15px] font-semibold ring-1 transition",
                reason === code
                  ? "bg-danger-50 text-danger-700 ring-2 ring-danger-500"
                  : "text-ink-800 ring-edge hover:bg-ink-50",
              )}
            >
              {DISPUTE_REASON[code]}
            </button>
          ))}
        </div>
        <Field label="Detalii" optionalLabel>
          <Textarea
            rows={3}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            maxLength={900}
          />
        </Field>
      </div>
    </PaneShell>
  );
}
