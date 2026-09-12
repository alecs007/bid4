"use client";

import { useState } from "react";

import { Icons, type Icon } from "@/components/icons";
import { Button } from "@/components/ui";
import type { Bani } from "@/lib/config";
import { formatMoney } from "@/lib/money";
import type { Order, OrderStatus, ThreadItem } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * One step of the sale, in the thread, where it happened.
 *
 * <p>A card rather than a bubble, and neither left nor right: a step belongs to the sale rather
 * than to either person, and putting it on one side would read as that person having done it to
 * the other.
 *
 * <p>Which card carries a button is not a property of the card. The item records the status the
 * order was in when it was written; the live step is the one whose status still matches the order's
 * — everything above it is history and draws without controls. So a forged or replayed item can
 * show the wrong words and cannot produce a working control, and pressing one calls the order
 * endpoint, which decides for itself.
 */
export function EventCard({
  item,
  order,
  newest,
  viewerIsBuyer,
  buyerName,
  sellerName,
  busy,
  onAct,
}: {
  item: ThreadItem;
  /** Null until the sale is loaded, or when the thread has no sale behind it. */
  order: Order | null;
  /** Whether this is the last step written. */
  newest: boolean;
  viewerIsBuyer: boolean;
  /** Who the two sides are, so a step can say whose it was. */
  buyerName?: string;
  sellerName?: string;
  busy: boolean;
  onAct: (action: OrderAction) => void;
}) {
  const step = STEPS[item.eventType ?? ""];
  const Icon = Icons[step?.icon ?? "info"];
  const accent = ACCENTS[step?.accent ?? "ink"];

  // Where the sale has got to: the last step written, while there is still a
  // sale to get anywhere. Not strict equality against the item's frozen status,
  // because the stretch the courier owns moves the order through three of them
  // without writing a card — and a thread that goes blank while a parcel is in
  // transit is a thread that stops answering the only question being asked.
  const live = Boolean(order) && newest && !FINISHED.has(order!.status);

  // The button, though, is gated on the order actually being at the step this
  // action expects. Being the newest card is not permission to do anything.
  const turn =
    live &&
    step?.actor === (viewerIsBuyer ? "BUYER" : "SELLER") &&
    step?.needs === order!.status;

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
  const [copied, setCopied] = useState(false);

  /**
   * Past and live are the same three things stacked the same way — a mark, a name, a sentence — so a
   * step is recognisable as a step wherever it appears in the thread. Only the weight changes.
   *
   * <p>The live one is a full-width band on the page's own canvas, and whose turn it is shows in the
   * mark and the button rather than in the ground: a green wash behind a green button was two things
   * saying the same thing, and it turned the one step that matters into a coloured panel rather than
   * a moment in a conversation.
   */
  return (
    <div
      className={cn(
        "my-2 flex flex-col items-center gap-1 px-3 text-center",
        live && "my-3 -mx-3 border-y border-line bg-canvas px-3 py-4",
      )}
    >
      {live ? (
        <span
          aria-hidden="true"
          className={cn(
            "mb-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full ring-1 ring-edge",
            accent.disc,
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      ) : (
        <Icon aria-hidden="true" className={cn("h-4 w-4 shrink-0", accent.icon)} />
      )}

      <p
        className={cn(
          "max-w-sm font-display leading-snug font-extrabold text-balance",
          live ? "text-[15px] text-ink-900" : "text-[13px] text-ink-600",
        )}
      >
        {step?.title ?? item.body}
      </p>

      {sentence ? (
        <p
          className={cn(
            "leading-snug text-balance",
            "max-w-sm",
            live ? "text-[13px] text-ink-600" : "text-[12px] text-ink-500",
          )}
        >
          {sentence}
        </p>
      ) : null}

      {/* The AWB is a number to be used, not read. A button that copies it beats
          a line that has to be selected off a phone screen without losing a
          digit — so it is never in the sentence above. */}
      {awb ? (
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(awb).then(() => setCopied(true));
          }}
          className={cn("numeric mt-1", SECONDARY)}
        >
          {copied ? (
            <Icons.check aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-primary-700" />
          ) : (
            <Icons.copy aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          )}
          {copied ? "AWB copiat" : `AWB ${awb}`}
        </button>
      ) : null}

      {/* The paperwork this step produced, offered where it was produced.
          TODO(backend): GET /orders/{id}/documents/{kind} — the proforma and the
          invoice are generated by the billing service and streamed from there;
          this is the link that will carry them. */}
      {/* Paperwork and tracking, offered wherever they were produced and for as
          long as they are useful — not only while the step is the live one. A
          seller who has not yet been to the courier still needs the label.
          TODO(backend): GET /orders/{id}/documents/{kind} for the proforma and
          the invoice; GET /orders/{id}/tracking for the courier's own page. */}
      {(step?.document?.(context) || (step?.tracking && viewerIsBuyer)) ? (
        <span className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
          {step.document?.(context) ? (
            <button
              type="button"
              disabled
              title="Disponibil după integrarea serviciului de facturare"
              className={SECONDARY}
            >
              <Icons.download aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              {step.document(context)}
            </button>
          ) : null}
          {step.tracking && viewerIsBuyer ? (
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

      {/* Only for the person whose turn it is. The other side sees what they
          are waiting for rather than a button that would refuse them. */}
      {turn && step?.action ? (
        <>
          <Button
            size="sm"
            className="mt-2 w-full max-w-xs"
            disabled={busy}
            onClick={() => onAct(step.action!)}
          >
            {step.cta}
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

      {/* And for the side that cannot act: what is happening, in their terms.
          Given the weight the button has on the other screen, so waiting reads
          as a state of the sale rather than as an absence of one. */}
      {live && !turn && step?.waiting ? (
        <p
          className={cn(
            "mt-1.5 max-w-sm rounded-xl px-3 py-2 text-[13px] leading-snug font-semibold",
            step.tone === "alert"
              ? "bg-danger-50 text-danger-700"
              : "bg-white text-ink-600 ring-1 ring-edge",
          )}
        >
          {step.waiting(context)}
        </p>
      ) : null}
    </div>
  );
}

export type OrderAction =
  | "CHOOSE_DELIVERY"
  | "PAY"
  | "LABEL"
  | "CONFIRM_RECEIPT"
  | "REPORT_PROBLEM"
  | "COPY_AWB";

/**
 * What a step's sentence is built from.
 *
 * <p>The figures come from the payload the server froze rather than from the order, so a card
 * written three steps ago still says what was true then: the amount at the time, the locker that
 * was chosen, the AWB that was issued.
 */
interface StepContext {
  viewerIsBuyer: boolean;
  buyerName?: string;
  sellerName?: string;
  value: (key: string) => string | undefined;
  money: (key: string) => string | null;
}

interface Step {
  title: string;
  icon: keyof typeof Icons;
  /** "alert" for the steps that are not the sale going well. */
  tone?: "alert";
  /** Which of the four colours this step is recognised by. */
  accent?: keyof typeof ACCENTS;
  /**
   * The line under the title, written from the reader's side.
   *
   * <p>A sentence rather than a name on one line and figures on another. "de Vlad Georgescu" above
   * "Preț: 290,00 lei" is two fragments the reader has to assemble; "Vlad Georgescu a acceptat
   * oferta ta de 290,00 lei" is the same facts already assembled.
   *
   * <p>And written twice, because the same step is different news to each side: the one who acted
   * is told what they did, the other is told who did it to them.
   */
  line?: (context: StepContext) => string | null;
  /** Whose turn it is while this step is the live one. */
  actor?: "BUYER" | "SELLER";
  action?: OrderAction;
  /** The status the order must be in for the action to be offered at all. */
  needs?: OrderStatus;
  cta?: string;
  /**
   * The quieter second choice, for a step that is genuinely a fork.
   *
   * <p>Only one step is: the parcel has arrived and the buyer either lets the money go or holds it.
   * Offering both as equals would make refusing look like the expected answer, so this is a link
   * under the button rather than a button beside it.
   */
  alternative?: { cta: string; action: OrderAction };
  /**
   * What the step tells the side that cannot act, in their own terms.
   *
   * <p>"Se așteaptă plata" is true for both of them and useful to neither: one of them is the
   * person being waited on. So the side with the button is told what to do and the other is told
   * what is happening and roughly when it ends.
   */
  waiting?: (context: StepContext) => string;
  /**
   * A document this step produces, offered where it is produced.
   *
   * <p>A proforma at payment and an invoice at completion belong in the conversation that generated
   * them rather than three screens away in the account area.
   */
  document?: (context: StepContext) => string | null;
  /** Whether this step is one that carries the tracking number. */
  awb?: boolean;
  /** Whether the buyer may follow the parcel from here. */
  tracking?: boolean;
}

/** The other party, when the thread has not said who they are. */
const seller = (c: StepContext) => c.sellerName ?? "Vânzătorul";
const buyer = (c: StepContext) => c.buyerName ?? "Cumpărătorul";

/**
 * How it travels, never where it lands.
 *
 * <p>The seller has no business knowing which locker a buyer collects from, and the card is kept by
 * both sides — so this names the method and the delivery address stays between the buyer and the
 * courier.
 */
const method = (c: StepContext) =>
  c.value("method") === "HOME_COURIER" ? "prin curier, la adresă" : "prin easybox";

/** Drops the clauses whose figures the payload does not carry. */
const sentence = (...parts: (string | null | undefined | false)[]) =>
  parts.filter(Boolean).join(" ") || null;

/**
 * The Romanian, and whose turn each step is.
 *
 * <p>An event type with no entry still draws — its body is what the server wrote — so a step added
 * on the server before its copy lands here degrades to a line of text rather than to a gap.
 */
/** A sale that has stopped. Nothing after one of these is waiting on anybody. */
const FINISHED = new Set<OrderStatus>(["COMPLETED", "REFUNDED", "CANCELLED"]);

const STEPS: Record<string, Step> = {
  /* --- before there is a sale ---------------------------------------------
     These carry no order, so nothing about them is ever live: an offer is a
     thing that happened, and what may be done about it belongs to the listing
     page rather than to a card in a thread. */
  OFFER_PLACED: {
    title: "Ofertă trimisă",
    icon: "auction",
    accent: "sky",
    line: (c) =>
      c.viewerIsBuyer
        ? `Ai trimis o ofertă de ${c.money("amount")}.`
        : `${buyer(c)} a trimis o ofertă de ${c.money("amount")}.`,
  },
  OFFER_RAISED: {
    title: "Ofertă majorată",
    icon: "auction",
    accent: "sky",
    line: (c) =>
      c.viewerIsBuyer
        ? `Ai majorat oferta de la ${c.money("previous")} la ${c.money("amount")}.`
        : `${buyer(c)} a majorat oferta de la ${c.money("previous")} la ${c.money("amount")}.`,
  },
  OFFER_WITHDRAWN: {
    title: "Ofertă retrasă",
    icon: "close",
    accent: "ink",
    line: (c) =>
      c.viewerIsBuyer
        ? `Ți-ai retras oferta de ${c.money("amount")}.`
        : `${buyer(c)} și-a retras oferta de ${c.money("amount")}.`,
  },

  OFFER_ACCEPTED: {
    title: "Ofertă acceptată",
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
    actor: "BUYER",
    action: "CHOOSE_DELIVERY",
    needs: "AWAITING_CONFIRMATION",
    cta: "Alege adresa de livrare",
    waiting: (c) =>
      `Comanda este în așteptarea adresei de livrare alese de ${buyer(c)}.`,
  },
  DELIVERY_CHOSEN: {
    title: "Adresă de livrare aleasă",
    icon: "delivery",
    accent: "sky",
    line: (c) =>
      sentence(
        c.viewerIsBuyer
          ? `Ai ales livrarea ${method(c)}.`
          : `${buyer(c)} a ales livrarea ${method(c)}.`,
        c.money("shipping") && `Cost livrare: ${c.money("shipping")}.`,
        c.viewerIsBuyer && c.money("total") && `Total de plată: ${c.money("total")}.`,
      ),
    actor: "BUYER",
    action: "PAY",
    needs: "AWAITING_PAYMENT",
    cta: "Plătește",
    waiting: () => "Comanda este în așteptarea plății.",
  },
  PAYMENT_HELD: {
    title: "Plată confirmată",
    icon: "escrow",
    accent: "primary",
    line: (c) =>
      c.viewerIsBuyer
        ? `Ai plătit ${c.money("total")}. Suma este administrată de bid4 și se eliberează după confirmarea primirii coletului.`
        : `${buyer(c)} a plătit ${c.money("total")}. Suma este administrată de bid4 și îți revine după confirmarea primirii coletului.`,
    document: (c) => (c.viewerIsBuyer ? "Descarcă proforma" : null),
    actor: "SELLER",
    action: "LABEL",
    needs: "PAID_HELD",
    cta: "Emite AWB",
    waiting: () => "Comanda este în așteptarea expedierii.",
  },
  LABEL_READY: {
    title: "AWB emis",
    icon: "invoice",
    accent: "sky",
    line: (c) =>
      c.viewerIsBuyer
        ? `${seller(c)} a emis eticheta de expediere prin ${c.value("courier")}.`
        : `Ai emis eticheta de expediere prin ${c.value("courier")}.`,
    awb: true,
    // Stays on the card rather than only on the live step: a seller who has not
    // yet been to the courier needs the label, and the sale may by then have
    // moved on to a step that is not theirs.
    document: (c) => (c.viewerIsBuyer ? null : "Descarcă eticheta"),
    // No button. Predarea către curier este confirmată de curier, prin prima
    // scanare a coletului, nu de vânzător — nimeni nu declară singur că a
    // expediat ceva.
    waiting: (c) =>
      c.viewerIsBuyer
        ? "Comanda este în așteptarea preluării de către curier."
        : "Comanda este în așteptarea preluării de către curier. Predă coletul folosind AWB-ul de mai sus.",
  },
  SHIPPED: {
    title: "Colet preluat de curier",
    icon: "parcel",
    accent: "sky",
    line: (c) =>
      c.viewerIsBuyer
        ? `Curierul a preluat coletul de la ${seller(c)}.`
        : "Curierul a preluat coletul.",
    tracking: true,
    waiting: () => "Coletul se află în curs de livrare.",
  },
  DELIVERED: {
    title: "Colet livrat",
    icon: "locker",
    accent: "primary",
    line: (c) =>
      c.viewerIsBuyer
        ? "Coletul a fost livrat. Verifică-l și confirmă dacă este conform."
        : `Coletul a fost livrat către ${buyer(c)}.`,
    actor: "BUYER",
    action: "CONFIRM_RECEIPT",
    needs: "DELIVERED",
    cta: "Confirm primirea",
    alternative: { cta: "Semnalează o problemă", action: "REPORT_PROBLEM" },
    waiting: () => "Comanda este în așteptarea confirmării primirii.",
  },
  RELEASED: {
    title: "Comandă finalizată",
    icon: "donation",
    accent: "primary",
    line: (c) =>
      c.viewerIsBuyer
        ? sentence(
            "Ai confirmat primirea coletului.",
            c.money("donation") &&
              `${c.money("donation")} au fost virați cauzei, iar ${c.money("sellerShare")} vânzătorului.`,
          )
        : sentence(
            `${buyer(c)} a confirmat primirea coletului.`,
            c.money("sellerShare") &&
              `Ai încasat ${c.money("sellerShare")}, iar ${c.money("donation")} au fost virați cauzei.`,
          ),
    document: () => "Descarcă factura",
  },
  DISPUTE_OPENED: {
    title: "Problemă semnalată",
    icon: "dispute",
    accent: "danger",
    tone: "alert",
    line: (c) =>
      sentence(
        c.viewerIsBuyer
          ? "Ai semnalat o problemă cu această comandă."
          : `${buyer(c)} a semnalat o problemă cu această comandă.`,
        c.value("reason") && `Motiv: ${c.value("reason")}.`,
      ),
    waiting: (c) =>
      c.viewerIsBuyer
        ? "Suma achitată rămâne blocată până la soluționare. Un reprezentant bid4 analizează sesizarea și vei primi decizia pe email și în această comandă."
        : "Suma rămâne blocată până la soluționare. Un reprezentant bid4 analizează sesizarea și veți primi amândoi decizia pe email și în această comandă.",
  },
  CANCELLED: {
    title: "Comandă anulată",
    icon: "close",
    accent: "danger",
    tone: "alert",
    line: () => "Comanda a fost anulată.",
  },
};

/**
 * The colour a step is recognised by.
 *
 * <p>Four of them, each meaning one thing: green where the sale moved forward, blue where it is
 * somebody's turn or something is in motion, red where it stopped, grey where it simply ended.
 * Written out rather than composed, because Tailwind only ships the class names it can see.
 */
/** The quiet controls a card can carry: a document, a tracking link, the AWB. */
const SECONDARY =
  "inline-flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 text-[13px] font-bold " +
  "text-ink-700 ring-1 ring-edge transition hover:ring-ink-300 disabled:text-ink-500 disabled:opacity-70";

const ACCENTS = {
  primary: { icon: "text-primary-700", disc: "bg-primary-50 text-primary-700" },
  sky: { icon: "text-sky-700", disc: "bg-sky-50 text-sky-700" },
  danger: { icon: "text-danger-600", disc: "bg-danger-50 text-danger-700" },
  ink: { icon: "text-ink-400", disc: "bg-ink-50 text-ink-600" },
} as const;

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
 * it reached rather than that something, somewhere, changed.
 */
export function stepTitle(eventType: string | undefined): string | null {
  return eventType ? (STEPS[eventType]?.title ?? null) : null;
}
