import { ORDER, SHIPPING, SHIPPING_PRICES } from "@/lib/config";
import { computeFees } from "@/lib/money";
import type {
  Auction,
  DeliveryMethod,
  Dispute,
  ID,
  Invoice,
  Order,
  OrderStatus,
  TrackingEvent,
} from "@/lib/types";
import { ORDER_FLOW } from "@/lib/types";
import { isoAgo, isoIn } from "@/lib/utils/date";
import { snapshotDelivery } from "../delivery";

const DEMO_ACCOUNT = "usr_maria";

const AGE_HOURS: Record<OrderStatus, number> = {
  AWAITING_CONFIRMATION: 6,
  AWAITING_PAYMENT: 20,
  PAYMENT_FAILED: 26,
  PAID_HELD: 30,
  LABEL_GENERATED: 40,
  DROPPED_OFF: 60,
  IN_TRANSIT: 74,
  ARRIVED_AT_LOCKER: 92,
  DELIVERED: 110,
  COMPLETED: 190,
  DISPUTE_OPEN: 130,
  DISPUTE_RESOLVED: 240,
  REFUNDED: 300,
  CANCELLED: 340,
};

const EVENT_COPY: Record<OrderStatus, string> = {
  AWAITING_CONFIRMATION: "Comandă înregistrată. Se așteaptă alegerea livrării.",
  AWAITING_PAYMENT: "Modalitate de livrare aleasă. Se așteaptă plata.",
  PAYMENT_FAILED: "Plata a fost refuzată de banca emitentă.",
  PAID_HELD: "Plată înregistrată. Suma este păstrată de bid4.",
  LABEL_GENERATED: "Etichetă de expediere emisă.",
  DROPPED_OFF: "Colet preluat de curier.",
  IN_TRANSIT: "Colet în tranzit.",
  ARRIVED_AT_LOCKER: "Colet disponibil pentru ridicare.",
  DELIVERED: "Colet livrat.",
  COMPLETED: "Suma a fost eliberată către cauză și către vânzător.",
  DISPUTE_OPEN: "Sesizare înregistrată. Eliberarea sumei este suspendată.",
  DISPUTE_RESOLVED: "Sesizare soluționată de un reprezentant bid4.",
  REFUNDED: "Suma a fost restituită integral cumpărătorului.",
  CANCELLED: "Comandă anulată.",
};

function makeAwb(seed: number): string {
  const digits = String(1_000_000_000_000 + seed * 7_919_311).slice(0, 13);
  return `${SHIPPING.AWB_PREFIX}${digits}`;
}

function buildTimeline(
  status: OrderStatus,
  createdAt: string,
  locker: string,
  city: string,
): TrackingEvent[] {
  const flowIndex = ORDER_FLOW.indexOf(status);
  const reached: OrderStatus[] =
    flowIndex >= 0
      ? ORDER_FLOW.slice(0, flowIndex + 1)
      : status === "PAYMENT_FAILED"
        ? ["AWAITING_CONFIRMATION", "AWAITING_PAYMENT", "PAYMENT_FAILED"]
        : status === "CANCELLED"
          ? ["AWAITING_CONFIRMATION", "AWAITING_PAYMENT", "CANCELLED"]
          : status === "DISPUTE_OPEN"
            ? [...ORDER_FLOW.slice(0, ORDER_FLOW.indexOf("DELIVERED") + 1), "DISPUTE_OPEN"]
            : status === "DISPUTE_RESOLVED"
              ? [
                  ...ORDER_FLOW.slice(0, ORDER_FLOW.indexOf("DELIVERED") + 1),
                  "DISPUTE_OPEN",
                  "DISPUTE_RESOLVED",
                ]
              : [
                  ...ORDER_FLOW.slice(0, ORDER_FLOW.indexOf("DELIVERED") + 1),
                  "DISPUTE_OPEN",
                  "DISPUTE_RESOLVED",
                  "REFUNDED",
                ];

  const startMs = Date.parse(createdAt);
  const spanMs = Math.max(Date.now() - startMs, 3_600_000);
  const step = spanMs / Math.max(reached.length, 1);

  return reached.map((eventStatus, index) => ({
    id: `evt_${eventStatus.toLowerCase()}_${index}`,
    status: eventStatus,
    label: EVENT_COPY[eventStatus],
    location:
      eventStatus === "DROPPED_OFF" || eventStatus === "ARRIVED_AT_LOCKER"
        ? locker
        : eventStatus === "IN_TRANSIT"
          ? `Hub ${city}`
          : undefined,
    at: new Date(startMs + step * index).toISOString(),
  }));
}

export interface OrdersSeed {
  orders: Order[];
  invoices: Invoice[];
  disputes: Dispute[];
}

export function buildOrders({
  auctions,
  deliveryMethods,
  orderTargets,
  displayNameOf,
}: {
  auctions: Auction[];
  deliveryMethods: DeliveryMethod[];
  orderTargets: Map<string, string>;
  displayNameOf: (userId: ID) => string;
}): OrdersSeed {
  const orders: Order[] = [];
  const invoices: Invoice[] = [];
  const disputes: Dispute[] = [];

  let orderNumber = 400;
  let invoiceNumber = 900;

  const statuses = Object.keys(AGE_HOURS) as OrderStatus[];

  statuses.forEach((status, index) => {
    const auctionId = orderTargets.get(status);
    if (!auctionId) return;

    const auction = auctions.find((item) => item.id === auctionId);
    if (!auction || !auction.winnerId) return;

    const buyerId = auction.sellerId === DEMO_ACCOUNT ? auction.winnerId : DEMO_ACCOUNT;
    auction.winnerId = buyerId;
    const delivery =
      deliveryMethods.find(
        (method) => method.userId === buyerId && method.isDefault,
      ) ?? deliveryMethods[0]!;

    const shipping =
      delivery.type === "EASYBOX"
        ? SHIPPING_PRICES.EASYBOX
        : SHIPPING_PRICES.HOME_COURIER;

    const fees = computeFees({
      finalPrice: auction.currentPrice,
      donationPercent: auction.donationPercent,
      shipping,
    });

    orderNumber += 1;
    const createdAt = isoAgo(AGE_HOURS[status], "hours");
    const reference = `CMD-2026-0${orderNumber}`;
    const paid =
      status !== "AWAITING_CONFIRMATION" &&
      status !== "AWAITING_PAYMENT" &&
      status !== "PAYMENT_FAILED" &&
      status !== "CANCELLED";
    const labelled = ORDER_FLOW.indexOf(status) >= ORDER_FLOW.indexOf("LABEL_GENERATED");
    const hasLabel =
      labelled ||
      ["DISPUTE_OPEN", "DISPUTE_RESOLVED", "REFUNDED"].includes(status);
    const deliveredStatuses: OrderStatus[] = [
      "DELIVERED",
      "COMPLETED",
      "DISPUTE_OPEN",
      "DISPUTE_RESOLVED",
      "REFUNDED",
    ];

    const timeline = buildTimeline(
      status,
      createdAt,
      delivery.lockerName ?? "Easybox",
      delivery.lockerAddress?.split(",").pop()?.trim() ?? "București",
    );

    const order: Order = {
      id: `ord_${status.toLowerCase()}`,
      reference,
      auctionId: auction.id,
      buyerId,
      sellerId: auction.sellerId,
      causeId: auction.causeId,
      finalPrice: fees.finalPrice,
      platformTax: fees.buyerTax,
      shipping: fees.shipping,
      totalPaid: fees.buyerTotal,
      donationAmount: fees.donationAmount,
      donationPercent: fees.donationPercent,
      sellerShare: fees.sellerShare,
      deliveryMethod:
        status === "AWAITING_CONFIRMATION" ? undefined : snapshotDelivery(delivery),
      status,
      awb: hasLabel ? makeAwb(index + 1) : undefined,
      courier: hasLabel ? SHIPPING.SERVICE_NAME : undefined,
      labelPdfRef: hasLabel ? `/mock/labels/${reference}.pdf` : undefined,
      trackingEvents: timeline,
      confirmationDeadline:
        status === "AWAITING_CONFIRMATION"
          ? isoIn(ORDER.CONFIRMATION_HOURS - AGE_HOURS[status], "hours")
          : undefined,
      autoReleaseAt:
        status === "DELIVERED"
          ? isoIn(ORDER.AUTO_RELEASE_HOURS - 12, "hours")
          : undefined,
      paymentFailureReason:
        status === "PAYMENT_FAILED"
          ? "Card refuzat de banca emitentă (fonduri insuficiente)."
          : status === "CANCELLED"
            ? "Plata a eșuat de 3 ori. Comanda a fost anulată automat."
            : undefined,
      createdAt,
      paidAt: paid ? timeline[2]?.at : undefined,
      deliveredAt: deliveredStatuses.includes(status)
        ? timeline.find((event) => event.status === "DELIVERED")?.at
        : undefined,
      releasedAt:
        status === "COMPLETED"
          ? timeline[timeline.length - 1]?.at
          : undefined,
    };

    orders.push(order);

    if (paid) {
      invoiceNumber += 1;
      invoices.push({
        id: `inv_${order.id}_fee`,
        orderId: order.id,
        orderReference: reference,
        type: "PLATFORM_FEE",
        number: `BID4-2026-000${invoiceNumber}`,
        amount: order.platformTax,
        issuedToUserId: buyerId,
        issuedToName: displayNameOf(buyerId),
        pdfUrl: `/mock/invoices/${order.id}-taxa.pdf`,
        createdAt: order.paidAt ?? createdAt,
      });
    }

    if (status === "COMPLETED") {
      invoiceNumber += 1;
      invoices.push({
        id: `inv_${order.id}_donation`,
        orderId: order.id,
        orderReference: reference,
        type: "DONATION_RECEIPT",
        number: `DON-2026-000${invoiceNumber}`,
        amount: order.donationAmount,
        issuedToUserId: buyerId,
        issuedToName: displayNameOf(buyerId),
        pdfUrl: `/mock/invoices/${order.id}-donatie.pdf`,
        createdAt: order.releasedAt ?? createdAt,
      });

      invoiceNumber += 1;
      invoices.push({
        id: `inv_${order.id}_payout`,
        orderId: order.id,
        orderReference: reference,
        type: "SELLER_PAYOUT",
        number: `PLT-2026-000${invoiceNumber}`,
        amount: order.sellerShare,
        issuedToUserId: order.sellerId,
        issuedToName: displayNameOf(order.sellerId),
        pdfUrl: `/mock/invoices/${order.id}-plata.pdf`,
        createdAt: order.releasedAt ?? createdAt,
      });
    }

    if (status === "DISPUTE_OPEN") {
      disputes.push({
        id: `dsp_${order.id}`,
        orderId: order.id,
        orderReference: reference,
        openedBy: buyerId,
        reason: "NOT_AS_DESCRIBED",
        description:
          "Telefonul are o zgârietură adâncă pe ecran, care nu apare în poze și nu e menționată în descriere. Am făcut fotografii imediat după ridicarea din locker.",
        evidenceUrls: ["/mock/dispute/ecran-1.jpg", "/mock/dispute/ecran-2.jpg"],
        status: "OPEN",
        createdAt: isoAgo(AGE_HOURS[status] - 20, "hours"),
      });
    }

    if (status === "DISPUTE_RESOLVED") {
      disputes.push({
        id: `dsp_${order.id}`,
        orderId: order.id,
        orderReference: reference,
        openedBy: buyerId,
        reason: "DAMAGED",
        description:
          "Valiza bormașinii a ajuns spartă într-un colț. Scula funcționează, dar cutia nu se mai închide bine.",
        evidenceUrls: ["/mock/dispute/valiza.jpg"],
        status: "RESOLVED_PARTIAL",
        operatorId: "usr_operator",
        resolutionNote:
          "Produsul este funcțional, dar ambalajul a suferit. Am returnat 25% din preț cumpărătorului, restul a fost eliberat către cauză și vânzător.",
        refundAmount: Math.round(order.finalPrice * 0.25),
        createdAt: isoAgo(AGE_HOURS[status] - 30, "hours"),
        resolvedAt: isoAgo(AGE_HOURS[status] - 60, "hours"),
      });
    }

    if (status === "REFUNDED") {
      disputes.push({
        id: `dsp_${order.id}`,
        orderId: order.id,
        orderReference: reference,
        openedBy: buyerId,
        reason: "DAMAGED",
        description:
          "Espressorul a ajuns cu carcasa crăpată și nu pornește. Coletul avea urme de lovire.",
        evidenceUrls: ["/mock/dispute/espressor.jpg"],
        status: "RESOLVED_REFUND",
        operatorId: "usr_operator",
        resolutionNote:
          "Daune la transport confirmate de poze. Am rambursat integral cumpărătorul și am deschis reclamație la curier.",
        createdAt: isoAgo(AGE_HOURS[status] - 40, "hours"),
        resolvedAt: isoAgo(AGE_HOURS[status] - 90, "hours"),
      });
    }
  });

  return { orders, invoices, disputes };
}
