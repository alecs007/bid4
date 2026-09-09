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
  busy,
  onAct,
}: {
  item: ThreadItem;
  /** Null until the sale is loaded, or when the thread has no sale behind it. */
  order: Order | null;
  /** Whether this is the last step written. */
  newest: boolean;
  viewerIsBuyer: boolean;
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

  const detailLine = detail(item);

  /**
   * Past and live are the same three things stacked the same way — a mark, a name, a detail — so a
   * step is recognisable as a step wherever it appears in the thread. Only the weight changes.
   *
   * <p>Stacked rather than strung along one line, because at 375px "Livrarea a fost aleasă · Easybox
   * Auchan Titan · total 1.067,49 lei" is three fragments wrapping into each other, and none of
   * them reads.
   */
  return (
    <div
      className={cn(
        "my-2 flex flex-col items-center gap-1 px-3 text-center",
        live && "my-3 -mx-3 border-y px-3 py-4",
        live && (turn ? "border-primary-200 bg-primary-50" : "border-line bg-canvas"),
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "shrink-0",
          live ? "h-5 w-5" : "h-4 w-4",
          turn ? "text-primary-700" : live ? "text-ink-600" : "text-ink-400",
        )}
      />

      <p
        className={cn(
          "font-display leading-snug font-extrabold text-balance",
          live ? "text-base" : "text-[13px]",
          turn ? "text-primary-900" : live ? "text-ink-800" : "text-ink-600",
        )}
      >
        {step?.title ?? item.body}
      </p>

      {detailLine ? (
        <p
          className={cn(
            "leading-snug text-balance",
            live ? "text-[13px] text-ink-600" : "text-[12px] text-ink-500",
          )}
        >
          {detailLine}
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
        <p className="text-[13px] font-semibold text-ink-500">{step.waiting}</p>
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

interface Step {
  title: string;
  icon: keyof typeof Icons;
  /** Whose turn it is while this step is the live one. */
  actor?: "BUYER" | "SELLER";
  action?: OrderAction;
  /** The status the order must be in for the action to be offered at all. */
  needs?: OrderStatus;
  cta?: string;
  /** Shown to the other side, so waiting is a state rather than a blank. */
  waiting?: string;
}

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
    title: "Oferta a fost acceptată",
    icon: "success",
    actor: "BUYER",
    action: "CHOOSE_DELIVERY",
    needs: "AWAITING_CONFIRMATION",
    cta: "Alege livrarea",
    waiting: "Aștepți cumpărătorul să aleagă livrarea.",
  },
  DELIVERY_CHOSEN: {
    title: "Livrarea a fost aleasă",
    icon: "delivery",
    actor: "BUYER",
    action: "PAY",
    needs: "AWAITING_PAYMENT",
    cta: "Plătește",
    waiting: "Aștepți plata.",
  },
  PAYMENT_HELD: {
    title: "Banii sunt în siguranță la bid4",
    icon: "escrow",
    actor: "SELLER",
    action: "LABEL",
    needs: "PAID_HELD",
    cta: "Generează AWB",
    waiting: "Vânzătorul pregătește coletul.",
  },
  LABEL_READY: {
    title: "Eticheta este gata",
    icon: "invoice",
    actor: "SELLER",
    action: "DISPATCH",
    needs: "LABEL_GENERATED",
    cta: "Am predat coletul",
    waiting: "Vânzătorul duce coletul la curier.",
  },
  SHIPPED: {
    title: "Coletul a plecat",
    icon: "parcel",
    waiting: "Îl urmărim și îți spunem când ajunge.",
  },
  DELIVERED: {
    title: "Coletul a ajuns",
    icon: "locker",
    actor: "BUYER",
    action: "CONFIRM_RECEIPT",
    needs: "DELIVERED",
    cta: "Am primit coletul",
    waiting: "Aștepți cumpărătorul să confirme.",
  },
  RELEASED: {
    title: "Comanda s-a încheiat",
    icon: "donation",
  },
  DISPUTE_OPENED: {
    title: "S-a deschis o sesizare",
    icon: "dispute",
    waiting: "Echipa bid4 se uită peste ea.",
  },
  CANCELLED: { title: "Comanda a fost anulată", icon: "close" },
};

/**
 * The second line, built from the snapshot the server froze.
 *
 * <p>From the payload rather than from the order, so a card written three steps ago still says what
 * was true then — the amount at the time, the locker that was chosen, the AWB that was issued.
 */
function detail(item: ThreadItem): string | null {
  const value = (key: string) => item.payload?.[key];
  const money = (key: string) => {
    const raw = value(key);
    return raw === undefined ? null : formatMoney(Number(raw) as Bani);
  };

  switch (item.eventType) {
    case "OFFER_ACCEPTED": {
      const price = money("price");
      const donation = money("donation");
      return price && donation
        ? `${price} · ${donation} către cauză (${value("donationPercent")}%)`
        : price;
    }
    case "DELIVERY_CHOSEN": {
      const total = money("total");
      return [value("delivery"), total && `total ${total}`]
        .filter(Boolean)
        .join(" · ");
    }
    case "PAYMENT_HELD":
      return money("total");
    case "LABEL_READY":
      return [value("courier"), value("awb")].filter(Boolean).join(" · ");
    case "SHIPPED":
      return value("awb") || null;
    case "RELEASED": {
      const donation = money("donation");
      const seller = money("sellerShare");
      return donation && seller
        ? `${donation} către cauză · ${seller} către vânzător`
        : null;
    }
    default:
      return null;
  }
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
