package ro.bid4.backend.catalog.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import ro.bid4.backend.catalog.domain.Auction;

final class FeaturedRanking {
  private FeaturedRanking() {}

  static double popularity(Auction auction) {
    double bidSignal = log2(auction.getBidCount() + 1);
    double watchSignal = log2(auction.getWatcherCount() + 1);

    return CatalogRules.WEIGHT_BIDS * bidSignal
        + CatalogRules.WEIGHT_WATCHERS * watchSignal
        + CatalogRules.WEIGHT_DONATION * (auction.getDonationPercent() / 100d);
  }

  static List<Auction> mostWatched(List<Auction> live, int count) {
    return live.stream()
        .sorted(
            Comparator.comparingInt(Auction::getWatcherCount)
                .reversed()
                .thenComparing(Auction::getCreatedAt, Comparator.reverseOrder()))
        .limit(count)
        .toList();
  }

  static List<Auction> latest(List<Auction> live, int count) {
    return live.stream()
        .sorted(
            Comparator.comparing(Auction::getStartTime, Comparator.<Instant>reverseOrder())
                .thenComparing(Auction::getCreatedAt, Comparator.reverseOrder()))
        .limit(count)
        .toList();
  }

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
