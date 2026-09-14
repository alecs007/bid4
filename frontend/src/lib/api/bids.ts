import { TERMS, USE_MOCK } from "@/lib/config";
import { formatMoney } from "@/lib/money";
import { toAuctionDetail } from "@/lib/mock/join";
import {
  badRequest,
  commit,
  delay,
  forbidden,
  getWorld,
  maybeFailRead,
  nextId,
  notFound,
  syncWorld,
} from "@/lib/mock/store";
import type {
  Auction,
  AuctionDetail,
  Bid,
  BidWithBidder,
  ID,
  PlaceBidPayload,
  PlaceBidResult,
  User,
} from "@/lib/types";
import { isOfferable } from "@/lib/types";

import { http } from "./http";

function shortName(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0] ?? "Ofertant";
  return `${parts[0]} ${parts[1]?.[0] ?? ""}.`;
}

export async function listBids(auctionId: ID): Promise<BidWithBidder[]> {
  if (!USE_MOCK) return http<BidWithBidder[]>(`/auctions/${auctionId}/bids`);

  await delay();
  maybeFailRead("istoricul ofertelor");
  const world = getWorld();

  return world.bids
    .filter((bid) => bid.auctionId === auctionId)
    .sort((a, b) => b.amount - a.amount)
    .map((bid) => {
      const bidder = world.users.find((user) => user.id === bid.bidderId);
      return {
        ...bid,
        bidderDisplayName: shortName(bidder?.displayName ?? "Ofertant"),
        bidderAvatarUrl: bidder?.avatarUrl ?? "",
        bidderUsername: bidder?.username ?? "",
      };
    });
}

export interface BidEligibility {
  canBid: boolean;
  hasCard: boolean;
  hasDelivery: boolean;
  reason?: string;
}

// TODO(backend): confirm the saved card's Stripe SetupIntent before accepting a bid.
export function checkBidEligibility(user?: User | null): BidEligibility {
  if (!user) {
    return {
      canBid: false,
      hasCard: false,
      hasDelivery: false,
      reason: "Autentifică-te pentru a licita.",
    };
  }

  const hasCard = Boolean(user.hasPaymentMethod);
  const hasDelivery = Boolean(user.defaultDeliveryMethodId);

  if (!hasCard && !hasDelivery) {
    return {
      canBid: false,
      hasCard,
      hasDelivery,
      reason: "Adaugă un card și o metodă de livrare pentru a licita.",
    };
  }
  if (!hasCard) {
    return {
      canBid: false,
      hasCard,
      hasDelivery,
      reason: "Adaugă un card salvat pentru a licita.",
    };
  }
  if (!hasDelivery) {
    return {
      canBid: false,
      hasCard,
      hasDelivery,
      reason: "Alege o metodă de livrare implicită pentru a licita.",
    };
  }
  return { canBid: true, hasCard, hasDelivery };
}

export function minimumBid(auction: {
  currentPrice: number;
  bidIncrement: number;
  bidCount: number;
  startingPrice: number;
}): number {
  return auction.bidCount === 0
    ? auction.startingPrice
    : auction.currentPrice + auction.bidIncrement;
}

export async function placeBid(
  payload: PlaceBidPayload,
  bidderId: ID,
): Promise<PlaceBidResult> {
  if (!USE_MOCK) {
    return http<PlaceBidResult>(`/auctions/${payload.auctionId}/bids`, {
      method: "POST",
      body: {
        amount: payload.amount,
        acceptedTermsVersion: payload.acceptedTermsVersion,
      },
    });
  }

  await delay();
  syncWorld(true);
  const world = getWorld();

  if (payload.acceptedTermsVersion !== TERMS.VERSION) {
    badRequest(
      "Trebuie să accepți condițiile de licitare pentru a trimite o ofertă.",
      "TERMS_REQUIRED",
    );
  }

  const auction = world.auctions.find((item) => item.id === payload.auctionId);
  if (!auction) notFound("Licitația");

  if (!isOfferable(auction.status)) {
    badRequest("Anunțul nu mai acceptă oferte.", "AUCTION_NOT_LIVE");
  }
  if (auction.sellerId === bidderId) {
    forbidden("Nu poți licita la propriul anunț.");
  }

  const eligibility = checkBidEligibility(
    world.users.find((item) => item.id === bidderId),
  );
  if (!eligibility.canBid) {
    badRequest(eligibility.reason ?? "Nu poți licita încă.", "BID_NOT_ALLOWED");
  }

  const boughtNow =
    auction.status === "LIVE" &&
    auction.buyNowPrice !== undefined &&
    payload.amount >= auction.buyNowPrice;

  const minimum = minimumBid(auction);
  if (!boughtNow && payload.amount < minimum) {
    badRequest(
      `Oferta minimă este ${formatMoney(minimum)}.`,
      "BID_TOO_LOW",
    );
  }

  world.bids = world.bids.filter(
    (bid) => !(bid.auctionId === auction.id && bid.bidderId === bidderId),
  );

  world.bids
    .filter(
      (bid) => bid.auctionId === auction.id && bid.status !== "ACCEPTED",
    )
    .forEach((bid) => {
      bid.status = "OUTBID";
    });

  const price = boughtNow ? auction.buyNowPrice! : payload.amount;
  const now = new Date().toISOString();

  const bid: Bid = {
    id: nextId("bid"),
    auctionId: auction.id,
    bidderId,
    amount: price,
    createdAt: now,
    status: boughtNow ? "ACCEPTED" : "WINNING",
  };

  world.bids.push(bid);
  auction.currentPrice = price;
  auction.bidCount = world.bids.filter(
    (item) => item.auctionId === auction.id,
  ).length;

  if (boughtNow) {
    world.bids
      .filter((item) => item.auctionId === auction.id && item.id !== bid.id)
      .forEach((item) => {
        item.status = "LOST";
      });
    auction.status = "RESERVED";
    auction.winnerId = bidderId;
    auction.acceptedAt = now;
  }
  commit();

  return { bid, auction, boughtNow: boughtNow || undefined };
}

export async function listOffersOnMyAuction(
  auctionId: ID,
  userId: ID,
): Promise<BidWithBidder[]> {
  if (!USE_MOCK) {
    return http<BidWithBidder[]>(`/users/me/auctions/${auctionId}/offers`);
  }

  await delay();
  maybeFailRead("ofertele primite");
  const world = getWorld();

  const auction = world.auctions.find((item) => item.id === auctionId);
  if (!auction || auction.sellerId !== userId) notFound("Licitația");

  return world.bids
    .filter((bid) => bid.auctionId === auctionId)
    .sort((a, b) => b.amount - a.amount)
    .map((bid) => {
      const bidder = world.users.find((user) => user.id === bid.bidderId);
      return {
        ...bid,
        bidderDisplayName: bidder?.displayName ?? "Ofertant",
        bidderAvatarUrl: bidder?.avatarUrl ?? "",
        bidderUsername: bidder?.username ?? "",
      };
    });
}

export interface MyBidSummary {
  auction: AuctionDetail;
  myTopBid: Bid;
  isWinning: boolean;
}

export async function listMyBids(userId: ID): Promise<MyBidSummary[]> {
  if (!USE_MOCK) return http<MyBidSummary[]>("/users/me/bids");

  await delay();
  maybeFailRead("ofertele tale");
  const world = getWorld();

  const byAuction = new Map<ID, Bid>();
  for (const bid of world.bids) {
    if (bid.bidderId !== userId) continue;
    const existing = byAuction.get(bid.auctionId);
    if (!existing || bid.amount > existing.amount) byAuction.set(bid.auctionId, bid);
  }

  const summaries: MyBidSummary[] = [];
  for (const [auctionId, myTopBid] of byAuction) {
    const auction = world.auctions.find((item) => item.id === auctionId);
    if (!auction) continue;
    const detail = toAuctionDetail(auction, userId);
    if (!detail) continue;

    const highest = world.bids
      .filter((bid) => bid.auctionId === auctionId)
      .sort((a, b) => b.amount - a.amount)[0];

    summaries.push({
      auction: detail,
      myTopBid,
      isWinning:
        myTopBid.status === "ACCEPTED" ||
        myTopBid.status === "WON" ||
        highest?.bidderId === userId,
    });
  }

  return summaries.sort(
    (a, b) =>
      Date.parse(b.myTopBid.createdAt) - Date.parse(a.myTopBid.createdAt),
  );
}

export interface RetractEligibility {
  canRetract: boolean;
  reason?: string;
}

export function checkRetractEligibility(
  auction: Pick<AuctionDetail, "status" | "viewerBidStatus" | "winnerId">,
  viewerId?: ID,
): RetractEligibility {
  if (!viewerId) return { canRetract: false };
  if (!isOfferable(auction.status)) {
    return { canRetract: false, reason: "Anunțul nu mai acceptă modificări." };
  }
  if (auction.status === "RESERVED" && auction.winnerId === viewerId) {
    return {
      canRetract: false,
      reason: "Oferta ta a fost acceptată, așa că nu mai poate fi retrasă.",
    };
  }
  if (auction.viewerBidStatus !== "WINNING") {
    return { canRetract: false };
  }

  return { canRetract: true };
}

export async function retractBid(
  auctionId: ID,
  bidderId: ID,
): Promise<{ auction: Auction }> {
  if (!USE_MOCK) {
    return http<{ auction: Auction }>(`/auctions/${auctionId}/bids/mine`, {
      method: "DELETE",
    });
  }

  await delay();
  syncWorld(true);
  const world = getWorld();

  const auction = world.auctions.find((item) => item.id === auctionId);
  if (!auction) notFound("Licitația");

  const eligibility = checkRetractEligibility(auction, bidderId);
  if (!eligibility.canRetract) {
    badRequest(
      eligibility.reason ?? "Poți retrage doar propria ofertă aflată pe primul loc.",
      "RETRACT_NOT_ALLOWED",
    );
  }

  const ordered = world.bids
    .filter((bid) => bid.auctionId === auctionId)
    .sort((a, b) => b.amount - a.amount);

  const [top, previous] = ordered;
  if (!top) badRequest("Nu ai nicio ofertă de retras.");

  world.bids = world.bids.filter((bid) => bid.id !== top.id);
  auction.bidCount = Math.max(0, auction.bidCount - 1);
  auction.currentPrice = previous ? previous.amount : auction.startingPrice;
  if (previous) previous.status = "WINNING";

  commit();
  return { auction };
}
