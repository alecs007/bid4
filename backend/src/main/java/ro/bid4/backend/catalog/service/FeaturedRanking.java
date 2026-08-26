package ro.bid4.backend.catalog.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import ro.bid4.backend.catalog.domain.Auction;

/**
 * The server-side twin of frontend/src/lib/featured.ts.
 *
 * <p>Kept identical on purpose: the homepage renders whichever half is answering, and a row that
 * reorders itself when the mock layer is switched off would be a bug nobody could reproduce.
 */
final class FeaturedRanking {

  private FeaturedRanking() {}

  /** 1 when the auction is closing right now, 0 outside the closing window. */
  static double urgency(Auction auction, Instant now) {
    long msLeft = auction.getEndTime().toEpochMilli() - now.toEpochMilli();
    if (msLeft <= 0) {
      return 0;
    }
    double hoursLeft = msLeft / 3_600_000d;
    if (hoursLeft >= CatalogRules.ENDING_SOON_HOURS) {
      return 0;
    }
    return 1 - hoursLeft / CatalogRules.ENDING_SOON_HOURS;
  }

  static double popularity(Auction auction, Instant now) {
    // Diminishing returns: the 30th bid should not outweigh everything else.
    double bidSignal = log2(auction.getBidCount() + 1);
    double watchSignal = log2(auction.getWatcherCount() + 1);

    return CatalogRules.WEIGHT_BIDS * bidSignal
        + CatalogRules.WEIGHT_WATCHERS * watchSignal
        + CatalogRules.WEIGHT_URGENCY * urgency(auction, now)
        + CatalogRules.WEIGHT_DONATION * (auction.getDonationPercent() / 100d);
  }

  /** Soonest deadline first. The caller has already narrowed this to live listings. */
  static List<Auction> endingSoon(List<Auction> live, int count) {
    return live.stream().sorted(Comparator.comparing(Auction::getEndTime)).limit(count).toList();
  }

  /** Highest score first, one listing per seller so the row is not one shop window. */
  static List<Auction> popular(List<Auction> live, int count, Instant now) {
    List<Auction> ranked =
        live.stream()
            .sorted(Comparator.comparingDouble((Auction a) -> popularity(a, now)).reversed())
            .toList();

    List<Auction> picked = new ArrayList<>(count);
    Set<UUID> sellersSeen = new HashSet<>();

    for (Auction auction : ranked) {
      if (!sellersSeen.add(auction.getSellerId())) {
        continue;
      }
      picked.add(auction);
      if (picked.size() == count) {
        return picked;
      }
    }

    // Not enough distinct sellers — top up with the next best regardless.
    Set<UUID> taken = new HashSet<>(picked.stream().map(Auction::getId).toList());
    for (Auction auction : ranked) {
      if (taken.contains(auction.getId())) {
        continue;
      }
      picked.add(auction);
      if (picked.size() == count) {
        break;
      }
    }
    return picked;
  }

  /** 1 at the same price, tapering to 0 as one is four times the other. */
  private static double priceProximity(long a, long b) {
    if (a <= 0 || b <= 0) {
      return 0;
    }
    double ratio = a > b ? (double) a / b : (double) b / a;
    return Math.max(0, 1 - (ratio - 1) / 3);
  }

  private static double relatedScore(Auction subject, Auction candidate, Instant now) {
    double score = 0;

    if (candidate.getCauseId().equals(subject.getCauseId())) {
      score += CatalogRules.RELATED_WEIGHT_SAME_CAUSE;
    }
    if (candidate.getCategory().equals(subject.getCategory())) {
      score += CatalogRules.RELATED_WEIGHT_SAME_CATEGORY;
    }
    if (candidate.getSellerId().equals(subject.getSellerId())) {
      score += CatalogRules.RELATED_WEIGHT_SAME_SELLER;
    }

    score +=
        CatalogRules.RELATED_WEIGHT_PRICE_PROXIMITY
            * priceProximity(subject.getCurrentPrice(), candidate.getCurrentPrice());
    score += CatalogRules.RELATED_WEIGHT_URGENCY * urgency(candidate, now);

    return score;
  }

  /**
   * Qualifying is separate from ranking.
   *
   * <p>An auction earns its place by sharing the cause, the kind of object, or the seller; price
   * and urgency only order the ones that already qualified. Too few genuine matches to fill a row
   * is topped up rather than met by loosening what counts as related, and the real matches keep the
   * front.
   */
  static List<Auction> related(Auction subject, List<Auction> live, Instant now) {
    List<Auction> others =
        live.stream().filter(auction -> !auction.getId().equals(subject.getId())).toList();

    List<Auction> matched =
        others.stream()
            .filter(
                auction ->
                    auction.getCauseId().equals(subject.getCauseId())
                        || auction.getCategory().equals(subject.getCategory())
                        || auction.getSellerId().equals(subject.getSellerId()))
            .sorted(
                Comparator.comparingDouble((Auction a) -> relatedScore(subject, a, now)).reversed())
            .limit(CatalogRules.RELATED_COUNT)
            .toList();

    if (matched.size() >= CatalogRules.RELATED_MIN_COUNT) {
      return matched;
    }

    Set<UUID> taken = new HashSet<>(matched.stream().map(Auction::getId).toList());
    List<Auction> filler =
        others.stream()
            .filter(auction -> !taken.contains(auction.getId()))
            .sorted(Comparator.comparingDouble((Auction a) -> popularity(a, now)).reversed())
            .limit(CatalogRules.RELATED_MIN_COUNT - (long) matched.size())
            .toList();

    List<Auction> combined = new ArrayList<>(matched);
    combined.addAll(filler);
    return combined;
  }

  private static double log2(double value) {
    return Math.log(value) / Math.log(2);
  }
}
