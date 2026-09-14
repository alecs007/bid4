package ro.bid4.backend.catalog.repo;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ro.bid4.backend.catalog.domain.Bid;
import ro.bid4.backend.catalog.domain.BidStatus;

public interface BidRepository extends JpaRepository<Bid, UUID> {
  interface Leader {
    UUID getAuctionId();

    UUID getBidderId();
  }

  List<Bid> findByAuctionIdOrderByAmountDesc(UUID auctionId);

  Optional<Bid> findByAuctionIdAndBidderId(UUID auctionId, UUID bidderId);

  Optional<Bid> findFirstByAuctionIdOrderByAmountDescCreatedAtAsc(UUID auctionId);

  long countByAuctionId(UUID auctionId);

  List<Bid> findByBidderIdOrderByCreatedAtDesc(UUID bidderId);

  @Modifying(flushAutomatically = true)
  @Query("update Bid b set b.status = :status where b.auctionId = :auctionId")
  int demoteAllFor(@Param("auctionId") UUID auctionId, @Param("status") BidStatus status);

  @Modifying(flushAutomatically = true)
  @Query("update Bid b set b.status = :status where b.auctionId = :auctionId and b.id <> :exceptId")
  int demoteAllExcept(
      @Param("auctionId") UUID auctionId,
      @Param("status") BidStatus status,
      @Param("exceptId") UUID exceptId);

  @Query("select b.id as id, b.amount as amount from Bid b where b.id in :ids")
  List<Amount> findAmounts(@Param("ids") Collection<UUID> ids);

  interface Amount {
    UUID getId();

    long getAmount();
  }

  @Modifying(flushAutomatically = true)
  @Query("update Bid b set b.status = :status where b.id = :id")
  int markStatus(@Param("id") UUID id, @Param("status") BidStatus status);

  @Query(
      """
      select b.auctionId as auctionId, b.bidderId as bidderId
      from Bid b
      where b.auctionId in :auctionIds and b.status = :status
      """)
  List<Leader> findLeaders(
      @Param("auctionIds") Collection<UUID> auctionIds, @Param("status") BidStatus status);

  @Query(
      "select b.auctionId from Bid b where b.bidderId = :bidderId and b.auctionId in :auctionIds")
  List<UUID> findAuctionIdsBidOnBy(
      @Param("bidderId") UUID bidderId, @Param("auctionIds") Collection<UUID> auctionIds);
}
