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
  OrderFilters,
  UserRole,
} from "@/lib/types";

import { http } from "./http";

/**
 * TODO(backend): the Stripe Connect choreography is a SetupIntent when a card is
 * saved; an off-session PaymentIntent for buyerTotal on close, captured to the
 * platform account (the escrow hold); on release two Transfers, donationAmount to
 * the cause and sellerNet to the seller, bid4 keeping buyerTax + sellerFee; and a
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
  order.sellerFee = fees.sellerFee;
  order.sellerNet = fees.sellerNet;

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
    return http<OrderDetail>(`/orders/${orderId}/dropped-off`, {
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

export { ORDER as ORDER_TIMINGS };
