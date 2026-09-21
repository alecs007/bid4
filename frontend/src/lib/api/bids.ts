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
  openOrderForAcceptance,
  rebalanceBids,
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
import { isOfferable } from "@/lib/types";

import { http } from "./http";
import { recordOfferEvent } from "./inbox";

function shortName(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0] ?? "Ofertant";
  return `${parts[0]} ${parts[1]?.[0] ?? ""}.`;
}

function aliasOf(auctionId: ID, bidderId: ID): string {
  let value = 2166136261;
  for (const char of `${auctionId}:${bidderId}`) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return (value >>> 0).toString(16).padStart(8, "0");
}

export async function listBids(
  auctionId: ID,
  viewerId?: ID,
): Promise<BidWithBidder[]> {
  if (!USE_MOCK) return http<BidWithBidder[]>(`/auctions/${auctionId}/bids`);

  await delay();
  maybeFailRead("istoricul ofertelor");
  const world = getWorld();

  const auction = world.auctions.find((item) => item.id === auctionId);
  const seller = Boolean(viewerId) && auction?.sellerId === viewerId;

  return world.bids
    .filter((bid) => bid.auctionId === auctionId)
    .sort((a, b) => b.amount - a.amount)
    .map((bid): BidWithBidder => {
      const mine = Boolean(viewerId) && bid.bidderId === viewerId;
      const alias = aliasOf(auctionId, bid.bidderId);
      if (!seller && !mine) {
        return {
          id: bid.id,
          auctionId: bid.auctionId,
          amount: bid.amount,
          createdAt: bid.createdAt,
          status: bid.status === "WINNING" ? "WINNING" : "OUTBID",
          mine: false,
          alias,
        };
      }
      const bidder = world.users.find((user) => user.id === bid.bidderId);
      return {
        ...bid,
        mine,
        alias,
        bidderDisplayName: shortName(bidder?.displayName ?? "Ofertant"),
        bidderAvatarUrl: bidder?.avatarUrl ?? "",
        bidderUsername: bidder?.username ?? "",
      };
    });
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

  const boughtNow =
    auction.buyNowPrice !== undefined && payload.amount >= auction.buyNowPrice;

  const minimum = minimumBid(auction);
  if (!boughtNow && payload.amount < minimum) {
    badRequest(
      `Oferta minimă este ${formatMoney(minimum)}.`,
      "BID_TOO_LOW",
    );
  }

  const previous = world.bids.find(
    (bid) => bid.auctionId === auction.id && bid.bidderId === bidderId,
  );
  if (previous?.status === "ACCEPTED") {
    badRequest(
      "Oferta ta a fost acceptată. Finalizează comanda din conversație.",
      "CONFLICT",
    );
  }
  world.bids = world.bids.filter((bid) => bid !== previous);

  const price = boughtNow ? auction.buyNowPrice! : payload.amount;
  const bid: Bid = {
    id: nextId("bid"),
    auctionId: auction.id,
    bidderId,
    amount: price,
    createdAt: new Date().toISOString(),
    status: boughtNow ? "ACCEPTED" : "OUTBID",
  };
  world.bids.push(bid);
  rebalanceBids(world, auction);

  recordOfferEvent(
    auction.id,
    bidderId,
    auction.sellerId,
    previous ? "OFFER_RAISED" : "OFFER_PLACED",
    previous
      ? { previous: String(previous.amount), amount: String(price) }
      : { amount: String(price) },
  );
  if (boughtNow) openOrderForAcceptance(auction.id, bidderId);
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
  if (
    auction.viewerBidStatus !== "WINNING" &&
    auction.viewerBidStatus !== "OUTBID"
  ) {
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

  if (!isOfferable(auction.status)) {
    badRequest("Anunțul nu mai acceptă modificări.", "RETRACT_NOT_ALLOWED");
  }

  const mine = world.bids.find(
    (bid) => bid.auctionId === auctionId && bid.bidderId === bidderId,
  );
  if (!mine) {
    badRequest("Nu ai o ofertă activă la acest anunț.", "RETRACT_NOT_ALLOWED");
  }
  if (mine.status === "ACCEPTED" || mine.status === "WON") {
    badRequest(
      "Oferta ta a fost acceptată, așa că nu mai poate fi retrasă.",
      "RETRACT_NOT_ALLOWED",
    );
  }

  world.bids = world.bids.filter((bid) => bid.id !== mine.id);
  rebalanceBids(world, auction);
  recordOfferEvent(auction.id, bidderId, auction.sellerId, "OFFER_WITHDRAWN", {
    amount: String(mine.amount),
  });

  commit();
  return { auction };
}
