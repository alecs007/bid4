import type { Auction, Cause, ID, Order, ThreadItem } from "@/lib/types";
import type { MockConversation, MockNotification } from "@/lib/api/inbox";

/**
 * A conversation for every sale the demo world already has, with the steps that got it there.
 *
 * <p>The point of the whole design is that the questions and the deal are one stream, and a demo
 * where every thread is empty shows none of it. Each seeded order gets the thread it would have
 * had: a question before the sale, the answer, then one card per step up to wherever that order
 * actually is.
 *
 * <p>The steps are derived from the order's status rather than listed per order, so a status added
 * to the seed grows the right thread without anybody remembering to come back here.
 */

/** The journey, in order, with the status each step was written under. */
const JOURNEY: { event: string; status: Order["status"] }[] = [
  { event: "OFFER_ACCEPTED", status: "AWAITING_CONFIRMATION" },
  { event: "DELIVERY_CHOSEN", status: "AWAITING_PAYMENT" },
  { event: "PAYMENT_HELD", status: "PAID_HELD" },
  { event: "LABEL_READY", status: "LABEL_GENERATED" },
  { event: "SHIPPED", status: "DROPPED_OFF" },
  { event: "DELIVERED", status: "DELIVERED" },
  { event: "RELEASED", status: "COMPLETED" },
];

/** How far along a status is, so a thread stops where its order stopped. */
const REACHED: Partial<Record<Order["status"], number>> = {
  AWAITING_CONFIRMATION: 1,
  AWAITING_PAYMENT: 2,
  PAYMENT_FAILED: 2,
  PAID_HELD: 3,
  LABEL_GENERATED: 4,
  DROPPED_OFF: 5,
  IN_TRANSIT: 5,
  ARRIVED_AT_LOCKER: 5,
  DELIVERED: 6,
  DISPUTE_OPEN: 6,
  COMPLETED: 7,
  // Ended threads keep everything that got them there; the card that ends them
  // is appended after the journey rather than being part of it.
  DISPUTE_RESOLVED: 7,
  REFUNDED: 7,
  CANCELLED: 2,
};

/** The card that closes a thread whose sale did not end in a handover. */
const ENDING: Partial<Record<Order["status"], string>> = {
  DISPUTE_OPEN: "DISPUTE_OPENED",
  CANCELLED: "CANCELLED",
};

/** The statuses where the sale is waiting on the buyer, and so the badge should be lit. */
const BUYER_IS_UP = new Set<Order["status"]>([
  "AWAITING_CONFIRMATION",
  "AWAITING_PAYMENT",
  "DELIVERED",
]);

export interface InboxSeed {
  conversations: MockConversation[];
  threadItems: (ThreadItem & { conversationId: ID })[];
  notifications: MockNotification[];
}

export function buildInbox({
  orders,
  auctions,
  causes,
}: {
  orders: Order[];
  auctions: Auction[];
  /** So a card can name the cause it gives to rather than calling it "cauza". */
  causes: Cause[];
}): InboxSeed {
  const conversations: MockConversation[] = [];
  const threadItems: (ThreadItem & { conversationId: ID })[] = [];
  const notifications: MockNotification[] = [];

  orders.forEach((order, index) => {
    const listing = auctions.find((item) => item.id === order.auctionId);
    if (!listing) return;

    const conversationId = `conv_seed_${index}`;
    // Spaced so the list has an order to sort by, oldest sale furthest down.
    const opened = new Date(order.createdAt).getTime();
    let step = 0;
    const at = () =>
      new Date(opened + step++ * 7 * 60_000).toISOString();

    conversations.push({
      id: conversationId,
      kind: "LISTING",
      listingId: listing.id,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      orderId: order.id,
      archived: false,
      muted: false,
      // A step that arrived and was not read yet. Seeded only where the sale is
      // actually waiting on the buyer, so the badge means the same thing in the
      // demo as it does in the real thing.
      unread: BUYER_IS_UP.has(order.status) ? { [order.buyerId]: 1 } : {},
      lastItemAt: order.createdAt,
    });

    const say = (senderId: ID, body: string) =>
      threadItems.push({
        conversationId,
        id: `item_seed_${threadItems.length}`,
        kind: "TEXT",
        senderId,
        mine: false,
        body,
        imageUrls: [],
        createdAt: at(),
      });

    say(order.buyerId, "Bună ziua! Mai este disponibil?");
    say(order.sellerId, "Bună ziua! Da, este disponibil.");

    const event = (eventType: string, payload: Record<string, string>) =>
      threadItems.push({
        conversationId,
        id: `item_seed_${threadItems.length}`,
        kind: "EVENT",
        mine: false,
        imageUrls: [],
        eventType,
        payload,
        createdAt: at(),
      });

    // How the sale was arrived at, which is what the seller actually watched
    // happen. Every other thread also shows the offer being raised, so both the
    // single-offer and the bidding case are somewhere in the demo.
    const opening = Math.round(order.finalPrice * 0.8);
    event("OFFER_PLACED", { amount: String(opening) });
    if (index % 2 === 0) {
      event("OFFER_RAISED", {
        previous: String(opening),
        amount: String(order.finalPrice),
      });
    }

    JOURNEY.slice(0, REACHED[order.status] ?? 1).forEach(
      ({ event, status }) => {
        threadItems.push({
          conversationId,
          id: `item_seed_${threadItems.length}`,
          kind: "EVENT",
          mine: false,
          imageUrls: [],
          eventType: event,
          orderStatus: status,
          payload: payloadFor(event, order, causes),
          createdAt: at(),
        });
      },
    );

    const ending = ENDING[order.status];
    if (ending) {
      threadItems.push({
        conversationId,
        id: `item_seed_${threadItems.length}`,
        kind: "EVENT",
        mine: false,
        imageUrls: [],
        eventType: ending,
        orderStatus: order.status,
        payload:
          ending === "DISPUTE_OPENED"
            ? { reason: "Produsul nu corespunde descrierii." }
            : {},
        createdAt: at(),
      });
    }

    const last = threadItems[threadItems.length - 1];
    if (last) {
      conversations[conversations.length - 1]!.lastItemAt = last.createdAt;
    }
  });

  // One thread that never became a sale: an offer sent, then withdrawn. Every
  // other seeded conversation ends in an acceptance, so without this the demo
  // never shows what a seller sees when a buyer changes their mind.
  // One of the demo account's own listings, so this lands in the inbox the demo
  // is read from rather than in a stranger's.
  const walkedAway = auctions.find(
    (item) =>
      item.sellerId === "usr_maria" &&
      !orders.some((order) => order.auctionId === item.id),
  );
  if (walkedAway) {
    const id = "conv_seed_withdrawn";
    const opened = Date.now() - 9 * 60 * 60 * 1000;
    const buyerId = "usr_vlad";
    let tick = 0;
    const at = () => new Date(opened + tick++ * 6 * 60_000).toISOString();

    conversations.push({
      id,
      kind: "LISTING",
      listingId: walkedAway.id,
      buyerId,
      sellerId: walkedAway.sellerId,
      archived: false,
      muted: false,
      unread: { [walkedAway.sellerId]: 1 },
      lastItemAt: new Date(opened).toISOString(),
    });

    const push = (item: Partial<ThreadItem> & { kind: ThreadItem["kind"] }) =>
      threadItems.push({
        conversationId: id,
        id: `item_seed_${threadItems.length}`,
        mine: false,
        imageUrls: [],
        createdAt: at(),
        ...item,
      } as ThreadItem & { conversationId: ID });

    push({
      kind: "TEXT",
      senderId: buyerId,
      body: "Bună ziua! Aș dori să fac o ofertă.",
    });
    push({ kind: "EVENT", eventType: "OFFER_PLACED", payload: { amount: "18000" } });
    push({
      kind: "EVENT",
      eventType: "OFFER_RAISED",
      payload: { previous: "18000", amount: "21500" },
    });
    push({
      kind: "TEXT",
      senderId: buyerId,
      body: "Îmi cer scuze, am găsit între timp altceva. Retrag oferta.",
    });
    push({
      kind: "EVENT",
      eventType: "OFFER_WITHDRAWN",
      payload: { amount: "21500" },
    });

    const last = threadItems[threadItems.length - 1];
    if (last) {
      conversations[conversations.length - 1]!.lastItemAt = last.createdAt;
    }
  }

  // A handful for the other tab. Pointers, exactly as the server writes them —
  // the sentence is built in the client from the type and these values.
  orders.slice(0, 4).forEach((order, index) => {
    const listing = auctions.find((item) => item.id === order.auctionId);
    if (!listing) return;
    notifications.push({
      id: `notif_seed_${index}`,
      userId: order.buyerId,
      type: "OFFER_ACCEPTED",
      payload: { listing: listing.title },
      deepLink: `/cont/inbox/conv_seed_${index}`,
      read: index > 1,
      createdAt: order.createdAt,
    });
  });

  return { conversations, threadItems, notifications };
}

/** The frozen snapshot each card shows, exactly as the server writes it. */
function payloadFor(
  event: string,
  order: Order,
  causes: Cause[],
): Record<string, string> {
  switch (event) {
    case "OFFER_ACCEPTED":
      return {
        price: String(order.finalPrice),
        donation: String(order.donationAmount),
        donationPercent: String(order.donationPercent),
        cause: causes.find((item) => item.id === order.causeId)?.name ?? "",
      };
    case "DELIVERY_CHOSEN":
      return {
        // The method, not the locker. See the card's own note. Off the snapshot's
        // own type rather than guessed from whether a locker name happens to be
        // set, which said HOME_COURIER for any locker saved without one.
        method: order.deliveryMethod?.type ?? "EASYBOX",
        shipping: String(order.shipping),
        total: String(order.totalPaid),
      };
    case "PAYMENT_HELD":
      return { total: String(order.totalPaid) };
    case "LABEL_READY":
      return { courier: order.courier ?? "Sameday", awb: order.awb ?? "" };
    case "SHIPPED":
      return { awb: order.awb ?? "" };
    case "RELEASED":
      return {
        donation: String(order.donationAmount),
        sellerShare: String(order.sellerShare),
        cause: causes.find((item) => item.id === order.causeId)?.name ?? "",
      };
    case "DISPUTE_RESOLVED":
      // The seeded world settles in the buyer's favour, because a refund is the
      // outcome with a figure on both sides of it.
      return {
        outcome: "REFUND",
        total: String(order.totalPaid),
        note: "Coletul nu corespundea descrierii din anunț.",
      };
    case "CANCELLED":
      return { by: "BUYER" };
    default:
      return {};
  }
}
