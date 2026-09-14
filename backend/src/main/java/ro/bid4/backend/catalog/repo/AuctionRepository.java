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
  interface CauseTally {
    UUID getCauseId();

    long getTotal();
  }

  List<Auction> findByStatusOrderByCreatedAtDesc(AuctionStatus status, Limit limit);

  List<Auction> findBySellerIdOrderByCreatedAtDesc(UUID sellerId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select a from Auction a where a.id = :id")
  Optional<Auction> findByIdForUpdate(@Param("id") UUID id);

  @Query(
      "select a.id from Auction a where a.status = :status and a.dispatchDeadline <= :now"
          + " order by a.dispatchDeadline asc")
  List<UUID> findOverdueDispatches(
      @Param("status") AuctionStatus status, @Param("now") Instant now, Pageable page);

  List<Auction> findByIdIn(Collection<UUID> ids);

  long countBySellerIdAndStatusIn(UUID sellerId, Collection<AuctionStatus> statuses);

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
