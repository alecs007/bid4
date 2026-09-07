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

/**
 * What happens to a listing after somebody makes an offer on it.
 *
 * <p>There is no clock, so nothing here runs on a schedule and no listing settles itself. A seller
 * reads the offers and takes one, which is the whole reason the timer went: the highest offer is
 * not always the one a seller wants, and a deadline forced them to take it anyway.
 *
 * <p>Three steps, and the middle one is reversible. Accepting reserves the listing for a buyer;
 * until that buyer pays, the seller can hand it back to the room. Payment is what makes it a sale —
 * that is when the other offers lose, the row becomes undeletable, and the seller starts owing a
 * parcel.
 *
 * <p>Every step takes the row lock first. Two browser tabs accepting two different offers is the
 * obvious way to end up with two buyers for one item.
 */
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

  /**
   * The seller takes one of the offers.
   *
   * <p>Any of them, not the highest: that is the point. The listing is held for that buyer, and
   * goes on taking offers while it waits to be paid — so if something better arrives, the seller
   * can release this one and take that instead.
   */
  @Transactional
  public AuctionResponse accept(UUID auctionId, UUID bidId, Viewer seller) {
    Auction auction = lockOwned(auctionId, seller);

    // One acceptance at a time. The listing goes on taking offers while it is
    // reserved, and a better one arriving is exactly why — but switching to it
    // means letting the first buyer go first, which is a decision of its own.
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

    // The other offers are left exactly as they are. The seller can still release
    // this one, and demoting the rest now would mean resurrecting them if they do.
    bids.markStatus(offer.getId(), BidStatus.ACCEPTED);

    // The sale opens in the same transaction as the acceptance. An acceptance
    // without an order is a listing neither party can act on, and an order
    // without one is a sale nobody agreed to.
    orders.open(auction, offer.getBidderId(), offer.getAmount());

    log.info(
        "Auction {} reserved for {} at {} bani", auctionId, offer.getBidderId(), offer.getAmount());
    return mapper.toResponse(auctions.save(auction), seller.id());
  }

  /**
   * The seller takes the acceptance back, before any money has moved.
   *
   * <p>The escape hatch for a buyer who is accepted and then goes quiet. Once they have paid this
   * is refused: at that point it is a refund, which is a different conversation and a different
   * record.
   */
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

    // The room goes back to reading the way it did before the acceptance:
    // everyone outbid, and whoever holds the highest offer leading again.
    // Recomputed rather than handed back, because the offer that was accepted
    // was not necessarily the top one — and if it was, there is no leader left
    // to hand it to, and the listing would sit live with nobody winning it.
    bids.demoteAllFor(auctionId, BidStatus.OUTBID);
    bids.findFirstByAuctionIdOrderByAmountDescCreatedAtAsc(auctionId)
        .ifPresent(top -> bids.markStatus(top.getId(), BidStatus.WINNING));

    log.info("Auction {} released back to the room by its seller", auctionId);
    return mapper.toResponse(auctions.save(auction), seller.id());
  }

  /**
   * The money arrived.
   *
   * <p>The seam the payment subsystem calls into once it exists. Everything that makes a sale final
   * happens here and nowhere else: the losing offers are told, the row becomes undeletable, and the
   * dispatch deadline starts — from payment rather than from acceptance, because a seller should
   * not be running late for a parcel they have not been paid for.
   *
   * <p>The only one of the three that answers with the entity rather than a response. There is no
   * viewer to map it for: the caller is a payment, not a person.
   */
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

    // Everything loses, then the accepted offer is lifted back out: two statements
    // whatever the listing drew, rather than one per offer.
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

  /** The row, held, and only if this viewer is the one who put it up. */
  private Auction lockOwned(UUID auctionId, Viewer seller) {
    if (seller.isAnonymous()) {
      throw new ApiException(ErrorCode.UNAUTHENTICATED);
    }

    Auction auction =
        auctions
            .findByIdForUpdate(auctionId)
            .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Anunțul nu există."));

    if (!auction.getSellerId().equals(seller.id())) {
      // Not found rather than forbidden: whether somebody else's listing exists is
      // not something this caller gets to confirm.
      throw new ApiException(ErrorCode.NOT_FOUND, "Anunțul nu există.");
    }
    return auction;
  }
}
