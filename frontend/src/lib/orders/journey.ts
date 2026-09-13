import type { ISODateString, Order, OrderStatus } from "@/lib/types";

/**
 * Where a stage stands.
 *
 * <p>Four states rather than two, because a sale that stopped is not the same as one that has not
 * got there yet.
 */
export type StageState = "done" | "active" | "pending" | "stopped";

export interface Stage {
  key: string;
  /**
   * What this step is called, in the state it is actually in.
   *
   * <p>Written per state rather than kept neutral. "Modalitate de livrare" is a heading, not a
   * fact, and it says nothing about whether the delivery was chosen — but "Livrare aleasă" beside a
   * badge reading "Livrare de ales" is a contradiction, which is what a single label produced. So a
   * step that is done states the fact and a step that is not names the thing being waited on.
   */
  label: string;
  state: StageState;
  /** When it happened, for the stages the order timestamps. */
  at?: ISODateString;
  /** One line of detail, and only where the stage has one worth reading. */
  note?: string;
}

/** A sale that has stopped moving, one way or another. */
const ENDED: ReadonlySet<OrderStatus> = new Set([
  "COMPLETED",
  "REFUNDED",
  "CANCELLED",
]);

/**
 * The order of the journey, and which status proves each stage is behind us.
 *
 * <p>Reading the status alone cannot work: the courier moves a parcel through three statuses and a
 * sale can stop in the middle, so "which stage are we at" and "which stages are done" are two
 * different questions.
 */
const JOURNEY: readonly OrderStatus[] = [
  "AWAITING_CONFIRMATION",
  "AWAITING_PAYMENT",
  "PAID_HELD",
  "LABEL_GENERATED",
  "DROPPED_OFF",
  "IN_TRANSIT",
  "ARRIVED_AT_LOCKER",
  "DELIVERED",
  "COMPLETED",
];

/** How far along the journey a status sits, with the off-journey ones mapped to where they froze. */
function reached(status: OrderStatus): number {
  switch (status) {
    case "PAYMENT_FAILED":
      return JOURNEY.indexOf("AWAITING_PAYMENT");
    case "DISPUTE_OPEN":
    case "DISPUTE_RESOLVED":
    case "REFUNDED":
      return JOURNEY.indexOf("DELIVERED");
    case "CANCELLED":
      return -1;
    default: {
      const at = JOURNEY.indexOf(status);
      return at < 0 ? 0 : at;
    }
  }
}

/**
 * The stages of one sale, in order, each with its state.
 *
 * <p>Six steps rather than the twelve the state machine has, then whatever actually ended it. A
 * buyer does not need DROPPED_OFF and IN_TRANSIT as separate lines: the statuses that exist so the
 * courier can report precisely are collapsed into the one thing they mean, which is that the parcel
 * is moving.
 *
 * <p>Two rules hold the strip together.
 *
 * <p><b>The ending is always last.</b> A dispute is inserted before it rather than appended after,
 * because a sale cannot be settled after it has finished — the strip used to read "Finalizarea
 * comenzii" and then "Sumă restituită" underneath, which is the wrong way round and says the
 * refund happened after the completion.
 *
 * <p><b>Only the step that stopped is marked stopped.</b> Everything after a failure is not also a
 * failure; it is simply something that has not happened, so it stays pending. A column of red
 * crosses says six things went wrong when one did.
 */
export function journeyOf(order: Order): Stage[] {
  const at = reached(order.status);
  const cancelled = order.status === "CANCELLED";

  /**
   * The label for a step, given where it stands.
   *
   * <p>Two forms, because there are only two readings: it happened, or it is still to happen. A
   * stopped step takes its own wording where the difference matters.
   */
  const named = (
    at: StageState,
    settled: string,
    open: string,
    halted?: string,
  ): string => (at === "done" ? settled : at === "stopped" ? (halted ?? open) : open);

  const state = (index: number): StageState => {
    if (index < at) return "done";
    if (index > at) return "pending";
    // The step the sale is sitting on. Finished sales have nothing live.
    return ENDED.has(order.status) ? "done" : "active";
  };

  const deliveryAt: StageState = order.deliveryMethod
    ? "done"
    : cancelled
      ? "pending"
      : state(0);
  const paymentAt: StageState = order.paidAt
    ? "done"
    : order.status === "PAYMENT_FAILED"
      ? "stopped"
      : cancelled
        ? "pending"
        : state(1);
  const labelAt: StageState = order.awb ? "done" : cancelled ? "pending" : state(2);
  // The courier's three statuses are one stage here, so this is done from the
  // moment the parcel has been delivered and active for all of them.
  const transitAt: StageState = order.deliveredAt
    ? "done"
    : cancelled
      ? "pending"
      : state(4);
  const deliveredAt: StageState = order.deliveredAt
    ? "done"
    : cancelled
      ? "pending"
      : state(7);

  const stages: Stage[] = [
    {
      key: "placed",
      label: "Comandă înregistrată",
      state: "done",
      at: order.createdAt,
      note: "Oferta a fost acceptată de vânzător.",
    },
    {
      key: "delivery",
      label: named(deliveryAt, "Livrare aleasă", "Alegerea livrării"),
      state: deliveryAt,
      note: order.deliveryMethod
        ? order.deliveryMethod.type === "HOME_COURIER"
          ? "Curier la adresă"
          : "Easybox"
        : undefined,
    },
    {
      key: "payment",
      label: named(
        paymentAt,
        "Plată înregistrată",
        "Plata comenzii",
        "Plată nefinalizată",
      ),
      state: paymentAt,
      at: order.paidAt,
      note: order.paidAt
        ? "Suma este păstrată de bid4 până la confirmarea livrării."
        : order.status === "PAYMENT_FAILED"
          ? (order.paymentFailureReason ?? "Plata poate fi reluată.")
          : undefined,
    },
    {
      key: "label",
      label: named(labelAt, "Etichetă emisă", "Emiterea etichetei"),
      state: labelAt,
      note: order.awb ? "Coletul a fost înregistrat la curier." : undefined,
    },
    {
      key: "transit",
      label: named(
        transitAt,
        "Colet preluat de curier",
        transitAt === "active" ? "Colet în tranzit" : "Transportul coletului",
      ),
      state: transitAt,
      note: order.courier ? `Transport asigurat de ${order.courier}.` : undefined,
    },
    {
      key: "delivered",
      label: named(deliveredAt, "Colet livrat", "Livrarea coletului"),
      state: deliveredAt,
      at: order.deliveredAt,
    },
  ];

  // A dispute sits between delivery and the ending, which is where it happened.
  if (order.status === "DISPUTE_OPEN") {
    stages.push({
      key: "dispute",
      label: "Sesizare în analiză",
      state: "active",
      note: "Suma rămâne blocată până la soluționare.",
    });
  }
  if (order.status === "DISPUTE_RESOLVED" || order.status === "REFUNDED") {
    stages.push({
      key: "dispute",
      label: "Sesizare soluționată",
      state: "done",
    });
  }

  // And the ending, last, whatever it turned out to be.
  stages.push(
    cancelled
      ? {
          key: "cancelled",
          label: "Comandă anulată",
          state: "stopped",
          note: "Nu a fost încasată nicio sumă.",
        }
      : order.status === "REFUNDED"
        ? {
            key: "refunded",
            label: "Sumă restituită",
            state: "done",
            note: "Suma achitată a fost returnată integral cumpărătorului.",
          }
        : {
            key: "completed",
            label: order.releasedAt
              ? "Comandă finalizată"
              : "Finalizarea comenzii",
            state: order.releasedAt ? "done" : cancelled ? "pending" : state(8),
            at: order.releasedAt,
            note: order.releasedAt
              ? "Donația și suma cuvenită vânzătorului au fost virate."
              : undefined,
          },
  );

  return stages;
}
