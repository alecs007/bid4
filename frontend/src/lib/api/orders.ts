import { ORDER, SHIPPING, USE_MOCK } from "@/lib/config";
import { computeFees } from "@/lib/money";
import { toOrderDetail } from "@/lib/mock/join";
import {
  badRequest,
  commit,
  completeOrder,
  delay,
  forbidden,
  getWorld,
  makeAwb,
  maybeFailRead,
  notFound,
  pushEvent,
  shippingPriceFor,
  snapshotDelivery,
  syncWorld,
} from "@/lib/mock/store";
import type {
  ConfirmOrderPayload,
  ID,
  Order,
  OrderDetail,
  OrderAgreement,
  OrderDocument,
  OrderFilters,
  OrderStatus,
  TrackingEvent,
  UserRole,
} from "@/lib/types";

import { http } from "./http";

/**
 * TODO(backend): the Stripe Connect choreography is a SetupIntent when a card is
 * saved; an off-session PaymentIntent for buyerTotal on close, captured to the
 * platform account (the escrow hold); on release two Transfers, donationAmount to
 * the cause and sellerShare to the seller, bid4 keeping the buyer's tax; and a
 * full or partial Refund instead of those Transfers when a dispute goes the
 * buyer's way. None of it belongs in the frontend — these calls stay as they are.
 */

/** GET /orders?role=BUYER|SELLER */
export async function listOrders(
  userId: ID,
  filters: OrderFilters = {},
): Promise<OrderDetail[]> {
  if (!USE_MOCK) {
    return http<OrderDetail[]>("/orders", {
      query: {
        role: filters.role,
        status: filters.status,
        q: filters.q,
        page: filters.page,
        pageSize: filters.pageSize,
      },
    });
  }

  await delay();
  maybeFailRead("comenzile");
  const world = getWorld();

  return world.orders
    .filter((order) =>
      filters.role === "SELLER"
        ? order.sellerId === userId
        : filters.role === "BUYER"
          ? order.buyerId === userId
          : order.buyerId === userId || order.sellerId === userId,
    )
    .filter((order) =>
      filters.status?.length ? filters.status.includes(order.status) : true,
    )
    .filter((order) =>
      filters.q
        ? order.reference.toLowerCase().includes(filters.q.toLowerCase())
        : true,
    )
    .map(toOrderDetail)
    .filter((item): item is OrderDetail => item !== null)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/** GET /orders/{id} */
export async function getOrder(orderId: ID, viewerId: ID): Promise<OrderDetail> {
  if (!USE_MOCK) return http<OrderDetail>(`/orders/${orderId}`);

  await delay();
  maybeFailRead("comanda");
  const world = getWorld();
  const order = world.orders.find((item) => item.id === orderId);
  if (!order) notFound("Comanda");

  const viewer = world.users.find((item) => item.id === viewerId);
  const isParty = order.buyerId === viewerId || order.sellerId === viewerId;
  const isStaff = viewer?.role === "OPERATOR" || viewer?.role === "ADMIN";
  if (!isParty && !isStaff) forbidden("Nu ai acces la această comandă.");

  const detail = toOrderDetail(order);
  if (!detail) notFound("Comanda");
  return detail;
}

/**
 * POST /orders/{id}/confirm — the winner locks in delivery details. Payment is
 * charged straight after (mocked by the world clock).
 */
export async function confirmOrder(
  payload: ConfirmOrderPayload,
  userId: ID,
): Promise<OrderDetail> {
  if (!USE_MOCK) {
    return http<OrderDetail>(`/orders/${payload.orderId}/confirm`, {
      method: "POST",
      body: { deliveryMethodId: payload.deliveryMethodId },
    });
  }

  await delay();
  const world = getWorld();
  const order = world.orders.find((item) => item.id === payload.orderId);
  if (!order) notFound("Comanda");
  if (order.buyerId !== userId) forbidden("Doar câștigătorul poate confirma.");
  if (order.status !== "AWAITING_CONFIRMATION") {
    badRequest("Comanda a fost deja confirmată.");
  }

  const method = world.deliveryMethods.find(
    (item) => item.id === payload.deliveryMethodId && item.userId === userId,
  );
  if (!method) notFound("Metoda de livrare");

  order.deliveryMethod = snapshotDelivery(method);
  order.shipping = shippingPriceFor(order.deliveryMethod);

  // Re-derive the whole split so shipping lands in the totals exactly once.
  const fees = computeFees({
    finalPrice: order.finalPrice,
    donationPercent: order.donationPercent,
    shipping: order.shipping,
  });
  order.platformTax = fees.buyerTax;
  order.totalPaid = fees.buyerTotal;
  order.donationAmount = fees.donationAmount;
  order.sellerShare = fees.sellerShare;

  pushEvent(
    order,
    "AWAITING_PAYMENT",
    "Date de livrare confirmate. Procesăm plata cu cardul salvat.",
  );
  commit();

  const detail = toOrderDetail(order);
  if (!detail) notFound("Comanda");
  return detail;
}

/** POST /orders/{id}/retry-payment */
export async function retryPayment(
  orderId: ID,
  userId: ID,
): Promise<OrderDetail> {
  if (!USE_MOCK) {
    return http<OrderDetail>(`/orders/${orderId}/retry-payment`, {
      method: "POST",
    });
  }

  await delay();
  const world = getWorld();
  const order = world.orders.find((item) => item.id === orderId);
  if (!order) notFound("Comanda");
  if (order.buyerId !== userId) forbidden("Doar cumpărătorul poate relua plata.");
  if (order.status !== "PAYMENT_FAILED") {
    badRequest("Comanda nu are o plată eșuată.");
  }

  order.paymentFailureReason = undefined;
  pushEvent(order, "AWAITING_PAYMENT", "Reluăm plata cu cardul salvat.");
  commit();

  const detail = toOrderDetail(order);
  if (!detail) notFound("Comanda");
  return detail;
}

/** POST /orders/{id}/dropped-off — seller left the parcel at the locker. */
export async function markDroppedOff(
  orderId: ID,
  userId: ID,
): Promise<OrderDetail> {
  if (!USE_MOCK) {
    return http<OrderDetail>(`/orders/${orderId}/dispatch`, {
      method: "POST",
    });
  }

  await delay();
  const world = getWorld();
  const order = world.orders.find((item) => item.id === orderId);
  if (!order) notFound("Comanda");
  if (order.sellerId !== userId) forbidden("Doar vânzătorul poate marca predarea.");
  if (order.status !== "LABEL_GENERATED") {
    badRequest("Generează întâi eticheta de expediere.");
  }

  pushEvent(
    order,
    "DROPPED_OFF",
    "Colet predat la Easybox.",
    order.deliveryMethod?.lockerName,
  );
  commit();

  const detail = toOrderDetail(order);
  if (!detail) notFound("Comanda");
  return detail;
}

/**
 * POST /orders/{id}/confirm-pickup — releases the escrow early; otherwise the
 * 72h timer does it.
 */
export async function confirmPickup(
  orderId: ID,
  userId: ID,
): Promise<OrderDetail> {
  if (!USE_MOCK) {
    return http<OrderDetail>(`/orders/${orderId}/confirm-pickup`, {
      method: "POST",
    });
  }

  await delay();
  const world = getWorld();
  const order = world.orders.find((item) => item.id === orderId);
  if (!order) notFound("Comanda");
  if (order.buyerId !== userId) forbidden("Doar cumpărătorul poate confirma primirea.");
  if (order.status !== "DELIVERED" && order.status !== "ARRIVED_AT_LOCKER") {
    badRequest("Coletul nu a ajuns încă la destinație.");
  }

  if (order.status === "ARRIVED_AT_LOCKER") {
    order.deliveredAt = new Date().toISOString();
    pushEvent(order, "DELIVERED", "Colet ridicat de destinatar.");
  }

  completeOrder(
    order,
    "Ai confirmat primirea. Fondurile au fost eliberate către cauză și vânzător.",
  );

  const detail = toOrderDetail(order);
  if (!detail) notFound("Comanda");
  return detail;
}

/** GET /operator/orders — every order, for intervention. */
export async function listAllOrders(
  role: UserRole,
  filters: OrderFilters = {},
): Promise<OrderDetail[]> {
  if (!USE_MOCK) return http<OrderDetail[]>("/operator/orders");

  await delay();
  if (role !== "OPERATOR" && role !== "ADMIN") {
    forbidden("Nu ai drepturi pentru această zonă.");
  }
  maybeFailRead("comenzile");
  syncWorld(true);
  const world = getWorld();

  return world.orders
    .filter((order) =>
      filters.status?.length ? filters.status.includes(order.status) : true,
    )
    .filter((order) =>
      filters.q
        ? `${order.reference} ${order.awb ?? ""}`
            .toLowerCase()
            .includes(filters.q.toLowerCase())
        : true,
    )
    .map(toOrderDetail)
    .filter((item): item is OrderDetail => item !== null)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/** POST /operator/orders/{id}/force — for when a courier webhook never arrives. */
export async function forceOrderStatus(
  orderId: ID,
  status: Order["status"],
  role: UserRole,
  note: string,
): Promise<OrderDetail> {
  if (!USE_MOCK) {
    return http<OrderDetail>(`/operator/orders/${orderId}/force`, {
      method: "POST",
      body: { status, note },
    });
  }

  await delay();
  if (role !== "OPERATOR" && role !== "ADMIN") {
    forbidden("Nu ai drepturi pentru această acțiune.");
  }

  const world = getWorld();
  const order = world.orders.find((item) => item.id === orderId);
  if (!order) notFound("Comanda");

  if (status === "COMPLETED") {
    completeOrder(order, note || "Comandă finalizată manual de echipa bid4.");
  } else {
    if (status === "LABEL_GENERATED" && !order.awb) {
      order.awb = makeAwb();
      order.courier = SHIPPING.SERVICE_NAME;
      order.labelPdfRef = `/mock/labels/${order.reference}.pdf`;
    }
    pushEvent(order, status, note || "Stare actualizată de echipa bid4.");
    commit();
  }

  const detail = toOrderDetail(order);
  if (!detail) notFound("Comanda");
  return detail;
}

/** Convenience for the buyer's dashboard: what needs my attention right now? */
export function ordersNeedingAction(
  orders: OrderDetail[],
  userId: ID,
): OrderDetail[] {
  return orders.filter((order) => {
    if (order.buyerId === userId) {
      return (
        order.status === "AWAITING_CONFIRMATION" ||
        order.status === "PAYMENT_FAILED" ||
        order.status === "ARRIVED_AT_LOCKER" ||
        order.status === "DELIVERED"
      );
    }
    if (order.sellerId === userId) {
      return order.status === "LABEL_GENERATED";
    }
    return false;
  });
}

/** Hours left before the confirmation deadline auto-fires. */
export function confirmationHoursLeft(order: Order): number | null {
  if (!order.confirmationDeadline) return null;
  const ms = Date.parse(order.confirmationDeadline) - Date.now();
  return Math.max(0, ms / 3_600_000);
}

/* --- the steps, as the thread drives them ---------------------------------- */

/**
 * The five things either party can do to a sale, one function each.
 *
 * <p>Named after what the person pressing is doing rather than after the status it produces, and
 * each one answers with the whole order — the card that drew the button re-renders from the status
 * that comes back, so the thread never has to guess where the sale got to.
 *
 * <p>Every one of them is re-checked on the server against the order's own status and the caller's
 * id. Nothing here is trusted, which is what makes it safe for the thread to offer the buttons at
 * all.
 */

/** PUT /orders/{id}/delivery — buyer. This is what makes the total knowable. */
export async function chooseDelivery(
  orderId: ID,
  deliveryMethodId: ID,
  userId: ID,
): Promise<Order> {
  if (!USE_MOCK) {
    return http<Order>(`/orders/${orderId}/delivery`, {
      method: "PUT",
      body: { deliveryMethodId },
    });
  }
  return (await confirmOrder({ orderId, deliveryMethodId }, userId)) as Order;
}

/**
 * POST /orders/{id}/payment — buyer.
 *
 * TODO(backend): a Stripe Checkout session, and this becomes a redirect out and back. The server
 * side is a stub that says the money arrived, deliberately shaped like what replaces it.
 */
export async function payOrder(orderId: ID, userId: ID): Promise<Order> {
  if (!USE_MOCK) {
    return http<Order>(`/orders/${orderId}/payment`, { method: "POST" });
  }

  // Its own implementation rather than a call to retryPayment, which refuses
  // anything that is not already PAYMENT_FAILED — so paying an ordinary order
  // answered "Comanda nu are o plată eșuată." and the step could not be walked
  // in the preview at all. Mirrors OrderService.markPaid: either status may pay,
  // and the whole amount is held rather than split.
  await delay();
  const world = getWorld();
  const order = world.orders.find((item) => item.id === orderId);
  if (!order) notFound("Comanda");
  if (order.buyerId !== userId) {
    forbidden("Doar cumpărătorul poate plăti comanda.");
  }
  if (order.status !== "AWAITING_PAYMENT" && order.status !== "PAYMENT_FAILED") {
    badRequest("Comanda nu se află în etapa de plată.");
  }

  order.paymentFailureReason = undefined;
  order.paidAt = new Date().toISOString();
  pushEvent(order, "PAID_HELD", "Plată confirmată. Suma este ținută de bid4.");
  commit();
  return order;
}

/** POST /orders/{id}/label — seller. */
export async function generateLabel(orderId: ID): Promise<Order> {
  if (!USE_MOCK) {
    return http<Order>(`/orders/${orderId}/label`, { method: "POST" });
  }

  await delay();
  const world = getWorld();
  const order = world.orders.find((item) => item.id === orderId);
  if (!order) notFound("Comanda");
  order.awb = makeAwb();
  order.courier = "Sameday";
  order.status = "LABEL_GENERATED";
  commit();
  return order;
}

/** POST /orders/{id}/dispatch — seller. The last thing either party says about the journey. */
export async function dispatchOrder(orderId: ID, userId: ID): Promise<Order> {
  if (!USE_MOCK) {
    return http<Order>(`/orders/${orderId}/dispatch`, { method: "POST" });
  }
  return (await markDroppedOff(orderId, userId)) as Order;
}

/** POST /orders/{id}/receipt — buyer. This is what releases the money. */
export async function confirmReceipt(orderId: ID, userId: ID): Promise<Order> {
  if (!USE_MOCK) {
    return http<Order>(`/orders/${orderId}/receipt`, { method: "POST" });
  }
  return (await confirmPickup(orderId, userId)) as Order;
}

/**
 * POST /orders/{id}/dispute — buyer.
 *
 * <p>The other half of confirming, and the one the thread offers: the money is already held by
 * bid4, and this is what stops it moving. The deadline that would otherwise have released it on the
 * buyer's behalf is cleared with it, so a parcel somebody has objected to cannot pay itself out by
 * running out of time.
 *
 * <p>Not `disputes.ts`, which opens a case with a reason, a description and photographs for an
 * operator to judge. That is the formal route from the order page; this is the button beside
 * "confirm primirea", where the only thing being asked is whether to let the money go.
 */
export async function reportProblem(
  orderId: ID,
  userId: ID,
  reason?: string,
): Promise<Order> {
  if (!USE_MOCK) {
    return http<Order>(`/orders/${orderId}/dispute`, {
      method: "POST",
      body: { reason },
    });
  }

  await delay();
  const world = getWorld();
  const order = world.orders.find((item) => item.id === orderId);
  if (!order) notFound("Comanda");
  if (order.buyerId !== userId) {
    forbidden("Doar cumpărătorul poate semnala o problemă.");
  }
  if (!PROTECTED.has(order.status)) {
    badRequest("Comanda nu se află într-o etapă în care poate fi contestată.");
  }

  order.status = "DISPUTE_OPEN";
  order.autoReleaseAt = undefined;
  pushEvent(
    order,
    "DISPUTE_OPEN",
    "Cumpărătorul a semnalat o problemă cu această comandă.",
  );
  commit();

  const detail = toOrderDetail(order);
  if (!detail) notFound("Comanda");
  return detail;
}

/** Where the money is in, and not yet out: the window a buyer may hold it in. */
const PROTECTED = new Set<OrderStatus>([
  "PAID_HELD",
  "LABEL_GENERATED",
  "DROPPED_OFF",
  "IN_TRANSIT",
  "ARRIVED_AT_LOCKER",
  "DELIVERED",
]);

/**
 * GET /orders/{id}/agreements — what each party accepted, and when.
 *
 * <p>The mock answers from the order's own timeline rather than storing rows: the demo's world was
 * seeded before this existed, and a sale that has been paid for demonstrably had its terms accepted
 * at payment. It is a reconstruction, and it is marked as one by carrying the same version string
 * the server would have written.
 */
export async function listAgreements(orderId: ID): Promise<OrderAgreement[]> {
  if (!USE_MOCK) return http<OrderAgreement[]>(`/orders/${orderId}/agreements`);

  await delay();
  const world = getWorld();
  const order = world.orders.find((item) => item.id === orderId);
  if (!order) notFound("Comanda");

  // Each acceptance is tied to the act it governs, exactly as OrderService
  // records it: the sale at the moment delivery is chosen, the payment at the
  // moment it is made, the shipping terms when the label is issued. Keyed on
  // the status instead, a cancelled order claimed the buyer had accepted the
  // payment terms for a payment that never happened.
  const rows: OrderAgreement[] = [];
  if (order.deliveryMethod) {
    rows.push({
      kind: "SALE",
      termsVersion: TERMS_VERSION,
      acceptedAt: order.createdAt,
    });
  }
  if (order.paidAt) {
    rows.push({
      kind: "PAYMENT",
      termsVersion: TERMS_VERSION,
      acceptedAt: order.paidAt,
    });
  }
  if (order.awb) {
    rows.push({
      kind: "SHIPPING",
      termsVersion: TERMS_VERSION,
      acceptedAt: order.paidAt ?? order.createdAt,
    });
  }
  return rows;
}

/**
 * GET /orders/{id}/tracking
 *
 * <p>The courier's scans, as their own resource. They are not part of the order response: there can
 * be many of them and most screens want none, so a page that needs the parcel's history asks for it.
 */
export async function listTracking(orderId: ID): Promise<TrackingEvent[]> {
  if (!USE_MOCK) return http<TrackingEvent[]>(`/orders/${orderId}/tracking`);

  await delay();
  const world = getWorld();
  const order = world.orders.find((item) => item.id === orderId);
  if (!order) notFound("Comanda");
  return order.trackingEvents ?? [];
}

/**
 * GET /orders/{id}/documents
 *
 * <p>Lists what the sale has on paper, including documents that are promised and not yet rendered.
 * Showing an invoice before it exists is deliberate: somebody looking for one can see that there
 * will be one, which is a better answer than an empty list.
 */
export async function listDocuments(
  orderId: ID,
  viewerId: ID,
): Promise<OrderDocument[]> {
  if (!USE_MOCK) return http<OrderDocument[]>(`/orders/${orderId}/documents`);

  await delay();
  const world = getWorld();
  const order = world.orders.find((item) => item.id === orderId);
  if (!order) notFound("Comanda");

  const buyer = world.users.find((item) => item.id === order.buyerId);
  const seller = world.users.find((item) => item.id === order.sellerId);
  const rows: OrderDocument[] = [];

  // The same moments the server issues them at: the proforma when the money
  // arrives, the invoice and the payout statement when the sale completes, the
  // label when the parcel is booked.
  if (order.paidAt) {
    rows.push({
      kind: "PROFORMA",
      number: `PRO-2026-${order.reference.slice(-6)}`,
      issuedToName: buyer?.displayName ?? "",
      amount: order.totalPaid,
      available: false,
      issuedAt: order.paidAt,
    });
  }
  if (order.awb) {
    rows.push({
      kind: "SHIPPING_LABEL",
      issuedToName: seller?.displayName ?? "",
      amount: 0,
      // The courier document belongs to the party who hands the parcel over.
      // Listed for both — the buyer can see one was issued — but downloadable
      // only by the seller, which is also what the server enforces.
      available: order.sellerId === viewerId,
      issuedAt: order.paidAt ?? order.createdAt,
    });
  }
  if (order.releasedAt) {
    rows.push({
      kind: "INVOICE",
      number: `BID4-2026-${order.reference.slice(-6)}`,
      issuedToName: buyer?.displayName ?? "",
      amount: order.totalPaid,
      available: false,
      issuedAt: order.releasedAt,
    });
    rows.push({
      kind: "PAYOUT_STATEMENT",
      number: `PAY-2026-${order.reference.slice(-6)}`,
      issuedToName: seller?.displayName ?? "",
      amount: order.sellerShare,
      available: false,
      issuedAt: order.releasedAt,
    });
  }
  return rows;
}

/** Kept in step with `Terms.CURRENT_VERSION` on the server. */
const TERMS_VERSION = "2026-09-12";

export { ORDER as ORDER_TIMINGS };
