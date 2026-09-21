package ro.bid4.backend.catalog.service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import ro.bid4.backend.catalog.domain.Auction;
import ro.bid4.backend.catalog.domain.Bid;
import ro.bid4.backend.catalog.domain.BidStatus;
import ro.bid4.backend.catalog.repo.BidRepository;

@Component
public class Standings {
  private final BidRepository bids;

  public Standings(BidRepository bids) {
    this.bids = bids;
  }

  public void rebalance(Auction auction) {
    List<Bid> ordered = bids.findByAuctionIdOrderByAmountDesc(auction.getId());
    Bid leader =
        ordered.stream()
            .filter(
                bid -> bid.getStatus() == BidStatus.WINNING || bid.getStatus() == BidStatus.OUTBID)
            .findFirst()
            .orElse(null);

    for (Bid bid : ordered) {
      if (bid.getStatus() == BidStatus.WINNING && bid != leader) {
        bid.setStatus(BidStatus.OUTBID);
      }
    }
    bids.saveAllAndFlush(ordered);

    if (leader != null && leader.getStatus() != BidStatus.WINNING) {
      leader.setStatus(BidStatus.WINNING);
      bids.saveAndFlush(leader);
    }

    auction.setCurrentPrice(
        ordered.stream()
            .filter(bid -> bid.getStatus() != BidStatus.LOST)
            .mapToLong(Bid::getAmount)
            .max()
            .orElse(auction.getStartingPrice()));
    auction.setBidCount(ordered.size());
  }

  public void reopen(Auction auction, UUID bidderId) {
    bids.findByAuctionIdAndBidderId(auction.getId(), bidderId)
        .filter(bid -> bid.getStatus() == BidStatus.ACCEPTED)
        .ifPresent(
            bid -> {
              bid.setStatus(BidStatus.OUTBID);
              bids.saveAndFlush(bid);
            });
    rebalance(auction);
  }

  public Optional<Bid> bidOf(UUID auctionId, UUID bidderId) {
    return bids.findByAuctionIdAndBidderId(auctionId, bidderId);
  }

  public void close(Auction auction, UUID winnerId) {
    List<Bid> ordered = bids.findByAuctionIdOrderByAmountDesc(auction.getId());
    for (Bid bid : ordered) {
      bid.setStatus(bid.getBidderId().equals(winnerId) ? BidStatus.WON : BidStatus.LOST);
    }
    bids.saveAllAndFlush(ordered);
  }
}
