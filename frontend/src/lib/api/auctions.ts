import { AUCTION, PAGINATION, USE_MOCK, bidStepFor } from "@/lib/config";
import { pickLatest, pickMostWatched, pickRelated } from "@/lib/featured";
import { toAuctionDetail } from "@/lib/mock/join";
import { auctionGallery } from "@/lib/mock/images";
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
} from "@/lib/mock/store";
import type {
  Auction,
  AuctionDetail,
  AuctionFilters,
  AuctionSort,
  CreateAuctionPayload,
  FeaturedAuctions,
  ID,
  Page,
} from "@/lib/types";
import { PUBLIC_AUCTION_STATUSES, isCommitted, isOfferable } from "@/lib/types";

import { matchesSearch } from "@/lib/utils/search";

import { http } from "./http";

// TODO(backend): live price and bid count belong on /ws/auctions/{id}; REST is the first load.
function paginate<T>(items: T[], page = 1, pageSize: number): Page<T> {
  const safeSize = Math.min(pageSize, PAGINATION.MAX_PAGE_SIZE);
  const total = items.length;
  const start = (page - 1) * safeSize;
  return {
    items: items.slice(start, start + safeSize),
    page,
    pageSize: safeSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / safeSize)),
  };
}

function sortAuctions(items: AuctionDetail[], sort: AuctionSort = "NEWEST") {
  const sorted = [...items];
  switch (sort) {
    case "NEWEST":
      return sorted.sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
      );
    case "PRICE_ASC":
      return sorted.sort((a, b) => a.currentPrice - b.currentPrice);
    case "PRICE_DESC":
      return sorted.sort((a, b) => b.currentPrice - a.currentPrice);
    case "MOST_BIDS":
      return sorted.sort((a, b) => b.bidCount - a.bidCount);
    case "DONATION_DESC":
      return sorted.sort((a, b) => b.donationPercent - a.donationPercent);
  }
}

export async function listAuctions(
  filters: AuctionFilters = {},
  viewerId?: ID,
): Promise<Page<AuctionDetail>> {
  if (!USE_MOCK) {
    return http<Page<AuctionDetail>>("/auctions", {
      query: {
        q: filters.q,
        status: filters.status,
        category: filters.category,
        condition: filters.condition,
        causeId: filters.causeId,
        sellerId: filters.sellerId,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        minDonationPercent: filters.minDonationPercent,
        sort: filters.sort,
        page: filters.page,
        pageSize: filters.pageSize,
      },
    });
  }

  await delay();
  maybeFailRead("licitațiile");
  const world = getWorld();

  const details = world.auctions
    .map((auction) => toAuctionDetail(auction, viewerId))
    .filter((item): item is AuctionDetail => item !== null)
    .filter((auction) => {
      if (filters.sellerId) return auction.sellerId === filters.sellerId;
      return PUBLIC_AUCTION_STATUSES.includes(auction.status);
    })
    .filter((auction) => {
      if (filters.status?.length) {
        if (!filters.status.includes(auction.status)) return false;
      }
      if (filters.category?.length) {
        if (!filters.category.includes(auction.category)) return false;
      }
      if (filters.condition?.length) {
        if (!filters.condition.includes(auction.condition)) return false;
      }
      if (filters.causeId && auction.causeId !== filters.causeId) return false;
      if (filters.minPrice && auction.currentPrice < filters.minPrice) return false;
      if (filters.maxPrice && auction.currentPrice > filters.maxPrice) return false;
      if (
        filters.minDonationPercent &&
        auction.donationPercent < filters.minDonationPercent
      ) {
        return false;
      }
      if (filters.q) {
        const haystack = `${auction.title} ${auction.description} ${auction.cause.name}`;
        if (!matchesSearch(haystack, filters.q)) return false;
      }
      return true;
    });

  return paginate(
    sortAuctions(details, filters.sort),
    filters.page ?? 1,
    filters.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE,
  );
}

export async function getAuction(
  id: ID,
  viewerId?: ID,
): Promise<AuctionDetail> {
  if (!USE_MOCK) return http<AuctionDetail>(`/auctions/${id}`);

  await delay();
  maybeFailRead("licitația");
  const world = getWorld();
  const auction = world.auctions.find((item) => item.id === id);
  if (!auction) notFound("Licitația");

  const detail = toAuctionDetail(auction, viewerId);
  if (!detail) notFound("Licitația");
  return detail;
}

export async function getFeaturedAuctions(
  viewerId?: ID,
): Promise<FeaturedAuctions> {
  if (!USE_MOCK) return http<FeaturedAuctions>("/auctions/featured");

  await delay();
  maybeFailRead("licitațiile recomandate");
  const world = getWorld();
  const details = world.auctions
    .map((auction) => toAuctionDetail(auction, viewerId))
    .filter((item): item is AuctionDetail => item !== null);

  return {
    mostWatched: pickMostWatched(details),
    latest: pickLatest(details),
  };
}

export async function listRelatedAuctions(
  auctionId: ID,
  viewerId?: ID,
): Promise<AuctionDetail[]> {
  if (!USE_MOCK) {
    return http<AuctionDetail[]>(`/auctions/${auctionId}/related`);
  }

  await delay();
  maybeFailRead("recomandările");
  const world = getWorld();

  const details = world.auctions
    .map((auction) => toAuctionDetail(auction, viewerId))
    .filter((item): item is AuctionDetail => item !== null);

  const subject = details.find((auction) => auction.id === auctionId);
  if (!subject) return [];

  return pickRelated(subject, details);
}

export async function listMyAuctions(userId: ID): Promise<AuctionDetail[]> {
  if (!USE_MOCK) return http<AuctionDetail[]>("/users/me/auctions");

  await delay();
  maybeFailRead("anunțurile tale");
  const world = getWorld();
  return world.auctions
    .filter((auction) => auction.sellerId === userId)
    .map((auction) => toAuctionDetail(auction, userId))
    .filter((item): item is AuctionDetail => item !== null)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function createAuction(
  payload: CreateAuctionPayload,
  sellerId: ID,
): Promise<AuctionDetail> {
  if (!USE_MOCK) {
    return http<AuctionDetail>("/auctions", { method: "POST", body: payload });
  }

  await delay();
  const world = getWorld();

  const cause = world.causes.find((item) => item.id === payload.causeId);
  if (!cause) notFound("Cauza");
  if (cause.status !== "ACTIVE" && cause.status !== "APPROVED") {
    badRequest(
      "Poți lista doar pentru cauze aprobate.",
      "CAUSE_NOT_APPROVED",
    );
  }
  if (
    payload.donationPercent < 5 ||
    payload.donationPercent > 100 ||
    Number.isNaN(payload.donationPercent)
  ) {
    badRequest("Procentul donat trebuie să fie între 5 și 100.");
  }
  if (payload.startingPrice < AUCTION.MIN_STARTING_PRICE) {
    badRequest("Prețul de pornire este prea mic.");
  }
  if (
    payload.reservePrice !== undefined &&
    payload.reservePrice < payload.startingPrice
  ) {
    badRequest("Prețul de rezervă nu poate fi sub prețul de pornire.");
  }
  if (
    payload.buyNowPrice !== undefined &&
    payload.buyNowPrice <= payload.startingPrice
  ) {
    badRequest(
      "Prețul „Cumpără acum” trebuie să fie peste prețul de pornire.",
    );
  }
  if (
    payload.buyNowPrice !== undefined &&
    payload.reservePrice !== undefined &&
    payload.buyNowPrice < payload.reservePrice
  ) {
    badRequest(
      "Prețul „Cumpără acum” nu poate fi sub prețul de rezervă.",
    );
  }

  const auctionId = nextId("auc");
  const now = new Date().toISOString();

  const auction: Auction = {
    id: auctionId,
    sellerId,
    causeId: payload.causeId,
    title: payload.title,
    description: payload.description,
    images: payload.images.length
      ? payload.images
      : auctionGallery(auctionId, payload.category, 3),
    category: payload.category,
    condition: payload.condition,
    weightGrams: payload.weightGrams,
    donationPercent: payload.donationPercent,
    startingPrice: payload.startingPrice,
    currentPrice: payload.startingPrice,
    bidIncrement: bidStepFor(payload.startingPrice),
    reservePrice: payload.reservePrice,
    buyNowPrice: payload.buyNowPrice,
    startTime: now,
    status: "PENDING_REVIEW",
    bidCount: 0,
    watcherCount: 0,
    createdAt: now,
  };

  world.auctions.push(auction);
  commit();

  const detail = toAuctionDetail(auction, sellerId);
  if (!detail) notFound("Licitația");
  return detail;
}

export async function cancelAuction(id: ID, userId: ID): Promise<Auction> {
  if (!USE_MOCK) return http<Auction>(`/auctions/${id}`, { method: "DELETE" });

  await delay();
  const world = getWorld();
  const auction = world.auctions.find((item) => item.id === id);
  if (!auction) notFound("Licitația");
  if (auction.sellerId !== userId) {
    forbidden("Poți retrage doar propriile anunțuri.");
  }
  if (auction.status === "CANCELLED") return auction;
  if (isCommitted(auction.status)) {
    badRequest(
      auction.status === "SOLD"
        ? "Anunțul este vândut și plătit, așa că nu mai poate fi retras."
        : "Ai acceptat o ofertă. Anuleaz-o mai întâi, apoi poți retrage anunțul.",
    );
  }

  for (const bid of world.bids) {
    if (bid.auctionId === auction.id) bid.status = "LOST";
  }

  auction.status = "CANCELLED";
  commit();
  return auction;
}

export async function acceptOffer(
  auctionId: ID,
  bidId: ID,
  userId: ID,
): Promise<AuctionDetail> {
  if (!USE_MOCK) {
    return http<AuctionDetail>(`/auctions/${auctionId}/accept`, {
      method: "POST",
      body: { bidId },
    });
  }

  await delay();
  const world = getWorld();
  const auction = world.auctions.find((item) => item.id === auctionId);
  if (!auction || auction.sellerId !== userId) notFound("Licitația");
  if (!isOfferable(auction.status)) {
    badRequest("Anunțul nu mai acceptă oferte.");
  }

  const offer = world.bids.find(
    (bid) => bid.id === bidId && bid.auctionId === auctionId,
  );
  if (!offer) notFound("Oferta");
  if (offer.status === "LOST" || offer.status === "WON") {
    badRequest("Oferta nu mai este activă.");
  }

  if (offer.status !== "ACCEPTED") {
    offer.status = "ACCEPTED";
    rebalanceBids(world, auction);
  }
  openOrderForAcceptance(auction.id, offer.bidderId);
  commit();

  const detail = toAuctionDetail(auction, userId);
  if (!detail) notFound("Licitația");
  return detail;
}

export async function toggleWatch(
  auctionId: ID,
  userId: ID,
): Promise<{ watched: boolean }> {
  if (!USE_MOCK) {
    return http<{ watched: boolean }>(`/auctions/${auctionId}/watch`, {
      method: "PUT",
    });
  }

  await delay();
  const world = getWorld();
  const auction = world.auctions.find((item) => item.id === auctionId);
  if (!auction) notFound("Licitația");

  const index = world.watchlist.findIndex(
    (entry) => entry.userId === userId && entry.auctionId === auctionId,
  );

  if (index >= 0) {
    world.watchlist.splice(index, 1);
    auction.watcherCount = Math.max(0, auction.watcherCount - 1);
    commit();
    return { watched: false };
  }

  world.watchlist.push({ userId, auctionId });
  auction.watcherCount += 1;
  commit();
  return { watched: true };
}

export async function listWatchlist(userId: ID): Promise<AuctionDetail[]> {
  if (!USE_MOCK) return http<AuctionDetail[]>("/users/me/watchlist");

  await delay();
  maybeFailRead("lista de urmărire");
  const world = getWorld();
  const watched = new Set(
    world.watchlist
      .filter((entry) => entry.userId === userId)
      .map((entry) => entry.auctionId),
  );

  return world.auctions
    .filter((auction) => watched.has(auction.id))
    .map((auction) => toAuctionDetail(auction, userId))
    .filter((item): item is AuctionDetail => item !== null);
}
