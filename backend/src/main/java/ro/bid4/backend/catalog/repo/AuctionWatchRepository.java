package ro.bid4.backend.catalog.repo;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ro.bid4.backend.catalog.domain.AuctionWatch;
import ro.bid4.backend.catalog.domain.AuctionWatchId;

public interface AuctionWatchRepository extends JpaRepository<AuctionWatch, AuctionWatchId> {

  /** Which of these auctions the viewer follows, in one lookup rather than one per card. */
  @Query(
      """
      select w.id.auctionId from AuctionWatch w
      where w.id.userId = :userId and w.id.auctionId in :auctionIds
      """)
  List<UUID> findWatchedAuctionIds(
      @Param("userId") UUID userId, @Param("auctionIds") Collection<UUID> auctionIds);

  /** Everything the reader follows, newest first. */
  @Query(
      """
      select w.id.auctionId from AuctionWatch w
      where w.id.userId = :userId order by w.createdAt desc
      """)
  List<UUID> findWatchedAuctionIdsFor(@Param("userId") UUID userId);
}
