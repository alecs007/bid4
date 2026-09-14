import type { ISODateString, Order, OrderStatus } from "@/lib/types";

export type StageState = "done" | "active" | "pending" | "stopped";

export interface Stage {
  key: string;
  label: string;
  state: StageState;
  at?: ISODateString;
  note?: string;
}

const ENDED: ReadonlySet<OrderStatus> = new Set([
  "COMPLETED",
  "REFUNDED",
  "CANCELLED",
]);

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

export function journeyOf(order: Order): Stage[] {
  const at = reached(order.status);
  const cancelled = order.status === "CANCELLED";

  const named = (
    at: StageState,
    settled: string,
    open: string,
    halted?: string,
  ): string => (at === "done" ? settled : at === "stopped" ? (halted ?? open) : open);

  const state = (index: number): StageState => {
    if (index < at) return "done";
    if (index > at) return "pending";
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
