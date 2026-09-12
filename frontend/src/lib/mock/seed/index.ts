import type {
  Bid,
  Cause,
  CauseDraftRecord,
  DeliveryMethod,
  Dispute,
  ID,
  Invoice,
  Order,
  PaymentMethodCard,
  ThreadItem,
  User,
  Auction,
} from "@/lib/types";

import type {
  MockConversation,
  MockNotification,
} from "@/lib/api/inbox";

import { buildCatalog } from "./catalog";
import { buildInbox } from "./inbox";
import { buildCauses } from "./causes";
import { buildOrders } from "./orders";
import {
  buildCards,
  buildDeliveryMethods,
  buildExtraDeliveryMethods,
  buildUsers,
} from "./users";

export { DEMO_PASSWORD, FEATURED_ACCOUNT_IDS } from "./users";

/** Everything the mock backend knows. One object, easy to snapshot and reset. */
export interface World {
  users: User[];
  deliveryMethods: DeliveryMethod[];
  cards: PaymentMethodCard[];
  causes: Cause[];
  auctions: Auction[];
  bids: Bid[];
  orders: Order[];
  invoices: Invoice[];
  disputes: Dispute[];
  /** auctionIds the user follows. */
  watchlist: { userId: ID; auctionId: ID }[];
  /** Half-finished cause applications, one per organiser. */
  causeDrafts: CauseDraftRecord[];
  /** One per (listing, buyer). Empty until somebody writes. */
  conversations: MockConversation[];
  /** Flat, and carrying the thread they belong to — the wire shape does not need it. */
  threadItems: (ThreadItem & { conversationId: ID })[];
  notifications: MockNotification[];
}

export function createWorld(): World {
  const users = buildUsers();
  const deliveryMethods = [
    ...buildDeliveryMethods(users),
    ...buildExtraDeliveryMethods(),
  ];
  const cards = buildCards(users);
  const causes = buildCauses();
  const { auctions, bids, orderTargets } = buildCatalog();

  const displayNameOf = (userId: ID) =>
    users.find((user) => user.id === userId)?.displayName ?? "Utilizator bid4";

  const { orders, invoices, disputes } = buildOrders({
    auctions,
    deliveryMethods,
    orderTargets,
    displayNameOf,
  });

  const { conversations, threadItems, notifications } = buildInbox({
    orders,
    auctions,
    causes,
  });

  // A starter watchlist for the demo buyer, so the dashboard is never empty.
  const watchlist = [
    { userId: "usr_maria", auctionId: "auc_ilustratie" },
    { userId: "usr_maria", auctionId: "auc_lego" },
    { userId: "usr_maria", auctionId: "auc_cort" },
    { userId: "usr_ioana", auctionId: "auc_canon" },
  ];

  return {
    users,
    deliveryMethods,
    cards,
    causes,
    auctions,
    bids,
    orders,
    invoices,
    disputes,
    watchlist,
    causeDrafts: [],
    // Every seeded sale gets the conversation it would have had. A demo where
    // the threads are empty shows none of what the inbox is for.
    conversations,
    threadItems,
    notifications,
  };
}
