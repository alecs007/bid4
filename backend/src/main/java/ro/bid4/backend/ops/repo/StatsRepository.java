package ro.bid4.backend.ops.repo;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import ro.bid4.backend.identity.domain.UserAccount;

public interface StatsRepository extends Repository<UserAccount, java.util.UUID> {
  interface PublicTotals {
    long getTotalRaised();

    long getCauseCount();

    long getLiveAuctionCount();

    long getMemberCount();

    double getAverageDonationPercent();
  }

  @Query(
      value =
          """
          select
            coalesce((select sum(raised_amount) from causes
                      where status in ('APPROVED', 'ACTIVE')), 0)          as totalRaised,
            (select count(*) from causes
             where status in ('APPROVED', 'ACTIVE'))                       as causeCount,
            (select count(*) from auctions where status = 'LIVE')          as liveAuctionCount,
            (select count(*) from users where role = 'USER')               as memberCount,
            coalesce((select avg(donation_percent) from auctions), 0)      as averageDonationPercent
          """,
      nativeQuery = true)
  PublicTotals publicTotals();
}
