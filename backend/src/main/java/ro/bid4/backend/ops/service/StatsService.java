package ro.bid4.backend.ops.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.ops.repo.StatsRepository;

@Service
@Transactional(readOnly = true)
public class StatsService {
  public record PublicStatsResponse(
      long totalRaised,
      long causeCount,
      long liveAuctionCount,
      long completedOrderCount,
      long memberCount,
      int averageDonationPercent) {}

  private final StatsRepository stats;

  public StatsService(StatsRepository stats) {
    this.stats = stats;
  }

  public PublicStatsResponse publicStats() {
    StatsRepository.PublicTotals totals = stats.publicTotals();
    return new PublicStatsResponse(
        totals.getTotalRaised(),
        totals.getCauseCount(),
        totals.getLiveAuctionCount(),
        0L,
        totals.getMemberCount(),
        (int) Math.round(totals.getAverageDonationPercent()));
  }
}
