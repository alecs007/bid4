package ro.bid4.backend.catalog.repo;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ro.bid4.backend.catalog.domain.Auction;
import ro.bid4.backend.catalog.domain.AuctionStatus;

public interface AuctionRepository
    extends JpaRepository<Auction, UUID>, JpaSpecificationExecutor<Auction> {

  /** How many listings a cause currently has running. */
  interface CauseTally {
    UUID getCauseId();

    long getTotal();
  }

  /**
   * The ranking window for the homepage rows and for "more like this".
   *
   * <p>Ordered by closing time and capped, so the work stays bounded by a constant rather than by
   * how well the platform is doing. Urgency is one of the ranking weights anyway, which makes the
   * soonest-closing listings the right ones to rank when there are more than fit.
   */
  List<Auction> findByStatusAndStartTimeLessThanEqualAndEndTimeGreaterThanOrderByEndTimeAsc(
      AuctionStatus status, Instant startedBy, Instant endsAfter, Limit limit);

  List<Auction> findBySellerIdOrderByCreatedAtDesc(UUID sellerId);

  /**
   * The row, locked, for the duration of a bid.
   *
   * <p>Two offers arriving together would otherwise both read the same current price and both
   * believe they had outbid it — and the one that committed second would silently overwrite the
   * first. Serialising on the auction row is the whole of what makes the price monotonic.
   */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select a from Auction a where a.id = :id")
  Optional<Auction> findByIdForUpdate(@Param("id") UUID id);

  /**
   * Ids of auctions the clock has caught up with, oldest first.
   *
   * <p>Ids rather than entities, and paged: a backlog after downtime could be any size, and the
   * point of this query is to hand the settler a bounded batch to work through one row lock at a
   * time, not to pull a day of listings into memory.
   */
  @Query(
      "select a.id from Auction a where a.status = :status and a.endTime <= :now order by a.endTime asc")
  List<UUID> findDueToClose(
      @Param("status") AuctionStatus status, @Param("now") Instant now, Pageable page);

  /** Ids of approved auctions whose opening time has arrived. */
  @Query(
      "select a.id from Auction a where a.status = :status and a.startTime <= :now order by a.startTime asc")
  List<UUID> findDueToOpen(
      @Param("status") AuctionStatus status, @Param("now") Instant now, Pageable page);

  List<Auction> findByIdIn(Collection<UUID> ids);

  long countBySellerIdAndStatusIn(UUID sellerId, Collection<AuctionStatus> statuses);

  /** Live listing counts for a page of causes, in one grouped query. */
  @Query(
      """
      select a.causeId as causeId, count(a) as total
      from Auction a
      where a.causeId in :causeIds and a.status in :statuses
      group by a.causeId
      """)
  List<CauseTally> countByCause(
      @Param("causeIds") Collection<UUID> causeIds,
      @Param("statuses") Collection<AuctionStatus> statuses);
}
