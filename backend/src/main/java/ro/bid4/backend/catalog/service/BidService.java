package ro.bid4.backend.catalog.service;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.catalog.api.dto.AuctionResponse;
import ro.bid4.backend.catalog.api.dto.BidResponse;
import ro.bid4.backend.catalog.api.dto.PlaceBidResponse;
import ro.bid4.backend.catalog.domain.Auction;
import ro.bid4.backend.catalog.domain.AuctionWatch;
import ro.bid4.backend.catalog.domain.AuctionWatchId;
import ro.bid4.backend.catalog.domain.Bid;
import ro.bid4.backend.catalog.domain.BidStatus;
import ro.bid4.backend.catalog.repo.AuctionRepository;
import ro.bid4.backend.catalog.repo.AuctionWatchRepository;
import ro.bid4.backend.catalog.repo.BidRepository;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.common.error.ErrorCode;
import ro.bid4.backend.common.web.Viewer;
import ro.bid4.backend.inbox.service.ThreadEvents;
import ro.bid4.backend.orders.service.OrderService;
import ro.bid4.backend.orders.service.Terms;

@Service
public class BidService {
  private static final Logger log = LoggerFactory.getLogger(BidService.class);

  private final AuctionRepository auctions;
  private final BidRepository bids;
  private final AuctionWatchRepository watches;
  private final AuctionMapper mapper;
  private final ThreadEvents threads;
  private final Standings standings;
  private final OrderService orders;

  public BidService(
      AuctionRepository auctions,
      BidRepository bids,
      AuctionWatchRepository watches,
      AuctionMapper mapper,
      ThreadEvents threads,
      Standings standings,
      OrderService orders) {
    this.auctions = auctions;
    this.bids = bids;
    this.watches = watches;
    this.mapper = mapper;
    this.threads = threads;
    this.standings = standings;
    this.orders = orders;
  }

  public static long minimumBid(Auction auction) {
    return auction.getBidCount() == 0
        ? auction.getStartingPrice()
        : auction.getCurrentPrice() + auction.getBidIncrement();
  }

  @Transactional
  public PlaceBidResponse place(
      UUID auctionId, long amount, String acceptedTermsVersion, Viewer viewer) {
    if (viewer.isAnonymous()) {
      throw new ApiException(ErrorCode.UNAUTHENTICATED);
    }

    if (!Terms.CURRENT_VERSION.equals(acceptedTermsVersion)) {
      throw new ApiException(
          ErrorCode.TERMS_REQUIRED,
          "Trebuie să accepți condițiile de licitare pentru a trimite o ofertă.");
    }

    Auction auction =
        auctions.findByIdForUpdate(auctionId).orElseThrow(() -> ApiException.notFound("Licitația"));

    Instant now = Instant.now();
    if (!auction.isOpenForBids()) {
      log.debug("Bid refused on {}: not open (status {})", auctionId, auction.getStatus());
      throw new ApiException(ErrorCode.AUCTION_NOT_LIVE, "Anunțul nu mai acceptă oferte.");
    }
    if (viewer.is(auction.getSellerId())) {
      throw ApiException.forbidden("Nu poți licita la propriul anunț.");
    }

    if (amount > CatalogRules.MAX_BID) {
      throw new ApiException(
          ErrorCode.BID_TOO_HIGH,
          "Oferta depășește maximul acceptat de " + formatLei(CatalogRules.MAX_BID) + ".");
    }

    boolean boughtNow = auction.isBuyNowReachedBy(amount);

    if (!boughtNow) {
      long minimum = minimumBid(auction);
      if (amount < minimum) {
        log.debug("Bid of {} refused on {}: below the minimum of {}", amount, auctionId, minimum);
        throw new ApiException(
            ErrorCode.BID_TOO_LOW, "Oferta minimă este " + formatLei(minimum) + ".");
      }
    }

    Optional<Bid> previous = bids.findByAuctionIdAndBidderId(auctionId, viewer.id());
    if (previous.map(bid -> bid.getStatus() == BidStatus.ACCEPTED).orElse(false)) {
      throw new ApiException(
          ErrorCode.CONFLICT, "Oferta ta a fost acceptată. Finalizează comanda din conversație.");
    }
    previous.ifPresent(bids::delete);
    bids.flush();

    long price = boughtNow ? auction.getBuyNowPrice() : amount;

    Bid bid = new Bid();
    bid.setAuctionId(auctionId);
    bid.setBidderId(viewer.id());
    bid.setAmount(price);
    bid.setStatus(boughtNow ? BidStatus.ACCEPTED : BidStatus.OUTBID);
    bid.setTermsVersion(Terms.CURRENT_VERSION);
    bid.setTermsAcceptedAt(now);
    bids.saveAndFlush(bid);

    standings.rebalance(auction);
    auctions.save(auction);

    if (boughtNow) {
      orders.open(auction, viewer.id(), price);
      log.info(
          "Auction {} taken at the buy-now price by {} at {} bani (offered {})",
          auctionId,
          viewer.id(),
          price,
          amount);
    } else {
      log.info("Bid placed on {}: {} bani by {}", auctionId, price, viewer.id());
    }

    long before = previous.map(Bid::getAmount).orElse(0L);
    threads.offer(
        auctionId,
        viewer.id(),
        auction.getSellerId(),
        before > 0 ? "OFFER_RAISED" : "OFFER_PLACED",
        before > 0 ? "Oferta a fost majorată." : "A fost trimisă o ofertă.",
        before > 0
            ? Map.of("amount", String.valueOf(price), "previous", String.valueOf(before))
            : Map.of("amount", String.valueOf(price)));

    AuctionResponse view = mapper.toResponse(auction, viewer.id());
    BidResponse placed = mapper.toBidResponse(bid, viewer.id());
    return new PlaceBidResponse(placed, view, boughtNow ? true : null);
  }

  @Transactional
  public AuctionResponse retract(UUID auctionId, Viewer viewer) {
    if (viewer.isAnonymous()) {
      throw new ApiException(ErrorCode.UNAUTHENTICATED);
    }

    Auction auction =
        auctions.findByIdForUpdate(auctionId).orElseThrow(() -> ApiException.notFound("Licitația"));

    if (!auction.isOpenForBids()) {
      throw new ApiException(ErrorCode.RETRACT_NOT_ALLOWED, "Anunțul nu mai acceptă modificări.");
    }

    Bid mine =
        bids.findByAuctionIdAndBidderId(auctionId, viewer.id())
            .orElseThrow(
                () ->
                    new ApiException(
                        ErrorCode.RETRACT_NOT_ALLOWED, "Nu ai o ofertă activă la acest anunț."));
    if (mine.getStatus() == BidStatus.ACCEPTED || mine.getStatus() == BidStatus.WON) {
      throw new ApiException(
          ErrorCode.RETRACT_NOT_ALLOWED,
          "Oferta ta a fost acceptată, așa că nu mai poate fi retrasă.");
    }

    bids.delete(mine);
    bids.flush();
    standings.rebalance(auction);
    auctions.save(auction);

    threads.offer(
        auctionId,
        viewer.id(),
        auction.getSellerId(),
        "OFFER_WITHDRAWN",
        "Oferta a fost retrasă.",
        Map.of("amount", String.valueOf(mine.getAmount())));

    log.info(
        "Bid retracted on {} by {}; price back to {} bani",
        auctionId,
        viewer.id(),
        auction.getCurrentPrice());

    return mapper.toResponse(auction, viewer.id());
  }

  @Transactional
  public boolean toggleWatch(UUID auctionId, Viewer viewer) {
    if (viewer.isAnonymous()) {
      throw new ApiException(ErrorCode.UNAUTHENTICATED);
    }

    Auction auction =
        auctions.findByIdForUpdate(auctionId).orElseThrow(() -> ApiException.notFound("Licitația"));
    if (!auction.getStatus().isPublic() && !viewer.is(auction.getSellerId())) {
      throw ApiException.notFound("Licitația");
    }

    AuctionWatchId id = new AuctionWatchId(auctionId, viewer.id());
    if (watches.existsById(id)) {
      watches.deleteById(id);
      auction.setWatcherCount(Math.max(0, auction.getWatcherCount() - 1));
      auctions.save(auction);
      return false;
    }

    watches.save(new AuctionWatch(id));
    auction.setWatcherCount(auction.getWatcherCount() + 1);
    auctions.save(auction);
    return true;
  }

  private static String formatLei(long bani) {
    return String.format(java.util.Locale.of("ro", "RO"), "%,.2f lei", bani / 100d);
  }
}
