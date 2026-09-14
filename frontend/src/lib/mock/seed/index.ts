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
  watchlist: { userId: ID; auctionId: ID }[];
  causeDrafts: CauseDraftRecord[];
  conversations: MockConversation[];
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
    conversations,
    threadItems,
    notifications,
  };
}
