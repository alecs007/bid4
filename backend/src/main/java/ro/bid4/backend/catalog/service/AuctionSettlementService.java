package ro.bid4.backend.catalog.service;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.catalog.domain.Auction;
import ro.bid4.backend.catalog.domain.AuctionStatus;
import ro.bid4.backend.catalog.domain.Bid;
import ro.bid4.backend.catalog.domain.BidStatus;
import ro.bid4.backend.catalog.repo.AuctionRepository;
import ro.bid4.backend.catalog.repo.BidRepository;

/**
 * Moves one auction across the transitions the clock owns, rather than a person.
 *
 * <p>Until this existed nothing closed an auction. The clock ran out, the page said "Încheiată"
 * because it compares the end time against now, and the row stayed LIVE forever — so there was no
 * winner, no losing bids, and nothing for an order to be built from. Every escrow flow starts here.
 *
 * <p>Each transition is its own transaction, deliberately. A batch that settled in one would hold a
 * lock per auction until the last one finished, and one bad row would roll back the lot. Here a
 * failure costs exactly the auction it happened on, and the next tick picks it up again.
 */
@Service
public class AuctionSettlementService {

  private static final Logger log = LoggerFactory.getLogger(AuctionSettlementService.class);

  private final AuctionRepository auctions;
  private final BidRepository bids;

  public AuctionSettlementService(AuctionRepository auctions, BidRepository bids) {
    this.auctions = auctions;
    this.bids = bids;
  }

  /**
   * Closes an auction whose time is up: a winner and an order to build, or nothing sold.
   *
   * @return whether this call is the one that closed it
   */
  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public boolean settle(UUID auctionId) {
    Auction auction = auctions.findByIdForUpdate(auctionId).orElse(null);
    Instant now = Instant.now();

    // Re-read the reason for being here now that the row is held. Between the
    // query that chose it and this lock, a last-second bid may have pushed the
    // close out by the anti-snipe window, or a buy-now may have ended it
    // already. Both make this call a no-op rather than a mistake, which is also
    // what makes running the clock twice harmless.
    if (auction == null
        || auction.getStatus() != AuctionStatus.LIVE
        || auction.getEndTime().isAfter(now)) {
      return false;
    }

    Optional<Bid> top = bids.findFirstByAuctionIdOrderByAmountDescCreatedAtAsc(auctionId);

    // A reserve is met by bidding, never by the opening price: with no offers at
    // all, current_price is still the starting price and would clear a low
    // reserve on its own.
    boolean sold = top.isPresent() && auction.isReserveMet();

    // Everything loses first, then the winner is lifted back out. Two statements
    // whatever the auction drew, rather than one per bid.
    bids.demoteAllFor(auctionId, BidStatus.LOST);

    if (sold) {
      Bid winner = top.get();
      bids.markStatus(winner.getId(), BidStatus.WON);
      auction.setWinnerId(winner.getBidderId());
      auction.setStatus(AuctionStatus.SOLD);
      log.info(
          "Auction {} sold to {} at {} bani", auctionId, winner.getBidderId(), winner.getAmount());
    } else {
      auction.setStatus(AuctionStatus.UNSOLD);
      log.info(
          "Auction {} closed unsold ({})",
          auctionId,
          top.isEmpty() ? "no bids" : "reserve not met");
    }

    auction.setUpdatedAt(now);
    auctions.save(auction);
    return true;
  }

  /**
   * Opens an approved auction whose start time has arrived.
   *
   * @return whether this call is the one that opened it
   */
  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public boolean open(UUID auctionId) {
    Auction auction = auctions.findByIdForUpdate(auctionId).orElse(null);
    Instant now = Instant.now();

    if (auction == null
        || auction.getStatus() != AuctionStatus.SCHEDULED
        || auction.getStartTime().isAfter(now)) {
      return false;
    }

    // Its whole window elapsed while nothing was promoting it — after downtime,
    // or on seed data older than the deploy. Opening it would put a listing
    // nobody can win back on the shelf for one tick, so it closes instead. It
    // never accepted a bid, so there is nothing to settle.
    if (!auction.getEndTime().isAfter(now)) {
      auction.setStatus(AuctionStatus.UNSOLD);
      auction.setUpdatedAt(now);
      auctions.save(auction);
      log.info("Auction {} expired before it ever opened", auctionId);
      return true;
    }

    auction.setStatus(AuctionStatus.LIVE);
    auction.setUpdatedAt(now);
    auctions.save(auction);
    log.info("Auction {} is now live", auctionId);
    return true;
  }
}
