package ro.bid4.backend.catalog.service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
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

/**
 * Bidding, retracting, and following an auction.
 *
 * <p>A bid is a commitment to pay, so this is the one place in the catalogue where money is at
 * stake and the rules are enforced rather than suggested. Everything it checks, it checks against
 * the row it has locked — reading the price, deciding it was beaten, and writing the new one have
 * to be one indivisible step or two bidders can both be told they are winning.
 */
@Service
public class BidService {

  private static final Logger log = LoggerFactory.getLogger(BidService.class);

  private final AuctionRepository auctions;
  private final BidRepository bids;
  private final AuctionWatchRepository watches;
  private final UserAccountRepository users;
  private final AuctionMapper mapper;

  public BidService(
      AuctionRepository auctions,
      BidRepository bids,
      AuctionWatchRepository watches,
      UserAccountRepository users,
      AuctionMapper mapper) {
    this.auctions = auctions;
    this.bids = bids;
    this.watches = watches;
    this.users = users;
    this.mapper = mapper;
  }

  /**
   * The smallest offer that would be accepted right now.
   *
   * <p>The very first bid may match the starting price exactly; after that each one has to clear
   * the increment.
   */
  public static long minimumBid(Auction auction) {
    return auction.getBidCount() == 0
        ? auction.getStartingPrice()
        : auction.getCurrentPrice() + auction.getBidIncrement();
  }

  /** POST /auctions/{id}/bids */
  @Transactional
  public PlaceBidResponse place(UUID auctionId, long amount, Viewer viewer) {
    if (viewer.isAnonymous()) {
      throw new ApiException(ErrorCode.UNAUTHENTICATED);
    }

    Auction auction =
        auctions.findByIdForUpdate(auctionId).orElseThrow(() -> ApiException.notFound("Licitația"));

    Instant now = Instant.now();
    if (!auction.isLive(now)) {
      log.debug(
          "Bid refused on {}: not live (status {}, ends {})",
          auctionId,
          auction.getStatus(),
          auction.getEndTime());
      throw new ApiException(ErrorCode.AUCTION_NOT_LIVE, "Licitația nu mai acceptă oferte.");
    }
    if (viewer.is(auction.getSellerId())) {
      throw ApiException.forbidden("Nu poți licita la propriul anunț.");
    }

    requireBiddingUnlocked(viewer.id());

    // A ceiling before anything else. An offer nobody could honour is not a
    // bid, it is a way to win an auction and walk away from it, and every
    // number downstream — the fee split, the donation — is computed from this
    // one. The schema carries the same bound as a backstop.
    if (amount > CatalogRules.MAX_BID) {
      throw new ApiException(
          ErrorCode.BID_TOO_HIGH,
          "Oferta depășește maximul acceptat de " + formatLei(CatalogRules.MAX_BID) + ".");
    }

    // The final price is settled before the increment is enforced. A seller who
    // names a price they would simply accept has made an offer to the room, and
    // an increment that happens to step over it must not put it out of reach:
    // with a 50 lei increment on a 100 lei standing offer, a 120 lei final price
    // would otherwise be unreachable in either direction.
    boolean boughtNow = auction.isBuyNowReachedBy(amount);

    if (!boughtNow) {
      long minimum = minimumBid(auction);
      if (amount < minimum) {
        log.debug("Bid of {} refused on {}: below the minimum of {}", amount, auctionId, minimum);
        throw new ApiException(
            ErrorCode.BID_TOO_LOW, "Oferta minimă este " + formatLei(minimum) + ".");
      }
    }

    // One offer per bidder: raising replaces the previous one rather than
    // stacking on it, which the unique index also enforces.
    Optional<Bid> previous = bids.findByAuctionIdAndBidderId(auctionId, viewer.id());
    previous.ifPresent(bids::delete);
    bids.flush();

    // Settled at the advertised price, never at whatever was typed: the number
    // on the page is what the buyer agreed to, and charging more for a fat
    // finger would be indefensible.
    long price = boughtNow ? auction.getBuyNowPrice() : amount;

    bids.demoteAllFor(auctionId, boughtNow ? BidStatus.LOST : BidStatus.OUTBID);
    bids.flush();

    Integer extendedBySeconds = boughtNow ? null : extendIfSniped(auction, now);

    Bid bid = new Bid();
    bid.setAuctionId(auctionId);
    bid.setBidderId(viewer.id());
    bid.setAmount(price);
    bid.setStatus(boughtNow ? BidStatus.WON : BidStatus.WINNING);
    bid.setTriggeredExtension(extendedBySeconds != null);
    bids.save(bid);
    bids.flush();

    auction.setCurrentPrice(price);
    auction.setBidCount((int) bids.countByAuctionId(auctionId));
    if (boughtNow) {
      auction.setStatus(AuctionStatus.SOLD);
      auction.setWinnerId(viewer.id());
      // Closing the clock as well as the status, so nothing downstream has to
      // special-case a sold auction that still looks like it is running.
      auction.setEndTime(now);
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
      log.info(
          "Bid accepted on {}: {} bani by {}{}",
          auctionId,
          price,
          viewer.id(),
          extendedBySeconds == null ? "" : " (close pushed out " + extendedBySeconds + "s)");
    }

    AuctionResponse view = mapper.toResponse(auction, viewer.id());
    BidResponse placed = mapper.toBidResponse(bid, viewer.id());
    return new PlaceBidResponse(placed, view, extendedBySeconds, boughtNow ? true : null);
  }

  /**
   * DELETE /auctions/{id}/bids/mine
   *
   * <p>Only the leader can pull back, and not in the closing minutes: retracting then is
   * indistinguishable from bid shielding — pushing the price up to scare others off and stepping
   * away before the clock runs out.
   */
  @Transactional
  public AuctionResponse retract(UUID auctionId, Viewer viewer) {
    if (viewer.isAnonymous()) {
      throw new ApiException(ErrorCode.UNAUTHENTICATED);
    }

    Auction auction =
        auctions.findByIdForUpdate(auctionId).orElseThrow(() -> ApiException.notFound("Licitația"));

    if (!auction.isLive(Instant.now())) {
      throw new ApiException(ErrorCode.RETRACT_NOT_ALLOWED, "Licitația s-a încheiat.");
    }

    List<Bid> ordered = bids.findByAuctionIdOrderByAmountDesc(auctionId);
    if (ordered.isEmpty() || !ordered.getFirst().getBidderId().equals(viewer.id())) {
      throw new ApiException(
          ErrorCode.RETRACT_NOT_ALLOWED, "Poți retrage doar propria ofertă aflată pe primul loc.");
    }

    long secondsLeft = Duration.between(Instant.now(), auction.getEndTime()).toSeconds();
    if (secondsLeft <= RETRACT_LOCK_SECONDS) {
      throw new ApiException(
          ErrorCode.RETRACT_NOT_ALLOWED, "Nu mai poți retrage oferta în ultimele 5 minute.");
    }

    Bid top = ordered.getFirst();
    bids.delete(top);
    bids.flush();

    Bid next = ordered.size() > 1 ? ordered.get(1) : null;
    if (next != null) {
      next.setStatus(BidStatus.WINNING);
      bids.save(next);
    }

    auction.setCurrentPrice(next == null ? auction.getStartingPrice() : next.getAmount());
    auction.setBidCount(Math.max(0, auction.getBidCount() - 1));
    auctions.save(auction);

    log.info(
        "Bid retracted on {} by {}; price back to {} bani",
        auctionId,
        viewer.id(),
        auction.getCurrentPrice());

    return mapper.toResponse(auction, viewer.id());
  }

  /** PUT /auctions/{id}/watch — toggles, so one route covers following and unfollowing. */
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

  /**
   * The gate that unlocks bidding.
   *
   * <p>A bid is a promise to pay for something and to receive it, so both halves have to already
   * exist: a card on file and a delivery method chosen. Checked here rather than only in the UI,
   * because the UI is not where the promise is made.
   */
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

  /** A bid inside the closing window pushes the close out by the same amount. */
  private static Integer extendIfSniped(Auction auction, Instant now) {
    long msLeft = Duration.between(now, auction.getEndTime()).toMillis();
    long windowMs = auction.getAntiSnipeSeconds() * 1000L;

    if (msLeft <= 0 || msLeft > windowMs) {
      return null;
    }
    auction.setEndTime(auction.getEndTime().plusSeconds(auction.getAntiSnipeSeconds()));
    auction.setExtensionCount(auction.getExtensionCount() + 1);
    return auction.getAntiSnipeSeconds();
  }

  /** Mirrors RETRACT_LOCK_SECONDS in frontend/src/lib/api/bids.ts. */
  private static final long RETRACT_LOCK_SECONDS = 300;

  private static String formatLei(long bani) {
    return String.format(java.util.Locale.of("ro", "RO"), "%,.2f lei", bani / 100d);
  }
}
