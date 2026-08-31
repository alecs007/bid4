import { USE_MOCK } from "@/lib/config";
import type { Bani } from "@/lib/config";
import { delay, forbidden, getWorld, maybeFailRead } from "@/lib/mock/store";
import type { ID, OrderStatus, UserRole } from "@/lib/types";

import { CACHE_KEYS, readCache, writeCache } from "./cache";
import { http } from "./http";

/** Numbers for the homepage impact band. */
export interface PlatformStats {
  totalRaised: Bani;
  causeCount: number;
  liveAuctionCount: number;
  completedOrderCount: number;
  memberCount: number;
  averageDonationPercent: number;
}

/**
 * TODO(backend): serve this with a Cache-Control header and drop the local cache;
 * the shape and the call site stay the same.
 */
const STATS_TTL_MS = 5 * 60_000;

/** GET /stats/public */
export async function getPlatformStats(): Promise<PlatformStats> {
  const cached = readCache<PlatformStats>(CACHE_KEYS.platformStats, STATS_TTL_MS);
  if (cached) return cached;

  if (!USE_MOCK) {
    const fresh = await http<PlatformStats>("/stats/public");
    writeCache(CACHE_KEYS.platformStats, fresh);
    return fresh;
  }

  await delay();
  maybeFailRead("statisticile");
  const world = getWorld();

  const publicCauses = world.causes.filter(
    (cause) => cause.status === "ACTIVE" || cause.status === "APPROVED",
  );
  const live = world.auctions.filter((auction) => auction.status === "LIVE");
  const donationPercents = world.auctions.map(
    (auction) => auction.donationPercent,
  );

  const stats: PlatformStats = {
    totalRaised: publicCauses.reduce(
      (total, cause) => total + cause.raisedAmount,
      0,
    ),
    causeCount: publicCauses.length,
    liveAuctionCount: live.length,
    completedOrderCount: world.orders.filter(
      (order) => order.status === "COMPLETED",
    ).length,
    memberCount: world.users.filter((user) => user.role === "USER").length,
    averageDonationPercent: donationPercents.length
      ? Math.round(
          donationPercents.reduce((total, value) => total + value, 0) /
            donationPercents.length,
        )
      : 0,
  };

  writeCache(CACHE_KEYS.platformStats, stats);
  return stats;
}

/** Everything `/cont` needs in one call. */
export interface UserDashboardStats {
  activeBidCount: number;
  winningCount: number;
  wonCount: number;
  watchlistCount: number;
  activeListingCount: number;
  ordersNeedingActionCount: number;
  myCauseCount: number;
  totalRaised: Bani;
}

/** GET /users/me/stats */
export async function getUserStats(userId: ID): Promise<UserDashboardStats> {
  if (!USE_MOCK) return http<UserDashboardStats>("/users/me/stats");

  await delay();
  maybeFailRead("sumarul contului");
  const world = getWorld();

  const myBids = world.bids.filter((bid) => bid.bidderId === userId);
  const liveAuctionIds = new Set(
    world.auctions
      .filter((auction) => auction.status === "LIVE")
      .map((auction) => auction.id),
  );

  const needsAction: OrderStatus[] = [
    "AWAITING_CONFIRMATION",
    "PAYMENT_FAILED",
    "ARRIVED_AT_LOCKER",
    "DELIVERED",
  ];

  return {
    activeBidCount: new Set(
      myBids
        .filter((bid) => liveAuctionIds.has(bid.auctionId))
        .map((bid) => bid.auctionId),
    ).size,
    winningCount: myBids.filter((bid) => bid.status === "WINNING").length,
    wonCount: myBids.filter((bid) => bid.status === "WON").length,
    watchlistCount: world.watchlist.filter((entry) => entry.userId === userId)
      .length,
    activeListingCount: world.auctions.filter(
      (auction) =>
        auction.sellerId === userId &&
        (auction.status === "LIVE" || auction.status === "RESERVED"),
    ).length,
    ordersNeedingActionCount: world.orders.filter(
      (order) =>
        (order.buyerId === userId && needsAction.includes(order.status)) ||
        (order.sellerId === userId && order.status === "LABEL_GENERATED"),
    ).length,
    myCauseCount: world.causes.filter((cause) => cause.organizerId === userId)
      .length,
    totalRaised:
      world.users.find((user) => user.id === userId)?.totalRaised ?? 0,
  };
}

export interface AdminStats {
  platformRevenue: Bani;
  buyerTaxCollected: Bani;
  sellerFeesCollected: Bani;
  totalDonated: Bani;
  grossVolume: Bani;
  orderCountByStatus: Record<OrderStatus, number>;
  pendingCauseCount: number;
  openDisputeCount: number;
  userCount: number;
  /** Donated per month, oldest first — feeds the reports chart. */
  monthlySeries: { month: string; donated: Bani; revenue: Bani }[];
}

/** GET /admin/stats */
export async function getAdminStats(role: UserRole): Promise<AdminStats> {
  if (!USE_MOCK) return http<AdminStats>("/admin/stats");

  await delay();
  if (role !== "ADMIN") forbidden("Doar administratorii au acces aici.");
  maybeFailRead("rapoartele");
  const world = getWorld();

  const settled = world.orders.filter((order) => order.status === "COMPLETED");
  const paid = world.orders.filter((order) => order.paidAt);

  const orderCountByStatus = world.orders.reduce(
    (accumulator, order) => {
      accumulator[order.status] = (accumulator[order.status] ?? 0) + 1;
      return accumulator;
    },
    {} as Record<OrderStatus, number>,
  );

  // Six months back, so the chart always has a shape to show.
  const monthFormatter = new Intl.DateTimeFormat("ro-RO", { month: "short" });
  const monthlySeries = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    const key = `${date.getFullYear()}-${date.getMonth()}`;

    const inMonth = settled.filter((order) => {
      const settledAt = new Date(order.releasedAt ?? order.createdAt);
      return `${settledAt.getFullYear()}-${settledAt.getMonth()}` === key;
    });

    return {
      month: monthFormatter.format(date),
      donated: inMonth.reduce((total, order) => total + order.donationAmount, 0),
      revenue: inMonth.reduce(
        (total, order) => total + order.platformTax + order.sellerFee,
        0,
      ),
    };
  });

  return {
    platformRevenue: settled.reduce(
      (total, order) => total + order.platformTax + order.sellerFee,
      0,
    ),
    buyerTaxCollected: paid.reduce(
      (total, order) => total + order.platformTax,
      0,
    ),
    sellerFeesCollected: settled.reduce(
      (total, order) => total + order.sellerFee,
      0,
    ),
    totalDonated: settled.reduce(
      (total, order) => total + order.donationAmount,
      0,
    ),
    grossVolume: paid.reduce((total, order) => total + order.totalPaid, 0),
    orderCountByStatus,
    pendingCauseCount: world.causes.filter(
      (cause) => cause.status === "PENDING_APPROVAL",
    ).length,
    openDisputeCount: world.disputes.filter(
      (dispute) => dispute.status === "OPEN" || dispute.status === "UNDER_REVIEW",
    ).length,
    userCount: world.users.length,
    monthlySeries,
  };
}
