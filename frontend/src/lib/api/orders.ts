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

// TODO(backend): Stripe Connect holds the escrow — a PaymentIntent on close, transfers on release.
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

export function confirmationHoursLeft(order: Order): number | null {
  if (!order.confirmationDeadline) return null;
  const ms = Date.parse(order.confirmationDeadline) - Date.now();
  return Math.max(0, ms / 3_600_000);
}

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

// TODO(backend): a Stripe Checkout session; this becomes a redirect out and back.
export async function payOrder(orderId: ID, userId: ID): Promise<Order> {
  if (!USE_MOCK) {
    return http<Order>(`/orders/${orderId}/payment`, { method: "POST" });
  }

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

export async function dispatchOrder(orderId: ID, userId: ID): Promise<Order> {
  if (!USE_MOCK) {
    return http<Order>(`/orders/${orderId}/dispatch`, { method: "POST" });
  }
  return (await markDroppedOff(orderId, userId)) as Order;
}

export async function confirmReceipt(orderId: ID, userId: ID): Promise<Order> {
  if (!USE_MOCK) {
    return http<Order>(`/orders/${orderId}/receipt`, { method: "POST" });
  }
  return (await confirmPickup(orderId, userId)) as Order;
}

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

const PROTECTED = new Set<OrderStatus>([
  "PAID_HELD",
  "LABEL_GENERATED",
  "DROPPED_OFF",
  "IN_TRANSIT",
  "ARRIVED_AT_LOCKER",
  "DELIVERED",
]);

export async function listAgreements(orderId: ID): Promise<OrderAgreement[]> {
  if (!USE_MOCK) return http<OrderAgreement[]>(`/orders/${orderId}/agreements`);

  await delay();
  const world = getWorld();
  const order = world.orders.find((item) => item.id === orderId);
  if (!order) notFound("Comanda");

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

export async function listTracking(orderId: ID): Promise<TrackingEvent[]> {
  if (!USE_MOCK) return http<TrackingEvent[]>(`/orders/${orderId}/tracking`);

  await delay();
  const world = getWorld();
  const order = world.orders.find((item) => item.id === orderId);
  if (!order) notFound("Comanda");
  return order.trackingEvents ?? [];
}

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

const TERMS_VERSION = "2026-09-12";

export { ORDER as ORDER_TIMINGS };
