import { AUCTION, FEATURED, RELATED } from "@/lib/config";
import { progressPercent } from "@/lib/money";
import type { Auction, Cause } from "@/lib/types";

/**
 * The homepage's editorial logic, implemented for real rather than hard-coded.
 *
 * "Popular" balances four signals so the row never fills with one kind of
 * listing: activity (bids), interest (watchers), urgency (time left) and
 * generosity (donation share). The weights live in `lib/config.ts`.
 */

/** 1 when the auction is closing right now, 0 outside the ending-soon window. */
export function urgencyFactor(auction: Auction, now = Date.now()): number {
  const msLeft = Date.parse(auction.endTime) - now;
  if (msLeft <= 0) return 0;
  const hoursLeft = msLeft / 3_600_000;
  if (hoursLeft >= AUCTION.ENDING_SOON_HOURS) return 0;
  return 1 - hoursLeft / AUCTION.ENDING_SOON_HOURS;
}

export function popularityScore(auction: Auction, now = Date.now()): number {
  // Diminishing returns: the 30th bid should not outweigh everything else.
  const bidSignal = Math.log2(auction.bidCount + 1);
  const watchSignal = Math.log2(auction.watcherCount + 1);

  return (
    FEATURED.WEIGHT_BIDS * bidSignal +
    FEATURED.WEIGHT_WATCHERS * watchSignal +
    FEATURED.WEIGHT_URGENCY * urgencyFactor(auction, now) +
    FEATURED.WEIGHT_DONATION * (auction.donationPercent / 100)
  );
}

export function isLive(auction: Auction, now = Date.now()): boolean {
  return (
    auction.status === "LIVE" &&
    Date.parse(auction.startTime) <= now &&
    Date.parse(auction.endTime) > now
  );
}

export function isEndingSoon(auction: Auction, now = Date.now()): boolean {
  return isLive(auction, now) && urgencyFactor(auction, now) > 0;
}

export function isHot(auction: Auction): boolean {
  return auction.bidCount >= AUCTION.HOT_BID_THRESHOLD;
}

/** Soonest deadline first; only live auctions qualify. */
export function pickEndingSoon<T extends Auction>(
  auctions: T[],
  count = FEATURED.ENDING_SOON_COUNT,
  now = Date.now(),
): T[] {
  return auctions
    .filter((auction) => isLive(auction, now))
    .sort((a, b) => Date.parse(a.endTime) - Date.parse(b.endTime))
    .slice(0, count);
}

/**
 * Highest score first, with one listing per seller so the row does not become
 * a single seller's shop window.
 */
export function pickPopular<T extends Auction>(
  auctions: T[],
  count = FEATURED.POPULAR_COUNT,
  now = Date.now(),
): T[] {
  const ranked = auctions
    .filter((auction) => isLive(auction, now))
    .sort((a, b) => popularityScore(b, now) - popularityScore(a, now));

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

/**
 * Trending causes: the ones with live listings, closest to a milestone, so the
 * homepage nudges toward finishing something rather than starting everything.
 */
export function pickTrendingCauses(
  causes: Cause[],
  auctions: Auction[],
  count = FEATURED.TRENDING_CAUSES_COUNT,
  now = Date.now(),
): Cause[] {
  const liveByCause = new Map<string, number>();
  for (const auction of auctions) {
    if (!isLive(auction, now)) continue;
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

/* ---------------------------------------------------------------------------
 * "More like this", on an auction page
 * ------------------------------------------------------------------------ */

/** 1 at the same price, tapering to 0 as one is four times the other. */
function priceProximity(a: number, b: number): number {
  if (a <= 0 || b <= 0) return 0;
  const ratio = a > b ? a / b : b / a;
  return Math.max(0, 1 - (ratio - 1) / 3);
}

/**
 * How much another auction has in common with this one. Cause first, then the
 * kind of object, then who is selling it and roughly what it costs.
 */
export function relatedScore(
  subject: Auction,
  candidate: Auction & { product: { category: string } },
  subjectCategory: string,
  now = Date.now(),
): number {
  let score = 0;

  if (candidate.causeId === subject.causeId) score += RELATED.WEIGHT_SAME_CAUSE;
  if (candidate.product.category === subjectCategory) {
    score += RELATED.WEIGHT_SAME_CATEGORY;
  }
  if (candidate.sellerId === subject.sellerId) {
    score += RELATED.WEIGHT_SAME_SELLER;
  }

  score +=
    RELATED.WEIGHT_PRICE_PROXIMITY *
    priceProximity(subject.currentPrice, candidate.currentPrice);
  score += RELATED.WEIGHT_URGENCY * urgencyFactor(candidate, now);

  return score;
}

/**
 * The auctions worth showing under this one: live, not this one, best match
 * first.
 *
 * Qualifying is separate from ranking. An auction earns its place by sharing
 * the cause, the kind of object, or the seller — price and urgency only decide
 * the order among those. Otherwise a row of "related" listings fills up with
 * whatever happens to cost about the same, which relates to nothing.
 */
export function pickRelated<
  T extends Auction & { product: { category: string } },
>(
  subject: T,
  auctions: T[],
  count = RELATED.COUNT,
  now = Date.now(),
): T[] {
  const others = auctions.filter(
    (auction) => auction.id !== subject.id && isLive(auction, now),
  );

  const matched = others
    .filter(
      (auction) =>
        auction.causeId === subject.causeId ||
        auction.product.category === subject.product.category ||
        auction.sellerId === subject.sellerId,
    )
    .map((auction) => ({
      auction,
      score: relatedScore(subject, auction, subject.product.category, now),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((entry) => entry.auction);

  if (matched.length >= RELATED.MIN_COUNT) return matched;

  // Too few genuine matches to fill a row. Rather than loosen what counts as
  // related, top up with what is worth seeing anyway — the real matches keep
  // the front of the row.
  const taken = new Set(matched.map((auction) => auction.id));
  const filler = others
    .filter((auction) => !taken.has(auction.id))
    .sort((a, b) => popularityScore(b, now) - popularityScore(a, now))
    .slice(0, RELATED.MIN_COUNT - matched.length);

  return [...matched, ...filler];
}
