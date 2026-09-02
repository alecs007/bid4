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

  static double popularity(Auction auction) {
    // Diminishing returns: the 30th bid should not outweigh everything else.
    double bidSignal = log2(auction.getBidCount() + 1);
    double watchSignal = log2(auction.getWatcherCount() + 1);

    return CatalogRules.WEIGHT_BIDS * bidSignal
        + CatalogRules.WEIGHT_WATCHERS * watchSignal
        + CatalogRules.WEIGHT_DONATION * (auction.getDonationPercent() / 100d);
  }

  /**
   * The listings the most people are following.
   *
   * <p>What the homepage leads with now that nothing is about to close. Watchers rather than bids:
   * following something is a quieter signal than bidding on it and a better one for "worth a look",
   * since a bid is also a commitment and most people make far fewer of them.
   */
  static List<Auction> mostWatched(List<Auction> live, int count) {
    return live.stream()
        .sorted(
            Comparator.comparingInt(Auction::getWatcherCount)
                .reversed()
                .thenComparing(Auction::getCreatedAt, Comparator.reverseOrder()))
        .limit(count)
        .toList();
  }

  /**
   * The listings that went up most recently.
   *
   * <p>The second row was a popularity score balancing bids, watchers and donation share, one per
   * seller. It answered nearly the same question as the row above it — both were "what is doing
   * well" — and between them the newest listing on the platform could appear on neither. This one
   * asks something the other cannot: what is new.
   *
   * <p>By {@code startTime}, which is when a listing was published rather than when it was drafted,
   * and no de-duplication by seller: a seller who lists three things this morning did list three
   * things this morning, and hiding two of them would make the row untrue to its own name.
   */
  static List<Auction> latest(List<Auction> live, int count) {
    return live.stream()
        .sorted(
            Comparator.comparing(Auction::getStartTime, Comparator.<Instant>reverseOrder())
                .thenComparing(Auction::getCreatedAt, Comparator.reverseOrder()))
        .limit(count)
        .toList();
  }

  /** 1 at the same price, tapering to 0 as one is four times the other. */
  private static double priceProximity(long a, long b) {
    if (a <= 0 || b <= 0) {
      return 0;
    }
    double ratio = a > b ? (double) a / b : (double) b / a;
    return Math.max(0, 1 - (ratio - 1) / 3);
  }

  private static double relatedScore(Auction subject, Auction candidate) {
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

    return score;
  }

  /**
   * Qualifying is separate from ranking.
   *
   * <p>An auction earns its place by sharing the cause, the kind of object, or the seller; price
   * only orders the ones that already qualified. Too few genuine matches to fill a row is topped up
   * rather than met by loosening what counts as related, and the real matches keep the front.
   */
  static List<Auction> related(Auction subject, List<Auction> live) {
    List<Auction> others =
        live.stream().filter(auction -> !auction.getId().equals(subject.getId())).toList();

    List<Auction> matched =
        others.stream()
            .filter(
                auction ->
                    auction.getCauseId().equals(subject.getCauseId())
                        || auction.getCategory().equals(subject.getCategory())
                        || auction.getSellerId().equals(subject.getSellerId()))
            .sorted(Comparator.comparingDouble((Auction a) -> relatedScore(subject, a)).reversed())
            .limit(CatalogRules.RELATED_COUNT)
            .toList();

    if (matched.size() >= CatalogRules.RELATED_MIN_COUNT) {
      return matched;
    }

    Set<UUID> taken = new HashSet<>(matched.stream().map(Auction::getId).toList());
    List<Auction> filler =
        others.stream()
            .filter(auction -> !taken.contains(auction.getId()))
            .sorted(Comparator.comparingDouble((Auction a) -> popularity(a)).reversed())
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
