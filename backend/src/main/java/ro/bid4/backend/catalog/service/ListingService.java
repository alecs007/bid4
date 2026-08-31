package ro.bid4.backend.catalog.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.catalog.api.dto.AuctionResponse;
import ro.bid4.backend.catalog.api.dto.CreateAuctionRequest;
import ro.bid4.backend.catalog.domain.Auction;
import ro.bid4.backend.catalog.domain.AuctionStatus;
import ro.bid4.backend.catalog.domain.BidStatus;
import ro.bid4.backend.catalog.repo.AuctionRepository;
import ro.bid4.backend.catalog.repo.BidRepository;
import ro.bid4.backend.cause.domain.Cause;
import ro.bid4.backend.cause.repo.CauseRepository;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.common.error.ErrorCode;
import ro.bid4.backend.common.text.TextSanitizer;
import ro.bid4.backend.common.web.Viewer;

/**
 * A seller putting something up, and taking it back down.
 *
 * <p>The write half of what AuctionService reads. Bounds are checked here rather than left to the
 * table: every one of them is also a CHECK constraint, but a constraint violation reaches the
 * seller as a 500 and a Postgres error string, where what they need is a sentence naming the field
 * to fix.
 */
@Service
public class ListingService {

  private static final Logger log = LoggerFactory.getLogger(ListingService.class);

  private final AuctionRepository auctions;
  private final BidRepository bids;
  private final CauseRepository causes;
  private final AuctionMapper mapper;
  private final TextSanitizer sanitizer;

  public ListingService(
      AuctionRepository auctions,
      BidRepository bids,
      CauseRepository causes,
      AuctionMapper mapper,
      TextSanitizer sanitizer) {
    this.auctions = auctions;
    this.bids = bids;
    this.causes = causes;
    this.mapper = mapper;
    this.sanitizer = sanitizer;
  }

  /**
   * POST /auctions — creates a listing and queues it for review.
   *
   * <p>PENDING_REVIEW, never live: an auction is a promise to hand over an object, and the one
   * cheap moment to look at that promise is before anybody has bid on it. Only a moderator moves it
   * to LIVE, so nothing here can start taking offers on its own.
   */
  @Transactional
  public AuctionResponse create(CreateAuctionRequest request, Viewer viewer) {
    if (viewer.isAnonymous()) {
      throw new ApiException(ErrorCode.UNAUTHENTICATED);
    }

    String title = required(sanitizer.plain(request.title()), "Adaugă un titlu.");
    String description = required(sanitizer.story(request.description()), "Adaugă o descriere.");

    if (!CatalogRules.CATEGORIES.contains(request.category())) {
      throw new ApiException(ErrorCode.VALIDATION_FAILED, "Alege o categorie din listă.");
    }

    Cause cause =
        causes.findById(request.causeId()).orElseThrow(() -> ApiException.notFound("Cauza"));
    if (!cause.getStatus().isPublic()) {
      throw new ApiException(ErrorCode.CAUSE_NOT_APPROVED);
    }

    Instant now = Instant.now();
    checkPrices(request);

    Auction auction = new Auction();
    auction.setSellerId(viewer.id());
    auction.setCauseId(cause.getId());
    auction.setTitle(title);
    auction.setDescription(description);
    auction.setImages(List.copyOf(request.images()));
    auction.setCategory(request.category());
    auction.setCondition(request.condition());
    auction.setWeightGrams(request.weightGrams());
    auction.setDonationPercent((short) request.donationPercent());
    auction.setStartingPrice(request.startingPrice());
    // Nothing has been offered yet, so the price on the card is the ask.
    auction.setCurrentPrice(request.startingPrice());
    // Not the seller's to choose. Derived from what they are asking, so the step
    // is always a round number and always in proportion to the price.
    auction.setBidIncrement(CatalogRules.bidStepFor(request.startingPrice()));
    auction.setReservePrice(request.reservePrice());
    auction.setBuyNowPrice(request.buyNowPrice());
    // Published now. Nothing is scheduled for later any more, so there is no
    // start to choose and no window to close.
    auction.setStartTime(now);
    auction.setStatus(AuctionStatus.PENDING_REVIEW);

    Auction saved = auctions.save(auction);
    log.info(
        "Listing {} created by {} for cause {} ({}% donated)",
        saved.getId(), viewer.id(), cause.getId(), request.donationPercent());
    return mapper.toResponse(saved, viewer.id());
  }

  /**
   * DELETE /auctions/{id} — the seller withdraws a listing.
   *
   * <p>Withdrawal is a status, not a delete. The row is what any bid, and later any order, points
   * at, and it is also the record that the listing existed at all.
   */
  @Transactional
  public AuctionResponse cancel(UUID id, Viewer viewer) {
    if (viewer.isAnonymous()) {
      throw new ApiException(ErrorCode.UNAUTHENTICATED);
    }

    Auction auction =
        auctions.findByIdForUpdate(id).orElseThrow(() -> ApiException.notFound("Licitația"));

    boolean mine = viewer.is(auction.getSellerId());
    if (!mine && !viewer.staff()) {
      // Whether this is a refusal or a 404 depends on whether the listing was
      // ever public. Answering "forbidden" for somebody's draft would confirm
      // that the draft exists, which is the one thing a draft is entitled to
      // keep; a live listing is already public, so there is nothing to protect
      // by pretending otherwise.
      throw auction.getStatus().isPublic()
          ? ApiException.forbidden("Poți retrage doar propriile anunțuri.")
          : ApiException.notFound("Licitația");
    }

    if (auction.getStatus() == AuctionStatus.CANCELLED) {
      return mapper.toResponse(auction, viewer.id());
    }
    // The bar is a buyer, not a date. Once an offer is accepted somebody is
    // waiting on this listing — and once it is paid for there is money against
    // it — so withdrawing it would leave an order pointing at nothing.
    if (auction.getStatus().isCommitted()) {
      throw new ApiException(
          ErrorCode.VALIDATION_FAILED,
          auction.getStatus() == AuctionStatus.SOLD
              ? "Anunțul este vândut și plătit, așa că nu mai poate fi retras."
              : "Ai acceptat o ofertă. Anuleaz-o mai întâi, apoi poți retrage anunțul.");
    }

    // Anyone still holding a live offer is released. Without this their bid sits
    // at "Câștigi" against a listing that no longer exists, which is the same
    // dangling state an auction that never closed used to leave behind.
    bids.demoteAllFor(id, BidStatus.LOST);

    auction.setStatus(AuctionStatus.CANCELLED);
    auction.setUpdatedAt(Instant.now());
    auctions.save(auction);
    log.info("Listing {} withdrawn by {}", id, viewer.id());
    return mapper.toResponse(auction, viewer.id());
  }

  private void checkPrices(CreateAuctionRequest request) {
    Long reserve = request.reservePrice();
    Long buyNow = request.buyNowPrice();

    if (reserve != null && reserve < request.startingPrice()) {
      throw new ApiException(
          ErrorCode.VALIDATION_FAILED, "Prețul de rezervă nu poate fi sub prețul de pornire.");
    }
    if (buyNow != null && buyNow <= request.startingPrice()) {
      // Equal to the starting price, the first bid ends it: a fixed-price sale
      // wearing an auction's clothes.
      throw new ApiException(
          ErrorCode.VALIDATION_FAILED,
          "Prețul „Cumpără acum” trebuie să fie peste prețul de pornire.");
    }
    if (buyNow != null && reserve != null && buyNow < reserve) {
      throw new ApiException(
          ErrorCode.VALIDATION_FAILED, "Prețul „Cumpără acum” nu poate fi sub prețul de rezervă.");
    }
  }

  private static String required(String value, String message) {
    if (value == null || value.isBlank()) {
      throw new ApiException(ErrorCode.VALIDATION_FAILED, message);
    }
    return value;
  }
}
