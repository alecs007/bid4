import { AUCTION, FEATURED, RELATED } from "@/lib/config";
import { progressPercent } from "@/lib/money";
import type { Auction, Cause } from "@/lib/types";

export function popularityScore(auction: Auction): number {
  const bidSignal = Math.log2(auction.bidCount + 1);
  const watchSignal = Math.log2(auction.watcherCount + 1);

  return (
    FEATURED.WEIGHT_BIDS * bidSignal +
    FEATURED.WEIGHT_WATCHERS * watchSignal +
    FEATURED.WEIGHT_DONATION * (auction.donationPercent / 100)
  );
}

export function isLive(auction: Auction): boolean {
  return auction.status === "LIVE";
}

export function isHot(auction: Auction): boolean {
  return auction.bidCount >= AUCTION.HOT_BID_THRESHOLD;
}

export function pickMostWatched<T extends Auction>(
  auctions: T[],
  count: number = FEATURED.MOST_WATCHED_COUNT,
): T[] {
  return auctions
    .filter(isLive)
    .sort(
      (a, b) =>
        b.watcherCount - a.watcherCount ||
        Date.parse(b.createdAt) - Date.parse(a.createdAt),
    )
    .slice(0, count);
}

export function pickLatest<T extends Auction>(
  auctions: T[],
  count: number = FEATURED.LATEST_COUNT,
): T[] {
  return auctions
    .filter(isLive)
    .sort(
      (a, b) =>
        Date.parse(b.startTime) - Date.parse(a.startTime) ||
        Date.parse(b.createdAt) - Date.parse(a.createdAt),
    )
    .slice(0, count);
}

export function pickTrendingCauses(
  causes: Cause[],
  auctions: Auction[],
  count: number = FEATURED.TRENDING_CAUSES_COUNT,
): Cause[] {
  const liveByCause = new Map<string, number>();
  for (const auction of auctions) {
    if (!isLive(auction)) continue;
    liveByCause.set(auction.causeId, (liveByCause.get(auction.causeId) ?? 0) + 1);
  }

  return causes
    .filter(
      (cause) =>
        (cause.status === "ACTIVE" || cause.status === "APPROVED") &&
        progressPercent(cause.raisedAmount, cause.goalAmount) < 100,
    )
    .map((cause) => {
      const liveCount = liveByCause.get(cause.id) ?? 0;
      const progress = progressPercent(cause.raisedAmount, cause.goalAmount);
      const score = progress * 0.6 + liveCount * 12 + cause.supporterCount * 0.05;
      return { cause, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((entry) => entry.cause);
}

function priceProximity(a: number, b: number): number {
  if (a <= 0 || b <= 0) return 0;
  const ratio = a > b ? a / b : b / a;
  return Math.max(0, 1 - (ratio - 1) / 3);
}

export function relatedScore(
  subject: Auction,
  candidate: Auction,
  subjectCategory: string,
): number {
  let score = 0;

  if (candidate.causeId === subject.causeId) score += RELATED.WEIGHT_SAME_CAUSE;
  if (candidate.category === subjectCategory) {
    score += RELATED.WEIGHT_SAME_CATEGORY;
  }
  if (candidate.sellerId === subject.sellerId) {
    score += RELATED.WEIGHT_SAME_SELLER;
  }

  score +=
    RELATED.WEIGHT_PRICE_PROXIMITY *
    priceProximity(subject.currentPrice, candidate.currentPrice);

  return score;
}

export function pickRelated<T extends Auction>(
  subject: T,
  auctions: T[],
  count: number = RELATED.COUNT,
): T[] {
  const others = auctions.filter(
    (auction) => auction.id !== subject.id && isLive(auction),
  );

  const matched = others
    .filter(
      (auction) =>
        auction.causeId === subject.causeId ||
        auction.category === subject.category ||
        auction.sellerId === subject.sellerId,
    )
    .map((auction) => ({
      auction,
      score: relatedScore(subject, auction, subject.category),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((entry) => entry.auction);

  if (matched.length >= RELATED.MIN_COUNT) return matched;

  const taken = new Set(matched.map((auction) => auction.id));
  const filler = others
    .filter((auction) => !taken.has(auction.id))
    .sort((a, b) => popularityScore(b) - popularityScore(a))
    .slice(0, RELATED.MIN_COUNT - matched.length);

  return [...matched, ...filler];
}
