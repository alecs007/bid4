package ro.bid4.backend.ops.repo;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import ro.bid4.backend.identity.domain.UserAccount;

/**
 * Aggregates for the public counters.
 *
 * <p>Anchored on UserAccount only because Spring Data needs an entity to hang a repository on;
 * every query here is native and counts in the database, and nothing is loaded to be counted.
 *
 * <p>Extends the bare {@code Repository} marker rather than {@code JpaRepository}: this exists to
 * answer one question, and inheriting save, delete and findAll for a type it has no business
 * writing is how a reporting helper turns into a second way to modify users.
 */
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
