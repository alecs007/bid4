import type {
  Auction,
  AuctionDetail,
  Cause,
  CauseDetail,
  Dispute,
  DisputeDetail,
  ID,
  Order,
  OrderDetail,
  PublicUser,
  User,
} from "@/lib/types";

import { getWorld } from "./store";

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    displayName: user.displayName,
    username: user.username,
    accountType: user.accountType,
    orgLegalName: user.orgLegalName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    city: user.city,
    createdAt: user.createdAt,
    rating: user.rating,
    ratingCount: user.ratingCount,
    totalRaised: user.totalRaised,
  };
}

export function publicUserById(userId: ID): PublicUser {
  const world = getWorld();
  const user = world.users.find((item) => item.id === userId);
  return user
    ? toPublicUser(user)
    : {
        id: userId,
        displayName: "Utilizator bid4",
        username: "utilizator",
        accountType: "INDIVIDUAL",
        avatarUrl: "",
        bio: "",
        createdAt: new Date().toISOString(),
        rating: 0,
        ratingCount: 0,
        totalRaised: 0,
      };
}

export function toAuctionDetail(
  auction: Auction,
  viewerId?: ID,
): AuctionDetail | null {
  const world = getWorld();
  const cause = world.causes.find((item) => item.id === auction.causeId);
  const seller = world.users.find((item) => item.id === auction.sellerId);
  if (!cause || !seller) return null;

  const viewerBids = viewerId
    ? world.bids.filter(
        (bid) => bid.auctionId === auction.id && bid.bidderId === viewerId,
      )
    : [];
  const revealsWinner =
    viewerId !== undefined &&
    (viewerId === auction.sellerId || viewerId === auction.winnerId);

  return {
    ...auction,
    winnerId: revealsWinner ? auction.winnerId : undefined,
    seller: toPublicUser(seller),
    cause: {
      id: cause.id,
      name: cause.name,
      slug: cause.slug,
      shortDescription: cause.shortDescription,
      imageUrl: cause.imageUrl,
      category: cause.category,
      goalAmount: cause.goalAmount,
      raisedAmount: cause.raisedAmount,
      status: cause.status,
    },
    reserveMet:
      auction.reservePrice === undefined ||
      auction.currentPrice >= auction.reservePrice,
    isWatched: viewerId
      ? world.watchlist.some(
          (entry) => entry.userId === viewerId && entry.auctionId === auction.id,
        )
      : undefined,
    viewerBidAmount: viewerBids[0]?.amount,
    viewerBidStatus: !viewerId
      ? undefined
      : !viewerBids[0]
        ? "NONE"
        : viewerBids[0].status === "ACCEPTED" || viewerBids[0].status === "WON"
          ? "ACCEPTED"
          : viewerBids[0].status === "WINNING"
            ? "WINNING"
            : "OUTBID",
  };
}

export function toCauseDetail(cause: Cause): CauseDetail {
  const world = getWorld();
  const organizer = publicUserById(cause.organizerId);
  const activeAuctionCount = world.auctions.filter(
    (auction) =>
      auction.causeId === cause.id &&
      (auction.status === "LIVE" || auction.status === "RESERVED"),
  ).length;

  return { ...cause, organizer, activeAuctionCount };
}

export function toOrderDetail(order: Order): OrderDetail | null {
  const world = getWorld();
  const auction = world.auctions.find((item) => item.id === order.auctionId);
  const cause = world.causes.find((item) => item.id === order.causeId);
  if (!auction || !cause) return null;

  return {
    ...order,
    auction: { id: auction.id, title: auction.title, images: auction.images },
    buyer: publicUserById(order.buyerId),
    seller: publicUserById(order.sellerId),
    cause: {
      id: cause.id,
      name: cause.name,
      slug: cause.slug,
      imageUrl: cause.imageUrl,
    },
    hasOpenDispute: world.disputes.some(
      (dispute) =>
        dispute.orderId === order.id &&
        (dispute.status === "OPEN" || dispute.status === "UNDER_REVIEW"),
    ),
  };
}

export function toDisputeDetail(dispute: Dispute): DisputeDetail | null {
  const world = getWorld();
  const order = world.orders.find((item) => item.id === dispute.orderId);
  if (!order) return null;
  const auction = world.auctions.find((item) => item.id === order.auctionId);

  return {
    ...dispute,
    buyer: publicUserById(order.buyerId),
    seller: publicUserById(order.sellerId),
    operator: dispute.operatorId
      ? publicUserById(dispute.operatorId)
      : undefined,
    orderTotal: order.totalPaid,
    itemTitle: auction?.title ?? "Obiect",
    itemImage: auction?.images[0] ?? "",
  };
}
