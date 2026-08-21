import { MOCK, ORDER, SHIPPING } from "@/lib/config";
import { computeFees } from "@/lib/money";
import { ApiError } from "@/lib/types";
import type { ID, Order, OrderStatus, TrackingEvent } from "@/lib/types";

import { shippingPriceFor, snapshotDelivery } from "./delivery";
import { CACHE_KEYS, invalidateCache } from "@/lib/api/cache";
import { createWorld, type World } from "./seed";

/**
 * The mock backend's memory.
 *
 * One module-level world, hydrated from localStorage in the browser so a
 * placed bid survives a refresh. On the server it is rebuilt per process —
 * which is fine, because every mutable screen fetches through a client
 * component (see the note in README).
 *
 * `syncWorld()` runs before every read and every write: it walks the clock
 * forward, so auctions open and close and parcels move on their own.
 */

let world: World | null = null;
let lastSync = 0;

/* ---------------------------------------------------------------------------
 * Persistence
 * ------------------------------------------------------------------------ */

interface PersistedWorld {
  version: number;
  /** When the world was first seeded, used for the freshness check. */
  seededAt: number;
  world: World;
}

let seededAt = Date.now();

function loadPersisted(): World | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MOCK.STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedWorld;
    if (parsed.version !== MOCK.SCHEMA_VERSION) return null;

    const ageHours = (Date.now() - parsed.seededAt) / 3_600_000;
    if (!Number.isFinite(ageHours) || ageHours > MOCK.MAX_WORLD_AGE_HOURS) {
      return null;
    }

    seededAt = parsed.seededAt;
    return parsed.world;
  } catch {
    // Corrupt or unavailable storage is not worth crashing the app over.
    return null;
  }
}

let persistTimer: number | null = null;

function persist(): void {
  if (typeof window === "undefined" || !world) return;
  if (persistTimer !== null) window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    try {
      const payload: PersistedWorld = {
        version: MOCK.SCHEMA_VERSION,
        seededAt,
        world: world as World,
      };
      window.localStorage.setItem(MOCK.STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Quota exceeded — the demo still works, it just will not survive reload.
    }
  }, 250);
}

/** Wipes the persisted world and reseeds. Exposed through the dev tools. */
export function resetWorld(): void {
  world = createWorld();
  seededAt = Date.now();
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(MOCK.STORAGE_KEY);
  }
  persist();
}

export function getWorld(): World {
  if (!world) {
    const restored = loadPersisted();
    if (restored) {
      world = restored;
    } else {
      world = createWorld();
      seededAt = Date.now();
    }
  }
  syncWorld();
  return world;
}

/** Persist after any mutation. Call at the end of every mock write. */
export function commit(): void {
  persist();
}

/* ---------------------------------------------------------------------------
 * Latency and failure simulation
 * ------------------------------------------------------------------------ */

export function delay(): Promise<void> {
  const span = MOCK.MAX_LATENCY_MS - MOCK.MIN_LATENCY_MS;
  const ms = MOCK.MIN_LATENCY_MS + Math.random() * span;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function maybeFailRead(resource: string): void {
  if (MOCK.READ_FAILURE_RATE <= 0) return;
  if (Math.random() > MOCK.READ_FAILURE_RATE) return;
  throw new ApiError({
    status: 503,
    code: "MOCK_READ_FAILURE",
    message: `Nu am putut încărca ${resource}. Mai încearcă o dată.`,
  });
}

export function notFound(what: string): never {
  throw new ApiError({
    status: 404,
    code: "NOT_FOUND",
    message: `${what} nu a fost găsit.`,
  });
}

export function badRequest(message: string, code = "BAD_REQUEST"): never {
  throw new ApiError({ status: 400, code, message });
}

export function forbidden(message: string): never {
  throw new ApiError({ status: 403, code: "FORBIDDEN", message });
}

let sequence = 0;
export function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}_${Date.now().toString(36)}${sequence.toString(36)}`;
}

/* ---------------------------------------------------------------------------
 * Helpers shared with the api layer
 * ------------------------------------------------------------------------ */

export { snapshotDelivery, shippingPriceFor } from "./delivery";

export function makeAwb(): string {
  const digits = Array.from({ length: 13 }, () =>
    Math.floor(Math.random() * 10),
  ).join("");
  return `${SHIPPING.AWB_PREFIX}${digits}`;
}

export function pushEvent(
  order: Order,
  status: OrderStatus,
  label: string,
  location?: string,
): void {
  const event: TrackingEvent = {
    id: nextId("evt"),
    status,
    label,
    location,
    at: new Date().toISOString(),
  };
  order.trackingEvents = [...order.trackingEvents, event];
  order.status = status;
}

/* ---------------------------------------------------------------------------
 * The clock: everything that happens without a user pressing anything
 * ------------------------------------------------------------------------ */

function secondsSince(iso: string | undefined): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  return (Date.now() - Date.parse(iso)) / 1000;
}

function lastEventAt(order: Order): string | undefined {
  return order.trackingEvents[order.trackingEvents.length - 1]?.at;
}

/**
 * Releases escrow: the donation reaches the cause, the seller gets their net,
 * bid4 keeps its fees. This is the single place where `raisedAmount` moves.
 */
function releaseFunds(current: World, order: Order): void {
  const cause = current.causes.find((item) => item.id === order.causeId);
  if (cause) {
    cause.raisedAmount += order.donationAmount;
    cause.supporterCount += 1;
  }

  for (const userId of [order.buyerId, order.sellerId]) {
    const user = current.users.find((item) => item.id === userId);
    if (user) user.totalRaised += order.donationAmount;
  }

  order.releasedAt = new Date().toISOString();
  // The public totals just moved.
  invalidateCache(CACHE_KEYS.platformStats);

  const buyerName =
    current.users.find((item) => item.id === order.buyerId)?.displayName ?? "";
  const sellerName =
    current.users.find((item) => item.id === order.sellerId)?.displayName ?? "";

  current.invoices.push(
    {
      id: nextId("inv"),
      orderId: order.id,
      orderReference: order.reference,
      type: "DONATION_RECEIPT",
      number: `DON-2026-${Math.floor(Math.random() * 900_000 + 100_000)}`,
      amount: order.donationAmount,
      issuedToUserId: order.buyerId,
      issuedToName: buyerName,
      pdfUrl: `/mock/invoices/${order.id}-donatie.pdf`,
      createdAt: order.releasedAt,
    },
    {
      id: nextId("inv"),
      orderId: order.id,
      orderReference: order.reference,
      type: "SELLER_PAYOUT",
      number: `PLT-2026-${Math.floor(Math.random() * 900_000 + 100_000)}`,
      amount: order.sellerNet,
      issuedToUserId: order.sellerId,
      issuedToName: sellerName,
      pdfUrl: `/mock/invoices/${order.id}-plata.pdf`,
      createdAt: order.releasedAt,
    },
  );
}

/** Settles a finished auction into SOLD (with an order) or UNSOLD. */
function settleAuction(current: World, auctionId: ID): void {
  const auction = current.auctions.find((item) => item.id === auctionId);
  if (!auction) return;

  const auctionBids = current.bids
    .filter((bid) => bid.auctionId === auctionId)
    .sort((a, b) => b.amount - a.amount);
  const top = auctionBids[0];
  const reserveMet =
    auction.reservePrice === undefined ||
    auction.currentPrice >= auction.reservePrice;

  if (!top || !reserveMet) {
    auction.status = "UNSOLD";
    auctionBids.forEach((bid) => {
      bid.status = "LOST";
    });
    return;
  }

  auction.status = "SOLD";
  auction.winnerId = top.bidderId;
  top.status = "WON";
  auctionBids.slice(1).forEach((bid) => {
    bid.status = "LOST";
  });

  const fees = computeFees({
    finalPrice: auction.currentPrice,
    donationPercent: auction.donationPercent,
    shipping: 0,
  });

  current.orders.push({
    id: nextId("ord"),
    reference: `CMD-2026-${Math.floor(Math.random() * 9000 + 1000)}`,
    auctionId: auction.id,
    buyerId: top.bidderId,
    sellerId: auction.sellerId,
    causeId: auction.causeId,
    finalPrice: fees.finalPrice,
    platformTax: fees.buyerTax,
    shipping: 0,
    totalPaid: fees.buyerTotal,
    donationAmount: fees.donationAmount,
    donationPercent: fees.donationPercent,
    sellerFee: fees.sellerFee,
    sellerNet: fees.sellerNet,
    status: "AWAITING_CONFIRMATION",
    trackingEvents: [
      {
        id: nextId("evt"),
        status: "AWAITING_CONFIRMATION",
        label: "Ai câștigat licitația. Confirmă datele de livrare.",
        at: new Date().toISOString(),
      },
    ],
    confirmationDeadline: new Date(
      Date.now() + ORDER.CONFIRMATION_HOURS * 3_600_000,
    ).toISOString(),
    createdAt: new Date().toISOString(),
  });
}

/** Charges the saved card. Mock: mostly succeeds, sometimes declines. */
function chargeOrder(current: World, order: Order): void {
  const declined = Math.random() < MOCK.PAYMENT_FAILURE_RATE;
  if (declined) {
    order.paymentFailureReason =
      "Card refuzat de banca emitentă (fonduri insuficiente).";
    pushEvent(order, "PAYMENT_FAILED", "Plata a fost refuzată de bancă.");
    return;
  }

  order.paidAt = new Date().toISOString();
  pushEvent(
    order,
    "PAID_HELD",
    "Plată autorizată. Fondurile sunt reținute de bid4.",
  );
}

/**
 * Walks the whole world forward to `now`. Cheap and idempotent: it only ever
 * moves things that are genuinely due, and it is throttled to once a second.
 */
export function syncWorld(force = false): void {
  if (!world) return;
  const now = Date.now();
  if (!force && now - lastSync < 1000) return;
  lastSync = now;
  const current = world;
  let changed = false;

  /* --- auctions ------------------------------------------------------- */
  for (const auction of current.auctions) {
    if (auction.status === "SCHEDULED" && now >= Date.parse(auction.startTime)) {
      auction.status = "LIVE";
      changed = true;
    }
    if (auction.status === "LIVE" && now >= Date.parse(auction.endTime)) {
      auction.status = "ENDED";
      settleAuction(current, auction.id);
      changed = true;
    }
  }

  /* --- orders --------------------------------------------------------- */
  for (const order of current.orders) {
    const sinceLastEvent = secondsSince(lastEventAt(order));
    /**
     * Seeded orders are history: their last event is hours old, so they are
     * left alone. Only orders the user has just acted on ride the accelerated
     * courier clock. Deadline-driven transitions below are exempt — those are
     * real timers, not simulation.
     */
    const isLiveSimulation = sinceLastEvent < MOCK.SIMULATION_WINDOW_SECONDS;

    switch (order.status) {
      case "AWAITING_CONFIRMATION": {
        // Deadline passed: auto-confirm with the winner's default method.
        if (
          order.confirmationDeadline &&
          now >= Date.parse(order.confirmationDeadline)
        ) {
          const fallback = current.deliveryMethods.find(
            (method) => method.userId === order.buyerId && method.isDefault,
          );
          if (fallback) {
            order.deliveryMethod = snapshotDelivery(fallback);
            order.shipping = shippingPriceFor(order.deliveryMethod);
            order.totalPaid =
              order.finalPrice + order.platformTax + order.shipping;
            pushEvent(
              order,
              "AWAITING_PAYMENT",
              "Termen expirat. Am folosit metoda de livrare implicită.",
            );
            changed = true;
          }
        }
        break;
      }

      case "AWAITING_PAYMENT": {
        if (isLiveSimulation && sinceLastEvent >= MOCK.AUTO_PAYMENT_DELAY_SECONDS) {
          chargeOrder(current, order);
          changed = true;
        }
        break;
      }

      case "PAID_HELD": {
        if (isLiveSimulation && sinceLastEvent >= MOCK.AUTO_LABEL_DELAY_SECONDS) {
          order.awb = makeAwb();
          order.courier = SHIPPING.SERVICE_NAME;
          order.labelPdfRef = `/mock/labels/${order.reference}.pdf`;
          pushEvent(
            order,
            "LABEL_GENERATED",
            "Etichetă AWB generată. Vânzătorul poate expedia.",
          );
          changed = true;
        }
        break;
      }

      // Once the seller drops the parcel off, the courier moves on its own.
      case "DROPPED_OFF": {
        if (isLiveSimulation && sinceLastEvent >= MOCK.COURIER_STEP_SECONDS) {
          pushEvent(
            order,
            "IN_TRANSIT",
            "Colet în tranzit către destinație.",
            "Hub Chitila",
          );
          changed = true;
        }
        break;
      }

      case "IN_TRANSIT": {
        if (isLiveSimulation && sinceLastEvent >= MOCK.COURIER_STEP_SECONDS) {
          pushEvent(
            order,
            "ARRIVED_AT_LOCKER",
            "Colet disponibil pentru ridicare.",
            order.deliveryMethod?.lockerName,
          );
          changed = true;
        }
        break;
      }

      case "ARRIVED_AT_LOCKER": {
        if (isLiveSimulation && sinceLastEvent >= MOCK.COURIER_STEP_SECONDS * 2) {
          order.deliveredAt = new Date().toISOString();
          order.autoReleaseAt = new Date(
            now + ORDER.AUTO_RELEASE_HOURS * 3_600_000,
          ).toISOString();
          pushEvent(order, "DELIVERED", "Colet ridicat de destinatar.");
          changed = true;
        }
        break;
      }

      case "DELIVERED": {
        // Auto-release when the buyer stays silent past the window.
        if (order.autoReleaseAt && now >= Date.parse(order.autoReleaseAt)) {
          releaseFunds(current, order);
          pushEvent(
            order,
            "COMPLETED",
            "Fonduri eliberate automat: donația către cauză, restul către vânzător.",
          );
          changed = true;
        }
        break;
      }

      default:
        break;
    }
  }

  if (changed) persist();
}

/** Used by the api layer when a user action completes an order. */
export function completeOrder(order: Order, label: string): void {
  const current = getWorld();
  releaseFunds(current, order);
  pushEvent(order, "COMPLETED", label);
  commit();
}
