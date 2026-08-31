import { AUCTION, FEATURED, RELATED } from "@/lib/config";
import { progressPercent } from "@/lib/money";
import type { Auction, Cause } from "@/lib/types";

/**
 * The client-side twin of FeaturedRanking.java. Kept identical on purpose: the homepage renders
 * whichever half is answering, and a row that reorders itself when the mock layer is switched
 * off would be a bug nobody could reproduce.
 *
 * "Popular" balances three signals so the row never fills with one kind of listing: bids,
 * watchers and donation share. There was a fourth, for time left. Nothing runs out of time now.
 */

export function popularityScore(auction: Auction): number {
  // Diminishing returns: the 30th bid should not outweigh everything else.
  const bidSignal = Math.log2(auction.bidCount + 1);
  const watchSignal = Math.log2(auction.watcherCount + 1);

  return (
    FEATURED.WEIGHT_BIDS * bidSignal +
    FEATURED.WEIGHT_WATCHERS * watchSignal +
    FEATURED.WEIGHT_DONATION * (auction.donationPercent / 100)
  );
}

/**
 * Whether the listing is still taking offers.
 *
 * No longer a question about time. A listing is open while it is LIVE and closed the moment its
 * seller accepts something or takes it down.
 */
export function isLive(auction: Auction): boolean {
  return auction.status === "LIVE";
}

export function isHot(auction: Auction): boolean {
  return auction.bidCount >= AUCTION.HOT_BID_THRESHOLD;
}

/**
 * The listings the most people are following.
 *
 * What the homepage leads with now that nothing is about to close. Watchers rather than bids:
 * following something is a quieter signal than bidding on it and a better one for "worth a
 * look", since a bid is also a commitment and most people make far fewer of them.
 */
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

/** Highest score first, one listing per seller so the row is not one shop window. */
export function pickPopular<T extends Auction>(
  auctions: T[],
  count: number = FEATURED.POPULAR_COUNT,
): T[] {
  const ranked = auctions
    .filter(isLive)
    .sort((a, b) => popularityScore(b) - popularityScore(a));

  const picked: T[] = [];
  const sellersSeen = new Set<string>();

  for (const auction of ranked) {
    if (sellersSeen.has(auction.sellerId)) continue;
    picked.push(auction);
    sellersSeen.add(auction.sellerId);
    if (picked.length === count) return picked;
  }

  // Not enough distinct sellers — top up with the next best regardless.
  for (const auction of ranked) {
    if (picked.includes(auction)) continue;
    picked.push(auction);
    if (picked.length === count) break;
  }
  return picked;
}

/** Causes with live listings, closest to a milestone: finish something, not start everything. */
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
      // Momentum: some progress + live listings beats either alone.
      const score = progress * 0.6 + liveCount * 12 + cause.supporterCount * 0.05;
      return { cause, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((entry) => entry.cause);
}

/** 1 at the same price, tapering to 0 as one is four times the other. */
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

/**
 * Qualifying is separate from ranking. An auction earns its place by sharing the
 * cause, the kind of object, or the seller; price only orders those.
 */
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

  // Too few genuine matches to fill a row: top up rather than loosen what counts
  // as related. The real matches keep the front.
  const taken = new Set(matched.map((auction) => auction.id));
  const filler = others
    .filter((auction) => !taken.has(auction.id))
    .sort((a, b) => popularityScore(b) - popularityScore(a))
    .slice(0, RELATED.MIN_COUNT - matched.length);

  return [...matched, ...filler];
}
