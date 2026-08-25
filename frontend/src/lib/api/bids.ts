import { USE_MOCK } from "@/lib/config";
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
} from "@/lib/types";

import { http } from "./http";

/** Public bid history is pseudonymised: "Maria I." rather than a full name. */
function shortName(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0] ?? "Ofertant";
  return `${parts[0]} ${parts[1]?.[0] ?? ""}.`;
}

/** GET /auctions/{id}/bids */
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

/**
 * The gate: a bid is a commitment to pay, so the card and the delivery method
 * must already exist. Checked here so every entry point agrees.
 *
 * TODO(backend): this mirrors the server's precondition. The real flow also
 * confirms a Stripe SetupIntent for the saved card before accepting the bid.
 */
export function checkBidEligibility(userId?: ID): BidEligibility {
  if (!userId) {
    return {
      canBid: false,
      hasCard: false,
      hasDelivery: false,
      reason: "Autentifică-te pentru a licita.",
    };
  }

  const world = getWorld();
  const user = world.users.find((item) => item.id === userId);
  const hasCard = Boolean(
    user?.hasPaymentMethod && world.cards.some((card) => card.userId === userId),
  );
  const hasDelivery = world.deliveryMethods.some(
    (method) => method.userId === userId && method.isDefault,
  );

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

/** The smallest amount that would be accepted right now. */
export function minimumBid(auction: {
  currentPrice: number;
  bidIncrement: number;
  bidCount: number;
  startingPrice: number;
}): number {
  // The very first bid may match the starting price exactly.
  return auction.bidCount === 0
    ? auction.startingPrice
    : auction.currentPrice + auction.bidIncrement;
}

/** POST /auctions/{id}/bids */
export async function placeBid(
  payload: PlaceBidPayload,
  bidderId: ID,
): Promise<PlaceBidResult> {
  if (!USE_MOCK) {
    return http<PlaceBidResult>(`/auctions/${payload.auctionId}/bids`, {
      method: "POST",
      body: { amount: payload.amount },
    });
  }

  await delay();
  syncWorld(true);
  const world = getWorld();

  const auction = world.auctions.find((item) => item.id === payload.auctionId);
  if (!auction) notFound("Licitația");

  if (auction.status !== "LIVE") {
    badRequest("Licitația nu mai acceptă oferte.", "AUCTION_NOT_LIVE");
  }
  if (auction.sellerId === bidderId) {
    forbidden("Nu poți licita la propriul anunț.");
  }

  const eligibility = checkBidEligibility(bidderId);
  if (!eligibility.canBid) {
    badRequest(eligibility.reason ?? "Nu poți licita încă.", "BID_NOT_ALLOWED");
  }

  const minimum = minimumBid(auction);
  if (payload.amount < minimum) {
    badRequest(
      `Oferta minimă este ${formatMoney(minimum)}.`,
      "BID_TOO_LOW",
    );
  }

  // One offer per bidder per listing: raising replaces your previous bid
  // instead of stacking a second row onto the history.
  world.bids = world.bids.filter(
    (bid) => !(bid.auctionId === auction.id && bid.bidderId === bidderId),
  );

  // Everyone else's bids drop to OUTBID.
  world.bids
    .filter((bid) => bid.auctionId === auction.id)
    .forEach((bid) => {
      bid.status = "OUTBID";
    });

  /* --- anti-sniping ---------------------------------------------------- */
  const msLeft = Date.parse(auction.endTime) - Date.now();
  const windowMs = auction.antiSnipeSeconds * 1000;
  let extendedBySeconds: number | undefined;

  if (msLeft > 0 && msLeft <= windowMs) {
    auction.endTime = new Date(
      Date.parse(auction.endTime) + windowMs,
    ).toISOString();
    auction.extensionCount += 1;
    extendedBySeconds = auction.antiSnipeSeconds;
  }

  const bid: Bid = {
    id: nextId("bid"),
    auctionId: auction.id,
    bidderId,
    amount: payload.amount,
    createdAt: new Date().toISOString(),
    status: "WINNING",
    triggeredExtension: extendedBySeconds !== undefined,
  };

  world.bids.push(bid);
  auction.currentPrice = payload.amount;
  auction.bidCount = world.bids.filter(
    (item) => item.auctionId === auction.id,
  ).length;
  commit();

  return { bid, auction, extendedBySeconds };
}

export interface MyBidSummary {
  auction: AuctionDetail;
  myTopBid: Bid;
  isWinning: boolean;
}

/** GET /users/me/bids */
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
      isWinning: highest?.bidderId === userId,
    });
  }

  return summaries.sort(
    (a, b) =>
      Date.parse(b.myTopBid.createdAt) - Date.parse(a.myTopBid.createdAt),
  );
}

/**
 * How long before the close a bid can no longer be pulled back.
 * Retracting in the closing moments would be indistinguishable from bid
 * shielding, so the window is locked once anti-sniping territory starts.
 */
export const RETRACT_LOCK_SECONDS = 300;

export interface RetractEligibility {
  canRetract: boolean;
  reason?: string;
}

/** Whether the signed-in user may pull back their current top bid. */
export function checkRetractEligibility(
  auction: { id: ID; status: string; endTime: string },
  viewerId?: ID,
): RetractEligibility {
  if (!viewerId) return { canRetract: false };
  if (auction.status !== "LIVE") {
    return { canRetract: false, reason: "Licitația s-a încheiat." };
  }

  const world = getWorld();
  const auctionBids = world.bids
    .filter((bid) => bid.auctionId === auction.id)
    .sort((a, b) => b.amount - a.amount);

  const top = auctionBids[0];
  if (!top || top.bidderId !== viewerId) {
    return { canRetract: false };
  }

  const secondsLeft = (Date.parse(auction.endTime) - Date.now()) / 1000;
  if (secondsLeft <= RETRACT_LOCK_SECONDS) {
    return {
      canRetract: false,
      reason: "Nu mai poți retrage oferta în ultimele 5 minute.",
    };
  }

  return { canRetract: true };
}

/**
 * DELETE /auctions/{id}/bids/mine
 *
 * Removes the caller's leading bid and rolls the price back to whatever was
 * underneath it. Only the top bid can go: removing one from the middle would
 * rewrite a history other people already acted on.
 */
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
