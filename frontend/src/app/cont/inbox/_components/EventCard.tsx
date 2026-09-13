"use client";

import { useState } from "react";

import { Icons, type Icon } from "@/components/icons";
import { Button } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import type { Bani } from "@/lib/config";
import type { Order, OrderStatus, ThreadItem } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * One step of the sale, in the thread, where it happened.
 *
 * <p>A card rather than a bubble, and neither left nor right: a step belongs to the sale rather
 * than to either person, and putting it on one side would read as that person having done it to
 * the other.
 *
 * <p>A card is a record and nothing else. It says what happened and carries the paperwork that
 * moment produced, and it never carries the next action — {@link NextStep} does, once, at the end
 * of the thread. Keeping the two apart is what makes the thread read as a history with something
 * pending after it, rather than as a history whose last line keeps changing what it asks for.
 */
export function EventCard({
  item,
  viewerIsBuyer,
  buyerName,
  sellerName,
}: {
  item: ThreadItem;
  viewerIsBuyer: boolean;
  /** Who the two sides are, so a step can say whose it was. */
  buyerName?: string;
  sellerName?: string;
}) {
  const step = STEPS[item.eventType ?? ""];
  const Icon = Icons[step?.icon ?? "info"];
  const accent = ACCENTS[step?.accent ?? "ink"];

  const context: StepContext = {
    viewerIsBuyer,
    buyerName,
    sellerName,
    value: (key) => item.payload?.[key],
    money: (key) => {
      const raw = item.payload?.[key];
      return raw === undefined ? null : formatMoney(Number(raw) as Bani);
    },
  };
  const sentence = step?.line?.(context);

  // On the one card that issues it. The steps after it inherit the same parcel
  // and repeating the number there is noise, not information.
  const awb = step?.awb ? item.payload?.awb || null : null;
  const document = step?.document?.(context) ?? null;

  return (
    <div className="my-2 flex flex-col items-center gap-1 px-3 text-center">
      <Icon aria-hidden="true" className={cn("h-4 w-4 shrink-0", accent.icon)} />

      <p className="max-w-sm font-display text-[13px] leading-snug font-extrabold text-balance text-ink-600">
        {step?.title?.(context) ?? item.body}
      </p>

      {sentence ? (
        <p className="max-w-sm text-[12px] leading-snug text-balance text-ink-500">
          {sentence}
        </p>
      ) : null}

      {/* Paperwork and tracking, offered wherever they were produced and for as
          long as they are useful — not only while the step is the newest one. A
          seller who has not yet been to the courier still needs the label.
          TODO(backend): GET /orders/{id}/documents/{kind} for the proforma and
          the invoice; GET /orders/{id}/tracking for the courier's own page. */}
      {document || (step?.tracking && viewerIsBuyer) ? (
        <span className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
          {document ? (
            <button
              type="button"
              disabled
              title="Disponibil după integrarea serviciului de facturare"
              className={SECONDARY}
            >
              <Icons.download aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              {document}
            </button>
          ) : null}
          {step?.tracking && viewerIsBuyer ? (
            <button
              type="button"
              disabled
              title="Disponibil după integrarea curierului"
              className={SECONDARY}
            >
              <Icons.locker aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              Urmărește coletul
            </button>
          ) : null}
        </span>
      ) : null}

      {awb ? <Awb awb={awb} quiet={!viewerIsBuyer} /> : null}
    </div>
  );
}

/**
 * The tracking number, weighted by who is reading it.
 *
 * <p>For the buyer it is the thing they follow the parcel with, so it is a control. For the seller
 * it is printed on the label they are about to download and it is not what they came for, so it
 * stays available and stops competing with the label for attention.
 */
function Awb({ awb, quiet }: { awb: string; quiet: boolean }) {
  const [copied, setCopied] = useState(false);
  const CopyIcon = copied ? Icons.check : Icons.copy;

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(awb).then(() => setCopied(true));
      }}
      className={cn(
        "numeric mt-1",
        quiet
          ? "inline-flex items-center gap-1.5 rounded-lg text-[11px] font-semibold text-ink-500 transition hover:text-ink-700"
          : SECONDARY,
      )}
    >
      <CopyIcon
        aria-hidden="true"
        className={cn(
          "shrink-0",
          quiet ? "h-3 w-3" : "h-3.5 w-3.5",
          copied && "text-primary-700",
        )}
      />
      {copied ? "AWB copiat" : `AWB ${awb}`}
    </button>
  );
}

/**
 * What the sale is waiting for, once, at the end of the thread.
 *
 * <p>Read off the order rather than off the newest card. The order is the authority on what may be
 * done next and by whom — every button here is re-checked against it on the server — and deriving
 * the panel from the status means the record above stays exactly as it was written. A step that is
 * done drops into the history and the next one appears below it, instead of the same card at the
 * bottom quietly swapping its button for the next one.
 *
 * <p>It is also the only thing on the page with any weight to it, which is the point: the thread is
 * a record, and this is the one part of it that wants something.
 */
export function NextStep({
  order,
  viewerIsBuyer,
  buyerName,
  sellerName,
  causeName,
  busy,
  onAct,
}: {
  order: Order;
  viewerIsBuyer: boolean;
  buyerName?: string;
  sellerName?: string;
  /**
   * The cause, by name, off the acceptance card's payload.
   *
   * <p>Not from the order: {@code GET /orders/{id}} carries only a causeId, and the nested cause on
   * OrderDetail exists in the mock world alone. Reading it here would work in the preview and throw
   * against the real backend.
   */
  causeName?: string;
  busy: boolean;
  onAct: (action: OrderAction) => void;
}) {
  const step = PENDING[order.status];
  if (!step) return null;

  const Icon = Icons[step.icon];
  const accent = ACCENTS[step.accent ?? "sky"];
  const turn = step.actor === (viewerIsBuyer ? "BUYER" : "SELLER");

  const context: PendingContext = {
    viewerIsBuyer,
    buyerName,
    sellerName,
    causeName,
    order,
    money: (amount) => formatMoney(amount),
  };

  return (
    <div className="my-3 -mx-3 flex flex-col items-center gap-1 border-y border-line bg-canvas px-3 py-4 text-center">
      <span
        aria-hidden="true"
        className={cn(
          "mb-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full ring-1 ring-edge",
          accent.disc,
        )}
      >
        <Icon className="h-4 w-4" />
      </span>

      <p className="max-w-sm font-display text-[15px] leading-snug font-extrabold text-balance text-ink-900">
        {step.title(context)}
      </p>

      <p className="max-w-sm text-[13px] leading-snug text-balance text-ink-600">
        {step.line(context)}
      </p>

      {/* Only for the person whose turn it is. The other side has just been told
          what is happening, which is all there is for them to know. */}
      {turn && step.action ? (
        <>
          <Button
            size="sm"
            className="mt-2 w-full max-w-xs"
            disabled={busy}
            onClick={() => onAct(step.action!)}
          >
            {step.cta?.(context)}
          </Button>

          {/* The fork, and deliberately not a second button: two of equal weight
              would make holding the money look like the expected answer. */}
          {step.alternative ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onAct(step.alternative!.action)}
              className="mt-1.5 rounded-lg text-[13px] font-bold text-ink-600 underline decoration-2 underline-offset-4 transition hover:text-danger-700 disabled:opacity-50"
            >
              {step.alternative.cta}
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export type OrderAction =
  | "CHOOSE_DELIVERY"
  | "PAY"
  | "LABEL"
  | "CONFIRM_RECEIPT"
  | "REPORT_PROBLEM";

/**
 * What a record's sentence is built from.
 *
 * <p>The figures come from the payload the server froze rather than from the order, so a card
 * written three steps ago still says what was true then: the amount at the time, the method that
 * was chosen, the AWB that was issued.
 */
interface StepContext {
  viewerIsBuyer: boolean;
  buyerName?: string;
  sellerName?: string;
  value: (key: string) => string | undefined;
  money: (key: string) => string | null;
}

/**
 * What the pending panel's sentence is built from.
 *
 * <p>The live order, not a frozen payload: this panel is about what is true now, and the totals it
 * quotes have to be the ones the next step will actually charge.
 */
interface PendingContext {
  viewerIsBuyer: boolean;
  buyerName?: string;
  sellerName?: string;
  causeName?: string;
  order: Order;
  money: (amount: Bani) => string;
}

/**
 * One event, as a record.
 *
 * <p>Every sentence is written twice, because the same step is different news to each side: the one
 * who acted is told what they did, the other is told who did it to them. And each side is told only
 * what bears on them — a seller has no use for the buyer's delivery cost or for the total they were
 * charged, and quoting figures at somebody they have no claim on invites the wrong conclusion about
 * whose money it is.
 */
interface Step {
  /** Written per side too: what a seller received, the buyer sent. */
  title: (context: StepContext) => string;
  icon: keyof typeof Icons;
  /** Which of the four colours this step is recognised by. */
  accent?: keyof typeof ACCENTS;
  line?: (context: StepContext) => string | null;
  /**
   * A document this step produced, offered where it was produced.
   *
   * <p>A proforma at payment and an invoice at completion belong in the conversation that generated
   * them rather than three screens away in the account area.
   */
  document?: (context: StepContext) => string | null;
  /** Whether this step is the one that carries the tracking number. */
  awb?: boolean;
  /** Whether the buyer may follow the parcel from here. */
  tracking?: boolean;
}

/** What the sale is waiting for, in one status. */
interface Pending {
  title: (context: PendingContext) => string;
  icon: keyof typeof Icons;
  accent?: keyof typeof ACCENTS;
  /** Whose turn it is, or null when it is neither party's: the courier, or bid4. */
  actor: "BUYER" | "SELLER" | null;
  /**
   * What is happening, in the reader's own terms.
   *
   * <p>"Se așteaptă plata" is true for both of them and useful to neither: one of them is the
   * person being waited on. So the side with the button is told what to do and the other is told
   * what is happening and roughly when it ends.
   */
  line: (context: PendingContext) => string;
  action?: OrderAction;
  /** Built from the order, so a button can name the sum it is about to move. */
  cta?: (context: PendingContext) => string;
  /**
   * The quieter second choice, for a step that is genuinely a fork.
   *
   * <p>Only one step is: the parcel has arrived and the buyer either lets the money go or holds it.
   */
  alternative?: { cta: string; action: OrderAction };
}

/** The other party, when the thread has not said who they are. */
const seller = (c: { sellerName?: string }) => c.sellerName ?? "Vânzătorul";
const buyer = (c: { buyerName?: string }) => c.buyerName ?? "Cumpărătorul";
/** The cause by name, and only "cauză" when the thread genuinely does not carry one. */
const cause = (c: { causeName?: string }) => c.causeName || "cauză";

/**
 * How it travels, never where it lands.
 *
 * <p>The seller has no business knowing which locker a buyer collects from, and the card is kept by
 * both sides — so this names the method and the delivery address stays between the buyer and the
 * courier.
 */
const method = (c: StepContext) =>
  c.value("method") === "HOME_COURIER" ? "prin curier, la adresă" : "prin Easybox";

const methodOf = (order: Order) =>
  order.deliveryMethod?.type === "HOME_COURIER"
    ? "prin curier, la adresă"
    : "prin Easybox";

/**
 * A free-text reason, ended once.
 *
 * <p>The note is written by a person and may or may not have been finished with a full stop, so
 * quoting it inside a sentence of ours produced "descrierii.." about half the time.
 */
const quoted = (text: string) => text.replace(/\s*[.]+\s*$/, "");

/** Drops the clauses whose figures the payload does not carry. */
const sentence = (...parts: (string | null | undefined | false)[]) =>
  parts.filter(Boolean).join(" ") || null;

const STEPS: Record<string, Step> = {
  /* --- before there is a sale ---------------------------------------------
     These carry no order. An offer is a thing that happened, and what may be
     done about it belongs to the listing page rather than to a thread. */
  OFFER_PLACED: {
    // The same event, and not the same news: one of them sent it, the other had
    // it arrive. "Ofertă trimisă" on a seller's screen describes somebody else's
    // act as though it were theirs.
    title: (c) => (c.viewerIsBuyer ? "Ofertă trimisă" : "Ofertă primită"),
    icon: "auction",
    accent: "sky",
    line: (c) =>
      c.viewerIsBuyer
        ? `Ai trimis o ofertă de ${c.money("amount")}.`
        : `${buyer(c)} a trimis o ofertă de ${c.money("amount")}.`,
  },
  OFFER_RAISED: {
    title: () => "Ofertă majorată",
    icon: "auction",
    accent: "sky",
    line: (c) =>
      c.viewerIsBuyer
        ? `Ai majorat oferta de la ${c.money("previous")} la ${c.money("amount")}.`
        : `${buyer(c)} a majorat oferta de la ${c.money("previous")} la ${c.money("amount")}.`,
  },
  OFFER_WITHDRAWN: {
    title: (c) => (c.viewerIsBuyer ? "Ofertă retrasă" : "Ofertă retrasă de cumpărător"),
    icon: "close",
    accent: "ink",
    line: (c) =>
      c.viewerIsBuyer
        ? `Ți-ai retras oferta de ${c.money("amount")}.`
        : `${buyer(c)} și-a retras oferta de ${c.money("amount")}.`,
  },

  OFFER_ACCEPTED: {
    title: (c) => (c.viewerIsBuyer ? "Oferta ta a fost acceptată" : "Ofertă acceptată"),
    icon: "success",
    accent: "primary",
    line: (c) =>
      sentence(
        c.viewerIsBuyer
          ? `${seller(c)} a acceptat oferta ta de ${c.money("price")}.`
          : `Ai acceptat oferta de ${c.money("price")} a lui ${buyer(c)}.`,
        c.money("donation") &&
          c.value("cause") &&
          `Din această sumă, ${c.money("donation")} (${c.value("donationPercent")}%) revin cauzei ${c.value("cause")}.`,
      ),
  },
  DELIVERY_CHOSEN: {
    title: () => "Livrare aleasă",
    icon: "delivery",
    accent: "sky",
    // The cost is the buyer's and so is the total. A seller reading this needs
    // to know how the parcel travels, because that is what they will hand over;
    // what it cost the buyer to receive it is not theirs, and the total least of
    // all, since most of it never reaches them.
    line: (c) =>
      c.viewerIsBuyer
        ? sentence(
            `Ai ales livrarea ${method(c)}.`,
            c.money("shipping") && `Cost livrare: ${c.money("shipping")}.`,
          )
        : `${buyer(c)} a ales livrarea ${method(c)}.`,
  },
  PAYMENT_HELD: {
    title: () => "Plată confirmată",
    icon: "escrow",
    accent: "primary",
    // Not what the buyer paid, on the seller's screen. The total is the price
    // plus the buyer's own fee plus the delivery, so naming it to a seller
    // quotes them a number they have no claim on and then has to explain why
    // they are not getting it. What is theirs is settled on the release card.
    line: (c) =>
      c.viewerIsBuyer
        ? `Ai plătit ${c.money("total")}. Suma este administrată de bid4 și se eliberează după confirmarea primirii coletului.`
        : `${buyer(c)} a făcut plata. Suma este administrată de bid4 până la confirmarea primirii coletului.`,
    document: (c) => (c.viewerIsBuyer ? "Descarcă proforma" : null),
  },
  LABEL_READY: {
    title: (c) => (c.viewerIsBuyer ? "Eticheta este gata" : "Etichetă emisă"),
    icon: "invoice",
    accent: "sky",
    line: (c) =>
      c.viewerIsBuyer
        ? `${seller(c)} a emis eticheta de expediere prin ${c.value("courier")}.`
        : `Ai emis eticheta de expediere prin ${c.value("courier")}.`,
    // The buyer follows the parcel by this number, so for them it is a control.
    // The seller has it printed on the label and does not need to read it.
    awb: true,
    // Stays on the card rather than only on the newest step: a seller who has
    // not yet been to the courier needs the label, and the sale may by then have
    // moved on to a step that is not theirs.
    document: (c) => (c.viewerIsBuyer ? null : "Descarcă eticheta"),
  },
  SHIPPED: {
    title: () => "Colet preluat de curier",
    icon: "parcel",
    accent: "sky",
    line: (c) =>
      c.viewerIsBuyer
        ? `Curierul a preluat coletul de la ${seller(c)}.`
        : `Curierul a preluat coletul și îl duce către ${buyer(c)}.`,
    tracking: true,
  },
  DELIVERED: {
    title: () => "Colet livrat",
    icon: "locker",
    accent: "primary",
    // A record of the fact. What the buyer is asked to do about it is the
    // pending panel's business, and saying it twice made the card read as an
    // instruction that stayed on screen after it had been carried out.
    line: (c) =>
      c.viewerIsBuyer
        ? "Coletul ți-a fost livrat."
        : `Coletul a fost livrat către ${buyer(c)}.`,
  },
  RELEASED: {
    title: () => "Comandă finalizată",
    icon: "donation",
    accent: "primary",
    line: (c) =>
      c.viewerIsBuyer
        ? sentence(
            "Ai confirmat primirea coletului.",
            c.money("donation") &&
              `${c.money("donation")} au fost virați către ${c.value("cause") || "cauză"}, iar ${c.money("sellerShare")} vânzătorului.`,
          )
        : sentence(
            `${buyer(c)} a confirmat primirea coletului.`,
            c.money("sellerShare") &&
              `Ai încasat ${c.money("sellerShare")}, iar ${c.money("donation")} au fost virați către ${c.value("cause") || "cauză"}.`,
          ),
    document: () => "Descarcă factura",
  },
  DISPUTE_OPENED: {
    title: (c) => (c.viewerIsBuyer ? "Ai semnalat o problemă" : "Problemă semnalată"),
    icon: "dispute",
    accent: "danger",
    line: (c) =>
      sentence(
        c.viewerIsBuyer
          ? "Ai semnalat o problemă cu această comandă."
          : `${buyer(c)} a semnalat o problemă cu această comandă.`,
        c.value("reason") && `Motiv: ${quoted(c.value("reason")!)}.`,
      ),
  },
  DISPUTE_RESOLVED: {
    title: () => "Sesizare soluționată",
    icon: "success",
    accent: "ink",
    // Four sentences for two outcomes, because "soluționată" on its own tells
    // neither party the one thing they want to know, which is where the money
    // went.
    line: (c) =>
      sentence(
        c.value("outcome") === "REFUND"
          ? c.viewerIsBuyer
            ? `Sesizarea a fost soluționată în favoarea ta. Suma de ${c.money("total")} ți-a fost returnată.`
            : `Sesizarea a fost soluționată în favoarea cumpărătorului. Suma a fost returnată lui ${buyer(c)}.`
          : c.viewerIsBuyer
            ? "Sesizarea a fost soluționată în favoarea vânzătorului. Suma a fost eliberată."
            : `Sesizarea a fost soluționată în favoarea ta. Ai încasat ${c.money("sellerShare")}.`,
        c.value("note") && `Motivarea bid4: ${quoted(c.value("note")!)}.`,
      ),
  },
  CANCELLED: {
    title: () => "Comandă anulată",
    icon: "close",
    accent: "danger",
    // Who walked away is the question being asked, and the passive hid it from
    // both of them. The server records which side it was.
    line: (c) => {
      const by = c.value("by");
      const who =
        by === "SYSTEM"
          ? "Comanda a fost anulată automat."
          : by === "STAFF"
            ? "Comanda a fost anulată de echipa bid4."
            : by === "BUYER"
              ? c.viewerIsBuyer
                ? "Ai anulat comanda."
                : `${buyer(c)} a anulat comanda.`
              : c.viewerIsBuyer
                ? `${seller(c)} a anulat comanda.`
                : "Ai anulat comanda.";
      return sentence(
        who,
        c.value("reason") && `Motiv: ${quoted(c.value("reason")!)}.`,
      );
    },
  },
};

/**
 * What each status is waiting for, and from whom.
 *
 * <p>A status with no entry here is a sale that is waiting for nothing: finished, refunded or
 * cancelled. Those draw no panel at all, which is why the set needs no separate list of endings.
 */
const PENDING: Partial<Record<OrderStatus, Pending>> = {
  AWAITING_CONFIRMATION: {
    title: () => "Alegerea livrării",
    icon: "delivery",
    actor: "BUYER",
    line: (c) =>
      c.viewerIsBuyer
        ? "Alege unde vrei să primești coletul. Costul livrării se adaugă la plată după ce alegi."
        : `${buyer(c)} are de ales adresa de livrare. Comanda se anulează dacă nu o alege la timp.`,
    action: "CHOOSE_DELIVERY",
    cta: () => "Alege adresa de livrare",
  },
  AWAITING_PAYMENT: {
    title: () => "Plata comenzii",
    icon: "payment",
    actor: "BUYER",
    // The buyer is told the total because they are about to be charged it. The
    // seller is told the parcel is not to be sent yet, which is the only part
    // of this that is theirs.
    line: (c) =>
      c.viewerIsBuyer
        ? `Totalul de ${c.money(c.order.totalPaid)} include produsul, taxa platformei și livrarea ${methodOf(c.order)}. Banii sunt administrați de bid4 până confirmi că ai primit coletul.`
        : `${buyer(c)} are de făcut plata. Nu expedia coletul înainte ca plata să fie confirmată.`,
    action: "PAY",
    // Not "Plătește". A button that moves money says how much it is about to
    // move, so the number the reader agrees to is on the thing they press.
    cta: (c) => `Plătește ${c.money(c.order.totalPaid)}`,
  },
  PAYMENT_FAILED: {
    title: () => "Plata nu a reușit",
    icon: "warning",
    accent: "danger",
    actor: "BUYER",
    line: (c) =>
      c.viewerIsBuyer
        ? sentence(
            c.order.paymentFailureReason,
            "Încearcă din nou pentru a duce comanda mai departe.",
          )!
        : `Plata lui ${buyer(c)} nu a reușit. Nu expedia coletul până când nu este confirmată.`,
    action: "PAY",
    cta: (c) => `Reia plata de ${c.money(c.order.totalPaid)}`,
  },
  PAID_HELD: {
    title: () => "Expedierea coletului",
    icon: "parcel",
    actor: "SELLER",
    line: (c) =>
      c.viewerIsBuyer
        ? `${seller(c)} pregătește expedierea. Vei primi AWB-ul aici, de îndată ce eticheta este emisă.`
        : `Plata este confirmată și administrată de bid4. Emite eticheta și trimite coletul ${methodOf(c.order)}.`,
    action: "LABEL",
    cta: () => "Emite eticheta de expediere",
  },
  LABEL_GENERATED: {
    title: () => "Predarea la curier",
    icon: "delivery",
    actor: null,
    line: (c) =>
      c.viewerIsBuyer
        ? `${seller(c)} are de predat coletul curierului. Îl poți urmări de îndată ce este preluat.`
        : "Predă coletul curierului folosind eticheta de mai sus. Preluarea este confirmată de curier.",
  },
  DROPPED_OFF: {
    title: () => "Colet preluat",
    icon: "parcel",
    actor: null,
    line: (c) =>
      c.viewerIsBuyer
        ? "Coletul a fost preluat de curier și este în drum spre tine."
        : `Coletul a fost preluat de curier și este în drum spre ${buyer(c)}.`,
  },
  IN_TRANSIT: {
    title: () => "Colet în tranzit",
    icon: "delivery",
    actor: null,
    line: (c) =>
      c.viewerIsBuyer
        ? "Coletul este în drum spre tine."
        : `Coletul este în drum spre ${buyer(c)}.`,
  },
  ARRIVED_AT_LOCKER: {
    title: () => "Colet ajuns",
    icon: "locker",
    actor: null,
    line: (c) =>
      c.viewerIsBuyer
        ? "Coletul te așteaptă la ridicare."
        : `Coletul îl așteaptă pe ${buyer(c)} la ridicare.`,
  },
  DELIVERED: {
    title: () => "Confirmarea primirii",
    icon: "success",
    actor: "BUYER",
    line: (c) =>
      c.viewerIsBuyer
        ? `Verifică coletul și confirmă dacă este conform. Abia după confirmare ${c.money(c.order.donationAmount)} ajung la ${cause(c)}, iar restul la vânzător.`
        : `${buyer(c)} are de confirmat primirea coletului. Suma se eliberează după confirmare, sau de la sine dacă nu răspunde.`,
    action: "CONFIRM_RECEIPT",
    cta: () => "Confirm primirea coletului",
    alternative: { cta: "Semnalează o problemă", action: "REPORT_PROBLEM" },
  },
  DISPUTE_OPEN: {
    title: () => "Sesizare în analiză",
    icon: "dispute",
    accent: "danger",
    actor: null,
    line: (c) =>
      c.viewerIsBuyer
        ? "Suma achitată rămâne blocată până la soluționare. Un reprezentant bid4 analizează sesizarea și vei primi decizia pe email și în această comandă."
        : "Suma rămâne blocată până la soluționare. Un reprezentant bid4 analizează sesizarea și veți primi amândoi decizia pe email și în această comandă.",
  },
};

/**
 * The colour a step is recognised by.
 *
 * <p>Four of them, each meaning one thing: green where the sale moved forward, blue where it is
 * somebody's turn or something is in motion, red where it stopped, grey where it simply ended.
 * Written out rather than composed, because Tailwind only ships the class names it can see.
 */
const ACCENTS = {
  primary: { icon: "text-primary-700", disc: "bg-primary-50 text-primary-700" },
  sky: { icon: "text-sky-700", disc: "bg-sky-50 text-sky-700" },
  danger: { icon: "text-danger-600", disc: "bg-danger-50 text-danger-700" },
  ink: { icon: "text-ink-400", disc: "bg-ink-50 text-ink-600" },
} as const;

/** The quiet controls a card can carry: a document, a tracking link, the AWB. */
const SECONDARY =
  "inline-flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 text-[13px] font-bold " +
  "text-ink-700 ring-1 ring-edge transition hover:ring-ink-300 disabled:text-ink-500 disabled:opacity-70";

/** The mark a step wears, for the thread and for the row in the list beside it. */
export function stepMark(
  eventType: string | undefined,
): { Icon: Icon; accent: (typeof ACCENTS)[keyof typeof ACCENTS] } | null {
  const step = eventType ? STEPS[eventType] : undefined;
  if (!step) return null;
  return { Icon: Icons[step.icon], accent: ACCENTS[step.accent ?? "ink"] };
}

/**
 * What a step is called, for anywhere that is not the card itself.
 *
 * <p>The inbox list shows it as the last thing that happened, so a row about a sale says which step
 * it reached rather than that something, somewhere, changed. Written from the reader's side there
 * too: the row in a seller's inbox says an offer arrived, not that one was sent.
 */
export function stepTitle(
  eventType: string | undefined,
  viewerIsBuyer: boolean,
): string | null {
  const step = eventType ? STEPS[eventType] : undefined;
  if (!step) return null;
  return step.title({
    viewerIsBuyer,
    value: () => undefined,
    money: () => null,
  });
}
