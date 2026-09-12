"use client";

import { Icons } from "@/components/icons";
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

  const sentence = step?.line?.({
    viewerIsBuyer,
    buyerName,
    sellerName,
    value: (key) => item.payload?.[key],
    money: (key) => {
      const raw = item.payload?.[key];
      return raw === undefined ? null : formatMoney(Number(raw) as Bani);
    },
  });

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
            turn ? "bg-primary-100 text-primary-800" : "bg-white text-ink-600",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      ) : (
        <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-400" />
      )}

      <p
        className={cn(
          "font-display leading-snug font-extrabold text-balance",
          live ? "text-[15px] text-ink-900" : "text-[13px] text-ink-600",
        )}
      >
        {step?.title ?? item.body}
      </p>

      {sentence ? (
        <p
          className={cn(
            "leading-snug text-balance",
            live ? "max-w-sm text-[13px] text-ink-600" : "text-[12px] text-ink-500",
          )}
        >
          {sentence}
        </p>
      ) : null}

      {/* Only for the person whose turn it is. The other side sees what they
          are waiting for rather than a button that would refuse them. */}
      {turn && step?.action ? (
        <Button
          size="sm"
          className="mt-2 w-full max-w-xs"
          disabled={busy}
          onClick={() => onAct(step.action!)}
        >
          {step.cta}
        </Button>
      ) : null}

      {live && !turn && step?.waiting ? (
        <p className="mt-1 text-[13px] font-semibold text-ink-500">
          {step.waiting}
        </p>
      ) : null}
    </div>
  );
}

export type OrderAction =
  | "CHOOSE_DELIVERY"
  | "PAY"
  | "LABEL"
  | "DISPATCH"
  | "CONFIRM_RECEIPT";

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
  /** Shown to the other side, so waiting is a state rather than a blank. */
  waiting?: string;
}

/** The other party, when the thread has not said who they are. */
const seller = (c: StepContext) => c.sellerName ?? "Vânzătorul";
const buyer = (c: StepContext) => c.buyerName ?? "Cumpărătorul";

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
  OFFER_ACCEPTED: {
    title: "Ofertă acceptată",
    icon: "success",
    line: (c) =>
      sentence(
        c.viewerIsBuyer
          ? `${seller(c)} a acceptat oferta ta de ${c.money("price")}.`
          : `Ai acceptat oferta de ${c.money("price")} a lui ${buyer(c)}.`,
        c.money("donation") &&
          `Din această sumă, ${c.money("donation")} (${c.value("donationPercent")}%) merg către cauză.`,
      ),
    actor: "BUYER",
    action: "CHOOSE_DELIVERY",
    needs: "AWAITING_CONFIRMATION",
    cta: "Alege livrarea",
    waiting: "Se așteaptă alegerea modalității de livrare.",
  },
  DELIVERY_CHOSEN: {
    title: "Adresă de livrare aleasă",
    icon: "delivery",
    line: (c) =>
      sentence(
        c.viewerIsBuyer
          ? `Ai ales livrarea prin ${c.value("delivery")}.`
          : `${buyer(c)} a ales livrarea prin ${c.value("delivery")}.`,
        c.viewerIsBuyer &&
          c.money("total") &&
          `Total de plată: ${c.money("total")}.`,
      ),
    actor: "BUYER",
    action: "PAY",
    needs: "AWAITING_PAYMENT",
    cta: "Plătește",
    waiting: "Se așteaptă plata.",
  },
  PAYMENT_HELD: {
    title: "Plată confirmată",
    icon: "escrow",
    line: (c) =>
      c.viewerIsBuyer
        ? `Ai plătit ${c.money("total")}. Suma rămâne în contul de garanție până confirmi primirea coletului.`
        : `${buyer(c)} a plătit ${c.money("total")}. Suma este păstrată în contul de garanție până la confirmarea primirii.`,
    actor: "SELLER",
    action: "LABEL",
    needs: "PAID_HELD",
    cta: "Emite AWB",
    waiting: "Se așteaptă expedierea coletului.",
  },
  LABEL_READY: {
    title: "AWB emis",
    icon: "invoice",
    line: (c) =>
      c.viewerIsBuyer
        ? `${seller(c)} a emis AWB-ul ${c.value("awb")} prin ${c.value("courier")}.`
        : `Ai emis AWB-ul ${c.value("awb")} prin ${c.value("courier")}.`,
    actor: "SELLER",
    action: "DISPATCH",
    needs: "LABEL_GENERATED",
    cta: "Am predat coletul",
    waiting: "Se așteaptă predarea coletului către curier.",
  },
  SHIPPED: {
    title: "Colet predat curierului",
    icon: "parcel",
    line: (c) =>
      sentence(
        c.viewerIsBuyer
          ? `${seller(c)} a predat coletul curierului.`
          : "Ai predat coletul curierului.",
        c.value("awb") && `AWB ${c.value("awb")}.`,
      ),
    waiting: "Coletul este în curs de livrare.",
  },
  DELIVERED: {
    title: "Colet livrat",
    icon: "locker",
    line: (c) =>
      c.viewerIsBuyer
        ? "Coletul a ajuns la destinație. Confirmă primirea pentru a elibera plata."
        : `Coletul a ajuns la ${buyer(c)}.`,
    actor: "BUYER",
    action: "CONFIRM_RECEIPT",
    needs: "DELIVERED",
    cta: "Confirm primirea",
    waiting: "Se așteaptă confirmarea primirii.",
  },
  RELEASED: {
    title: "Comandă finalizată",
    icon: "donation",
    line: (c) =>
      c.viewerIsBuyer
        ? sentence(
            "Ai confirmat primirea coletului.",
            c.money("donation") &&
              `${c.money("donation")} au ajuns la cauză, iar ${c.money("sellerShare")} la vânzător.`,
          )
        : sentence(
            `${buyer(c)} a confirmat primirea coletului.`,
            c.money("sellerShare") &&
              `Ai încasat ${c.money("sellerShare")}, iar ${c.money("donation")} au ajuns la cauză.`,
          ),
  },
  DISPUTE_OPENED: {
    title: "Sesizare deschisă",
    icon: "dispute",
    line: () => "Comanda este în analiză la echipa bid4.",
    waiting: "Sesizarea este în analiză la echipa bid4.",
  },
  CANCELLED: {
    title: "Comandă anulată",
    icon: "close",
    line: () => "Comanda a fost anulată și nu mai poate fi reluată.",
  },
};

/**
 * What a step is called, for anywhere that is not the card itself.
 *
 * <p>The inbox list shows it as the last thing that happened, so a row about a sale says which step
 * it reached rather than that something, somewhere, changed.
 */
export function stepTitle(eventType: string | undefined): string | null {
  return eventType ? (STEPS[eventType]?.title ?? null) : null;
}
