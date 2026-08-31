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
  User,
} from "@/lib/types";
import { isOfferable } from "@/lib/types";

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
 * TODO(backend): the real flow also confirms a Stripe SetupIntent for the saved
 * card before accepting the bid.
 */
/**
 * The gate: a bid is a commitment to pay, so the card and the delivery method
 * must already exist. Read off the session user, which carries both flags, so
 * this answers the same way against the mock layer and against the API — and
 * the server enforces it again either way, because a gate only the UI knows
 * about is not a gate.
 */
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

  // Reserved still takes offers: the seller can release an acceptance, so a
  // better offer arriving during the wait is worth making.
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

  // The final price is settled before the increment is enforced. A seller who
  // names a price they would simply accept has made an offer to the room, and a
  // step that happens to reach over it must not put it out of range: with a 50
  // lei step on a 100 lei standing offer, a 120 lei final price would otherwise
  // be unreachable in either direction.
  // Buy-now cannot take the item over the top of a buyer the seller has already
  // accepted, so it is only on the table while the listing is genuinely open.
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

  // One offer per bidder: raising replaces your previous bid, it does not stack.
  world.bids = world.bids.filter(
    (bid) => !(bid.auctionId === auction.id && bid.bidderId === bidderId),
  );

  // Everyone else's bids drop a place — except the one the seller has already
  // accepted, which would otherwise be undone by a stranger's offer.
  world.bids
    .filter(
      (bid) => bid.auctionId === auction.id && bid.status !== "ACCEPTED",
    )
    .forEach((bid) => {
      bid.status = "OUTBID";
    });

  // Settled at the advertised price, never at whatever was typed: the number on
  // the page is what the buyer agreed to, and charging more for a fat finger
  // would be indefensible.
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
    // Reserved rather than sold: the seller published this price and is bound
    // by it, so no acceptance is needed — but nobody has paid yet, and SOLD is
    // kept for money that has actually arrived.
    auction.status = "RESERVED";
    auction.winnerId = bidderId;
    auction.acceptedAt = now;
  }
  commit();

  return { bid, auction, boughtNow: boughtNow || undefined };
}

/**
 * GET /users/me/auctions/{id}/offers — every offer on one of the seller's own listings.
 *
 * The listing that does not close on a timer needs this: the seller reads what has been offered
 * and picks, so they have to see all of it, highest first, with a name against each one. The
 * public history on the listing page shortens those names because it is read by strangers; the
 * person deciding who to sell to is not a stranger, and gets what any public profile shows.
 */
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
  // Not found rather than forbidden: whether somebody else's listing exists is
  // not something this caller gets to confirm.
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
      // Accepted counts as ahead: the seller has chosen this offer, and telling
      // its bidder they are losing would be the opposite of what happened.
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

/**
 * Whether the signed-in user may pull back their current top offer.
 *
 * The bar used to be the clock: retracting in the closing minutes was indistinguishable from bid
 * shielding. There are no closing minutes now, so the bar is the acceptance instead — pulling an
 * offer out from under a seller who has taken it is not a retraction, it is a broken deal.
 */
export function checkRetractEligibility(
  auction: Pick<AuctionDetail, "status" | "viewerBidStatus" | "winnerId">,
  viewerId?: ID,
): RetractEligibility {
  if (!viewerId) return { canRetract: false };
  if (!isOfferable(auction.status)) {
    return { canRetract: false, reason: "Anunțul nu mai acceptă modificări." };
  }
  // The one offer nobody may pull: walking away from an accepted offer is
  // breaking a deal, not withdrawing from one.
  if (auction.status === "RESERVED" && auction.winnerId === viewerId) {
    return {
      canRetract: false,
      reason: "Oferta ta a fost acceptată, așa că nu mai poate fi retrasă.",
    };
  }
  // Where the viewer stands already travels with the auction, so this needs no
  // second source of truth and works identically against the API.
  if (auction.viewerBidStatus !== "WINNING") {
    return { canRetract: false };
  }

  return { canRetract: true };
}

/**
 * DELETE /auctions/{id}/bids/mine
 *
 * Only the top bid can go: removing one from the middle would rewrite a history
 * other people already acted on.
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
