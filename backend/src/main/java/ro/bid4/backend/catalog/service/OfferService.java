package ro.bid4.backend.catalog.service;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.catalog.api.dto.AuctionResponse;
import ro.bid4.backend.catalog.domain.Auction;
import ro.bid4.backend.catalog.domain.AuctionStatus;
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

  public OfferService(
      AuctionRepository auctions, BidRepository bids, AuctionMapper mapper, OrderService orders) {
    this.auctions = auctions;
    this.bids = bids;
    this.mapper = mapper;
    this.orders = orders;
  }

  @Transactional
  public AuctionResponse accept(UUID auctionId, UUID bidId, Viewer seller) {
    Auction auction = lockOwned(auctionId, seller);

    if (auction.getStatus() == AuctionStatus.RESERVED) {
      throw new ApiException(
          ErrorCode.CONFLICT,
          "Ai deja o ofertă acceptată. Anuleaz-o mai întâi, apoi poți accepta alta.");
    }
    if (auction.getStatus() != AuctionStatus.LIVE) {
      throw new ApiException(ErrorCode.CONFLICT, "Anunțul nu mai acceptă oferte.");
    }

    Bid offer =
        bids.findById(bidId)
            .filter(bid -> bid.getAuctionId().equals(auctionId))
            .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Oferta nu există."));

    if (offer.getStatus() == BidStatus.LOST) {
      throw new ApiException(ErrorCode.CONFLICT, "Oferta a fost retrasă.");
    }

    Instant now = Instant.now();
    auction.setStatus(AuctionStatus.RESERVED);
    auction.setWinnerId(offer.getBidderId());
    auction.setAcceptedBidId(offer.getId());
    auction.setAcceptedAt(now);
    auction.setUpdatedAt(now);

    bids.markStatus(offer.getId(), BidStatus.ACCEPTED);

    orders.open(auction, offer.getBidderId(), offer.getAmount());

    log.info(
        "Auction {} reserved for {} at {} bani", auctionId, offer.getBidderId(), offer.getAmount());
    return mapper.toResponse(auctions.save(auction), seller.id());
  }

  @Transactional
  public AuctionResponse release(UUID auctionId, Viewer seller) {
    Auction auction = lockOwned(auctionId, seller);

    if (auction.getStatus() == AuctionStatus.SOLD) {
      throw new ApiException(ErrorCode.CONFLICT, "Comanda este deja plătită.");
    }
    if (auction.getStatus() != AuctionStatus.RESERVED) {
      throw new ApiException(ErrorCode.CONFLICT, "Anunțul nu are o ofertă acceptată.");
    }

    Instant now = Instant.now();

    auction.setStatus(AuctionStatus.LIVE);
    auction.setWinnerId(null);
    auction.setAcceptedBidId(null);
    auction.setAcceptedAt(null);
    auction.setUpdatedAt(now);

    bids.demoteAllFor(auctionId, BidStatus.OUTBID);
    bids.findFirstByAuctionIdOrderByAmountDescCreatedAtAsc(auctionId)
        .ifPresent(top -> bids.markStatus(top.getId(), BidStatus.WINNING));

    log.info("Auction {} released back to the room by its seller", auctionId);
    return mapper.toResponse(auctions.save(auction), seller.id());
  }

  @Transactional
  public Auction markPaid(UUID auctionId) {
    Auction auction =
        auctions
            .findByIdForUpdate(auctionId)
            .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Anunțul nu există."));

    if (auction.getStatus() != AuctionStatus.RESERVED) {
      throw new ApiException(ErrorCode.CONFLICT, "Anunțul nu așteaptă o plată.");
    }

    Instant now = Instant.now();
    UUID acceptedBidId = auction.getAcceptedBidId();

    bids.demoteAllFor(auctionId, BidStatus.LOST);
    if (acceptedBidId != null) {
      bids.markStatus(acceptedBidId, BidStatus.WON);
    }

    auction.setStatus(AuctionStatus.SOLD);
    auction.setDispatchDeadline(now.plus(Duration.ofDays(CatalogRules.DISPATCH_DAYS)));
    auction.setUpdatedAt(now);

    log.info("Auction {} paid; dispatch due by {}", auctionId, auction.getDispatchDeadline());
    return auctions.save(auction);
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
