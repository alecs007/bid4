import { AUCTION, PAGINATION, USE_MOCK } from "@/lib/config";
import { pickEndingSoon, pickPopular } from "@/lib/featured";
import { toAuctionDetail } from "@/lib/mock/join";
import { productGallery } from "@/lib/mock/images";
import {
  badRequest,
  commit,
  delay,
  forbidden,
  getWorld,
  maybeFailRead,
  nextId,
  notFound,
} from "@/lib/mock/store";
import type {
  Auction,
  AuctionDetail,
  AuctionFilters,
  AuctionSort,
  CreateAuctionPayload,
  ID,
  Page,
} from "@/lib/types";

import { matchesSearch } from "@/lib/utils/search";

import { http } from "./http";

/**
 * Auctions.
 *
 * TODO(backend): the live price and bid count should arrive over the WebSocket
 * channel Spring already has on the classpath (`/ws/auctions/{id}`), with these
 * REST calls used for the initial load only.
 */

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

function sortAuctions(items: AuctionDetail[], sort: AuctionSort = "ENDING_SOON") {
  const sorted = [...items];
  switch (sort) {
    case "ENDING_SOON":
      return sorted.sort(
        (a, b) => Date.parse(a.endTime) - Date.parse(b.endTime),
      );
    case "NEWEST":
      return sorted.sort(
        (a, b) => Date.parse(b.startTime) - Date.parse(a.startTime),
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

/** GET /auctions?status=LIVE&category=...&page=1 */
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
        causeId: filters.causeId,
        sellerId: filters.sellerId,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        minDonationPercent: filters.minDonationPercent,
        endingSoon: filters.endingSoon,
        sort: filters.sort,
        page: filters.page,
        pageSize: filters.pageSize,
      },
    });
  }

  await delay();
  maybeFailRead("licitațiile");
  const world = getWorld();

  // Only publicly visible states unless a specific seller's shelf is requested.
  const publicStatuses: Auction["status"][] = [
    "LIVE",
    "SCHEDULED",
    "ENDED",
    "SOLD",
    "UNSOLD",
  ];

  const details = world.auctions
    .map((auction) => toAuctionDetail(auction, viewerId))
    .filter((item): item is AuctionDetail => item !== null)
    .filter((auction) => {
      if (filters.sellerId) return auction.sellerId === filters.sellerId;
      return publicStatuses.includes(auction.status);
    })
    .filter((auction) => {
      if (filters.status?.length) {
        if (!filters.status.includes(auction.status)) return false;
      }
      if (filters.category?.length) {
        if (!filters.category.includes(auction.product.category)) return false;
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
      if (filters.endingSoon) {
        const hoursLeft =
          (Date.parse(auction.endTime) - Date.now()) / 3_600_000;
        if (auction.status !== "LIVE" || hoursLeft > AUCTION.ENDING_SOON_HOURS) {
          return false;
        }
      }
      if (filters.q) {
        const haystack = `${auction.product.title} ${auction.product.description} ${auction.cause.name}`;
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

/** GET /auctions/{id} */
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

/** GET /auctions/featured — the homepage rows. */
export async function getFeaturedAuctions(viewerId?: ID): Promise<{
  endingSoon: AuctionDetail[];
  popular: AuctionDetail[];
}> {
  if (!USE_MOCK) {
    return http<{ endingSoon: AuctionDetail[]; popular: AuctionDetail[] }>(
      "/auctions/featured",
    );
  }

  await delay();
  maybeFailRead("licitațiile recomandate");
  const world = getWorld();
  const details = world.auctions
    .map((auction) => toAuctionDetail(auction, viewerId))
    .filter((item): item is AuctionDetail => item !== null);

  return {
    endingSoon: pickEndingSoon(details),
    popular: pickPopular(details),
  };
}

/** GET /users/me/auctions — the seller's own listings, any status. */
export async function listMyAuctions(userId: ID): Promise<AuctionDetail[]> {
  if (!USE_MOCK) return http<AuctionDetail[]>("/users/me/auctions");

  await delay();
  maybeFailRead("anunțurile tale");
  const world = getWorld();
  return world.auctions
    .filter((auction) => auction.sellerId === userId)
    .map((auction) => toAuctionDetail(auction, userId))
    .filter((item): item is AuctionDetail => item !== null)
    .sort((a, b) => Date.parse(b.startTime) - Date.parse(a.startTime));
}

/** POST /auctions */
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
  if (Date.parse(payload.endTime) <= Date.parse(payload.startTime)) {
    badRequest("Data de final trebuie să fie după data de start.");
  }

  const productId = nextId("prd");
  const auctionId = nextId("auc");

  world.products.push({
    ...payload.product,
    id: productId,
    sellerId,
    images: payload.product.images.length
      ? payload.product.images
      : productGallery(productId, payload.product.category, 3),
    createdAt: new Date().toISOString(),
  });

  const auction: Auction = {
    id: auctionId,
    productId,
    sellerId,
    causeId: payload.causeId,
    donationPercent: payload.donationPercent,
    startingPrice: payload.startingPrice,
    currentPrice: payload.startingPrice,
    bidIncrement: payload.bidIncrement,
    reservePrice: payload.reservePrice,
    startTime: payload.startTime,
    endTime: payload.endTime,
    antiSnipeSeconds: payload.antiSnipeSeconds,
    // New listings queue for a staff spot-check before they go live.
    status: "PENDING_REVIEW",
    bidCount: 0,
    watcherCount: 0,
    extensionCount: 0,
  };

  world.auctions.push(auction);
  commit();

  const detail = toAuctionDetail(auction, sellerId);
  if (!detail) notFound("Licitația");
  return detail;
}

/** DELETE /auctions/{id} — seller withdraws a listing. */
export async function cancelAuction(id: ID, userId: ID): Promise<Auction> {
  if (!USE_MOCK) return http<Auction>(`/auctions/${id}`, { method: "DELETE" });

  await delay();
  const world = getWorld();
  const auction = world.auctions.find((item) => item.id === id);
  if (!auction) notFound("Licitația");
  if (auction.sellerId !== userId) {
    forbidden("Poți retrage doar propriile anunțuri.");
  }
  if (auction.status === "SOLD" || auction.status === "ENDED") {
    badRequest("Licitația s-a încheiat deja și nu mai poate fi retrasă.");
  }

  auction.status = "CANCELLED";
  commit();
  return auction;
}

/** PUT/DELETE /auctions/{id}/watch */
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

/** GET /users/me/watchlist */
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
