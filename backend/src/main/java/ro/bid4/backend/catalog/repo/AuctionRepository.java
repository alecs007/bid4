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
   * <p>Newest first and capped, so the work stays bounded by a constant rather than by how well the
   * platform is doing. Nothing closes on a timer any more, so recency is what decides which
   * listings are worth ranking when there are more of them than fit.
   */
  List<Auction> findByStatusOrderByCreatedAtDesc(AuctionStatus status, Limit limit);

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
   * Sales whose parcel is late, oldest first.
   *
   * <p>Ids rather than entities, and paged: whoever chases these should work through a bounded
   * batch one row at a time rather than pull every overdue sale into memory.
   */
  @Query(
      "select a.id from Auction a where a.status = :status and a.dispatchDeadline <= :now"
          + " order by a.dispatchDeadline asc")
  List<UUID> findOverdueDispatches(
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
