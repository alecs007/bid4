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

  /** Who is ahead on one auction, as a pair rather than a whole row. */
  interface Leader {
    UUID getAuctionId();

    UUID getBidderId();
  }

  /** Public bid history, highest first. */
  List<Bid> findByAuctionIdOrderByAmountDesc(UUID auctionId);

  Optional<Bid> findByAuctionIdAndBidderId(UUID auctionId, UUID bidderId);

  /**
   * The offer that wins, if any.
   *
   * <p>Highest first, and on a tie the one that got there first — reaching a price earlier is what
   * breaks it, not who happened to be read back first.
   */
  Optional<Bid> findFirstByAuctionIdOrderByAmountDescCreatedAtAsc(UUID auctionId);

  long countByAuctionId(UUID auctionId);

  List<Bid> findByBidderIdOrderByCreatedAtDesc(UUID bidderId);

  /**
   * Steps every standing offer on an auction down, in one statement.
   *
   * <p>Done before the new leader is written, because at most one WINNING row per auction is a
   * partial unique index — demoting first is what keeps the insert from colliding with the offer it
   * is replacing.
   *
   * <p>Flushes first, so a bid deleted earlier in the same call is already gone when this runs. It
   * deliberately does not clear: the caller is holding the managed Auction it is about to write and
   * to map, and detaching that mid-transaction turns its lazy collections into a
   * LazyInitializationException at the response boundary. Nothing re-reads the demoted rows in this
   * transaction, so leaving them stale in the session costs nothing.
   */
  @Modifying(flushAutomatically = true)
  @Query("update Bid b set b.status = :status where b.auctionId = :auctionId")
  int demoteAllFor(@Param("auctionId") UUID auctionId, @Param("status") BidStatus status);

  /**
   * Sets one bid's status without going through the persistence context.
   *
   * <p>Settlement marks every bid on the auction and then lifts the winner back out, and a bulk
   * update has already bypassed any copy held in memory. Addressing the row by id keeps the two
   * statements consistent instead of racing a stale entity.
   */
  @Modifying(flushAutomatically = true)
  @Query("update Bid b set b.status = :status where b.id = :id")
  int markStatus(@Param("id") UUID id, @Param("status") BidStatus status);

  /**
   * Who leads each of these auctions.
   *
   * <p>Answered from the partial unique index on WINNING rather than by ranking every auction's
   * history, so a page of cards costs one indexed lookup in total.
   */
  @Query(
      """
      select b.auctionId as auctionId, b.bidderId as bidderId
      from Bid b
      where b.auctionId in :auctionIds and b.status = :status
      """)
  List<Leader> findLeaders(
      @Param("auctionIds") Collection<UUID> auctionIds, @Param("status") BidStatus status);

  /** Which of these auctions the viewer already has an offer on. */
  @Query(
      "select b.auctionId from Bid b where b.bidderId = :bidderId and b.auctionId in :auctionIds")
  List<UUID> findAuctionIdsBidOnBy(
      @Param("bidderId") UUID bidderId, @Param("auctionIds") Collection<UUID> auctionIds);
}
