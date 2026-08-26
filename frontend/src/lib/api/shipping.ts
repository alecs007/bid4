import { SHIPPING, USE_MOCK } from "@/lib/config";
import { formatMoney } from "@/lib/money";
import {
  badRequest,
  commit,
  delay,
  forbidden,
  getWorld,
  makeAwb,
  maybeFailRead,
  notFound,
  pushEvent,
} from "@/lib/mock/store";
import type {
  DeliverySnapshot,
  EasyboxLocker,
  ID,
  Order,
  ShippingLabelData,
  TrackingEvent,
} from "@/lib/types";

import { http } from "./http";

/**
 * TODO(backend): every function here maps onto a Sameday Easybox call —
 *   lockers      -> GET  /geolocation/lockers
 *   generateAwb  -> POST /awb   (returns awbNumber + label PDF bytes)
 *   trackAwb     -> GET  /awb/{awb}/status
 * Once the courier issues the real PDF, serve that and keep the local renderer
 * in `lib/pdf/shippingLabel.ts` as the dev fallback.
 */

const LOCKERS: EasyboxLocker[] = [
  {
    id: "BUC-142",
    name: "Easybox Auchan Titan",
    address: "Bd. 1 Decembrie 1918 nr. 33",
    city: "București",
    county: "Sector 3",
    availableCompartments: 14,
    scheduleNote: "Non-stop",
  },
  {
    id: "BUC-207",
    name: "Easybox Kaufland Băneasa",
    address: "Șos. București-Ploiești 44",
    city: "București",
    county: "Sector 1",
    availableCompartments: 6,
    scheduleNote: "07:00 – 23:00",
  },
  {
    id: "CLJ-058",
    name: "Easybox Kaufland Mărăști",
    address: "Str. Fabricii de Zahăr 5",
    city: "Cluj-Napoca",
    county: "Cluj",
    availableCompartments: 9,
    scheduleNote: "Non-stop",
  },
  {
    id: "TIM-021",
    name: "Easybox Iulius Town",
    address: "Str. Aristide Demetriade 1",
    city: "Timișoara",
    county: "Timiș",
    availableCompartments: 3,
    scheduleNote: "08:00 – 22:00",
  },
  {
    id: "IAS-034",
    name: "Easybox Palas Mall",
    address: "Str. Palas 7A",
    city: "Iași",
    county: "Iași",
    availableCompartments: 11,
    scheduleNote: "Non-stop",
  },
  {
    id: "BRA-017",
    name: "Easybox Coresi",
    address: "Str. Zaharia Stancu 1",
    city: "Brașov",
    county: "Brașov",
    availableCompartments: 8,
    scheduleNote: "07:00 – 23:00",
  },
  {
    id: "SIB-009",
    name: "Easybox Promenada",
    address: "Str. Nicolae Teclu 50",
    city: "Sibiu",
    county: "Sibiu",
    availableCompartments: 5,
    scheduleNote: "Non-stop",
  },
  {
    id: "CON-026",
    name: "Easybox City Park",
    address: "Bd. Alexandru Lăpușneanu 116C",
    city: "Constanța",
    county: "Constanța",
    availableCompartments: 12,
    scheduleNote: "08:00 – 22:00",
  },
];

/** GET /shipping/lockers?q=cluj */
export async function searchLockers(query = ""): Promise<EasyboxLocker[]> {
  if (!USE_MOCK) {
    return http<EasyboxLocker[]>("/shipping/lockers", { query: { q: query } });
  }

  await delay();
  maybeFailRead("lockerele Easybox");
  const needle = query.trim().toLowerCase();
  if (!needle) return LOCKERS;
  return LOCKERS.filter((locker) =>
    `${locker.name} ${locker.address} ${locker.city} ${locker.id}`
      .toLowerCase()
      .includes(needle),
  );
}

function addressLinesOf(delivery: DeliverySnapshot): string[] {
  if (delivery.type === "EASYBOX") {
    return [delivery.lockerName ?? "", delivery.lockerAddress ?? ""].filter(
      Boolean,
    );
  }
  const home = delivery.homeAddress;
  if (!home) return [];
  return [
    home.street,
    `${home.city}, ${home.county}`,
    home.postalCode,
    home.details ?? "",
  ].filter(Boolean);
}

/** Pure: give it an order and it produces the label, no I/O. */
export function buildLabelData(orderId: ID): ShippingLabelData {
  const world = getWorld();
  const order = world.orders.find((item) => item.id === orderId);
  if (!order) notFound("Comanda");
  if (!order.awb || !order.deliveryMethod) {
    badRequest("Eticheta nu a fost încă generată pentru această comandă.");
  }

  const auction = world.auctions.find((item) => item.id === order.auctionId);
  const seller = world.users.find((item) => item.id === order.sellerId);
  const buyer = world.users.find((item) => item.id === order.buyerId);
  const cause = world.causes.find((item) => item.id === order.causeId);
  const sellerDelivery = world.deliveryMethods.find(
    (method) => method.userId === order.sellerId && method.isDefault,
  );

  const trackingUrl = `${SHIPPING.TRACKING_URL_BASE}/${order.awb}`;

  return {
    awb: order.awb,
    courier: SHIPPING.COURIER_NAME,
    serviceName: order.courier ?? SHIPPING.SERVICE_NAME,
    qrPayload: `${order.awb}|${trackingUrl}`,
    trackingUrl,
    orderId: order.id,
    orderReference: order.reference,
    sender: {
      name: seller?.displayName ?? "Vânzător bid4",
      phone: sellerDelivery?.phone ?? "",
      addressLines: [
        sellerDelivery?.lockerName ?? "",
        sellerDelivery?.lockerAddress ?? seller?.city ?? "",
      ].filter(Boolean),
    },
    recipient: {
      name: buyer?.displayName ?? "Cumpărător bid4",
      phone: order.deliveryMethod.phone,
      addressLines: addressLinesOf(order.deliveryMethod),
    },
    deliveryType: order.deliveryMethod.type,
    lockerId: order.deliveryMethod.easyboxLockerId,
    lockerName: order.deliveryMethod.lockerName,
    weightGrams: auction?.weightGrams ?? SHIPPING.DEFAULT_WEIGHT_GRAMS,
    itemTitle: auction?.title ?? "Obiect bid4",
    issuedAt: new Date().toISOString(),
    donationNote: cause
      ? `Din această comandă, ${formatMoney(order.donationAmount)} merg către ${cause.name}.`
      : undefined,
  };
}

/** POST /shipping/awb — issues the AWB and the label. */
export async function generateLabel(
  orderId: ID,
  userId: ID,
): Promise<ShippingLabelData> {
  if (!USE_MOCK) {
    return http<ShippingLabelData>("/shipping/awb", {
      method: "POST",
      body: { orderId },
    });
  }

  await delay();
  const world = getWorld();
  const order = world.orders.find((item) => item.id === orderId);
  if (!order) notFound("Comanda");
  if (order.sellerId !== userId && order.buyerId !== userId) {
    forbidden("Nu ai acces la această etichetă.");
  }
  if (!order.deliveryMethod) {
    badRequest("Cumpărătorul nu a confirmat încă datele de livrare.");
  }

  if (!order.awb) {
    order.awb = makeAwb();
    order.courier = SHIPPING.SERVICE_NAME;
    order.labelPdfRef = `/mock/labels/${order.reference}.pdf`;
    if (order.status === "PAID_HELD") {
      pushEvent(
        order,
        "LABEL_GENERATED",
        "Etichetă AWB generată. Vânzătorul poate expedia.",
      );
    }
    commit();
  }

  return buildLabelData(orderId);
}

/** GET /shipping/track/{awb} */
export async function trackAwb(awb: string): Promise<TrackingEvent[]> {
  if (!USE_MOCK) return http<TrackingEvent[]>(`/shipping/track/${awb}`);

  await delay();
  const world = getWorld();
  const order = world.orders.find((item) => item.awb === awb);
  if (!order) notFound("AWB-ul");
  return order.trackingEvents;
}

/** Courier-facing states only — used by the tracking timeline component. */
export function courierEvents(order: Order): TrackingEvent[] {
  const courierStatuses = new Set([
    "LABEL_GENERATED",
    "DROPPED_OFF",
    "IN_TRANSIT",
    "ARRIVED_AT_LOCKER",
    "DELIVERED",
  ]);
  return order.trackingEvents.filter((event) =>
    courierStatuses.has(event.status),
  );
}
