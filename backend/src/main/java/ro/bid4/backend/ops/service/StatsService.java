package ro.bid4.backend.ops.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.ops.repo.StatsRepository;

/**
 * The impact band on the homepage.
 *
 * <p>Counted in the database rather than by loading rows, because these are the numbers a first
 * visit pays for and none of them needs an entity to arrive at.
 */
@Service
@Transactional(readOnly = true)
public class StatsService {

  /** The PlatformStats interface in frontend/src/lib/api/stats.ts. */
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
        // Orders arrive with the escrow feature. Reported as zero rather than
        // omitted, because the field is a required number on the other side.
        0L,
        totals.getMemberCount(),
        (int) Math.round(totals.getAverageDonationPercent()));
  }
}
