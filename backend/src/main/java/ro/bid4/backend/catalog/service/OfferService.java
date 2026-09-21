package ro.bid4.backend.catalog.service;

import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.catalog.api.dto.AuctionResponse;
import ro.bid4.backend.catalog.domain.Auction;
import ro.bid4.backend.catalog.domain.Bid;
import ro.bid4.backend.catalog.domain.BidStatus;
import ro.bid4.backend.catalog.repo.AuctionRepository;
import ro.bid4.backend.catalog.repo.BidRepository;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.common.error.ErrorCode;
import ro.bid4.backend.common.web.Viewer;
import ro.bid4.backend.orders.service.OrderService;

@Service
public class OfferService {
  private static final Logger log = LoggerFactory.getLogger(OfferService.class);

  private final AuctionRepository auctions;
  private final BidRepository bids;
  private final AuctionMapper mapper;
  private final OrderService orders;
  private final Standings standings;

  public OfferService(
      AuctionRepository auctions,
      BidRepository bids,
      AuctionMapper mapper,
      OrderService orders,
      Standings standings) {
    this.auctions = auctions;
    this.bids = bids;
    this.mapper = mapper;
    this.orders = orders;
    this.standings = standings;
  }

  @Transactional
  public AuctionResponse accept(UUID auctionId, UUID bidId, Viewer seller) {
    Auction auction = lockOwned(auctionId, seller);

    if (!auction.isOpenForBids()) {
      throw new ApiException(ErrorCode.CONFLICT, "Anunțul nu mai acceptă oferte.");
    }

    Bid offer =
        bids.findById(bidId)
            .filter(bid -> bid.getAuctionId().equals(auctionId))
            .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Oferta nu există."));

    if (offer.getStatus() == BidStatus.LOST || offer.getStatus() == BidStatus.WON) {
      throw new ApiException(ErrorCode.CONFLICT, "Oferta nu mai este activă.");
    }

    if (offer.getStatus() != BidStatus.ACCEPTED) {
      offer.setStatus(BidStatus.ACCEPTED);
      bids.saveAndFlush(offer);
      standings.rebalance(auction);
      auction.setUpdatedAt(Instant.now());
      auctions.save(auction);
    }

    orders.open(auction, offer.getBidderId(), offer.getAmount());

    log.info(
        "Offer {} on {} accepted for {} at {} bani",
        offer.getId(),
        auctionId,
        offer.getBidderId(),
        offer.getAmount());
    return mapper.toResponse(auction, seller.id());
  }

  private Auction lockOwned(UUID auctionId, Viewer seller) {
    if (seller.isAnonymous()) {
      throw new ApiException(ErrorCode.UNAUTHENTICATED);
    }

    Auction auction =
        auctions
            .findByIdForUpdate(auctionId)
            .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Anunțul nu există."));

    if (!auction.getSellerId().equals(seller.id())) {
      throw new ApiException(ErrorCode.NOT_FOUND, "Anunțul nu există.");
    }
    return auction;
  }
}
