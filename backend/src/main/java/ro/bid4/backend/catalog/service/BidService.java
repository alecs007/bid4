package ro.bid4.backend.catalog.service;

import java.time.Instant;
import java.util.List;
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
import ro.bid4.backend.catalog.domain.AuctionStatus;
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
import ro.bid4.backend.identity.domain.UserAccount;
import ro.bid4.backend.identity.repo.UserAccountRepository;
import ro.bid4.backend.inbox.service.ThreadEvents;
import ro.bid4.backend.orders.service.Terms;

@Service
public class BidService {
  private static final Logger log = LoggerFactory.getLogger(BidService.class);

  private final AuctionRepository auctions;
  private final BidRepository bids;
  private final AuctionWatchRepository watches;
  private final UserAccountRepository users;
  private final AuctionMapper mapper;
  private final ThreadEvents threads;

  public BidService(
      AuctionRepository auctions,
      BidRepository bids,
      AuctionWatchRepository watches,
      UserAccountRepository users,
      AuctionMapper mapper,
      ThreadEvents threads) {
    this.auctions = auctions;
    this.bids = bids;
    this.watches = watches;
    this.users = users;
    this.mapper = mapper;
    this.threads = threads;
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

    requireBiddingUnlocked(viewer.id());

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
    previous.ifPresent(bids::delete);
    bids.flush();

    long price = boughtNow ? auction.getBuyNowPrice() : amount;

    BidStatus demoted = boughtNow ? BidStatus.LOST : BidStatus.OUTBID;
    UUID accepted = auction.getAcceptedBidId();
    if (accepted == null) {
      bids.demoteAllFor(auctionId, demoted);
    } else {
      bids.demoteAllExcept(auctionId, demoted, accepted);
    }
    bids.flush();

    Bid bid = new Bid();
    bid.setAuctionId(auctionId);
    bid.setBidderId(viewer.id());
    bid.setAmount(price);
    bid.setStatus(boughtNow ? BidStatus.ACCEPTED : BidStatus.WINNING);
    bid.setTermsVersion(Terms.CURRENT_VERSION);
    bid.setTermsAcceptedAt(now);
    bids.save(bid);
    bids.flush();

    auction.setCurrentPrice(price);
    auction.setBidCount((int) bids.countByAuctionId(auctionId));
    if (boughtNow) {
      auction.setStatus(AuctionStatus.RESERVED);
      auction.setWinnerId(viewer.id());
      auction.setAcceptedBidId(bid.getId());
      auction.setAcceptedAt(now);
    }
    auctions.save(auction);

    if (boughtNow) {
      log.info(
          "Auction {} bought outright by {} at {} bani (offered {})",
          auctionId,
          viewer.id(),
          price,
          amount);
    } else {
      log.info("Bid accepted on {}: {} bani by {}", auctionId, price, viewer.id());
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

    List<Bid> ordered = bids.findByAuctionIdOrderByAmountDesc(auctionId);
    if (ordered.isEmpty() || !ordered.getFirst().getBidderId().equals(viewer.id())) {
      throw new ApiException(
          ErrorCode.RETRACT_NOT_ALLOWED, "Poți retrage doar propria ofertă aflată pe primul loc.");
    }

    Bid top = ordered.getFirst();
    if (top.getId().equals(auction.getAcceptedBidId())) {
      throw new ApiException(
          ErrorCode.RETRACT_NOT_ALLOWED,
          "Oferta ta a fost acceptată, așa că nu mai poate fi retrasă.");
    }
    bids.delete(top);
    bids.flush();

    Bid next = ordered.size() > 1 ? ordered.get(1) : null;
    if (next != null && !next.getId().equals(auction.getAcceptedBidId())) {
      next.setStatus(BidStatus.WINNING);
      bids.save(next);
    }

    auction.setCurrentPrice(next == null ? auction.getStartingPrice() : next.getAmount());
    auction.setBidCount(Math.max(0, auction.getBidCount() - 1));
    auctions.save(auction);

    threads.offer(
        auctionId,
        viewer.id(),
        auction.getSellerId(),
        "OFFER_WITHDRAWN",
        "Oferta a fost retrasă.",
        Map.of("amount", String.valueOf(top.getAmount())));

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

  private void requireBiddingUnlocked(UUID userId) {
    UserAccount account =
        users.findById(userId).orElseThrow(() -> new ApiException(ErrorCode.UNAUTHENTICATED));

    boolean hasCard = users.hasPaymentMethod(userId);
    boolean hasDelivery = account.getDefaultDeliveryMethodId() != null;

    if (!hasCard && !hasDelivery) {
      throw new ApiException(
          ErrorCode.BID_NOT_ALLOWED, "Adaugă un card și o metodă de livrare pentru a licita.");
    }
    if (!hasCard) {
      throw new ApiException(ErrorCode.BID_NOT_ALLOWED, "Adaugă un card salvat pentru a licita.");
    }
    if (!hasDelivery) {
      throw new ApiException(
          ErrorCode.BID_NOT_ALLOWED, "Alege o metodă de livrare implicită pentru a licita.");
    }
  }

  private static String formatLei(long bani) {
    return String.format(java.util.Locale.of("ro", "RO"), "%,.2f lei", bani / 100d);
  }
}
