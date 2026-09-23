package ro.bid4.backend.catalog.service;

import java.time.Instant;
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
import ro.bid4.backend.storage.service.ListingImages;

@Service
public class ListingService {
  private static final Logger log = LoggerFactory.getLogger(ListingService.class);

  private final AuctionRepository auctions;
  private final BidRepository bids;
  private final CauseRepository causes;
  private final AuctionMapper mapper;
  private final TextSanitizer sanitizer;
  private final ListingImages images;

  public ListingService(
      AuctionRepository auctions,
      BidRepository bids,
      CauseRepository causes,
      AuctionMapper mapper,
      TextSanitizer sanitizer,
      ListingImages images) {
    this.auctions = auctions;
    this.bids = bids;
    this.causes = causes;
    this.mapper = mapper;
    this.sanitizer = sanitizer;
    this.images = images;
  }

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
    auction.setImages(images.claim(request.images(), viewer.id()));
    auction.setCategory(request.category());
    auction.setCondition(request.condition());
    auction.setWeightGrams(request.weightGrams());
    auction.setDonationPercent((short) request.donationPercent());
    auction.setStartingPrice(request.startingPrice());
    auction.setCurrentPrice(request.startingPrice());
    auction.setReservePrice(request.reservePrice());
    auction.setBuyNowPrice(request.buyNowPrice());
    auction.setStartTime(now);
    auction.setStatus(AuctionStatus.PENDING_REVIEW);

    Auction saved = auctions.save(auction);
    log.info(
        "Listing {} created by {} for cause {} ({}% donated)",
        saved.getId(), viewer.id(), cause.getId(), request.donationPercent());
    return mapper.toResponse(saved, viewer.id());
  }

  @Transactional
  public AuctionResponse cancel(UUID id, Viewer viewer) {
    if (viewer.isAnonymous()) {
      throw new ApiException(ErrorCode.UNAUTHENTICATED);
    }

    Auction auction =
        auctions.findByIdForUpdate(id).orElseThrow(() -> ApiException.notFound("Licitația"));

    boolean mine = viewer.is(auction.getSellerId());
    if (!mine && !viewer.staff()) {
      throw auction.getStatus().isPublic()
          ? ApiException.forbidden("Poți retrage doar propriile anunțuri.")
          : ApiException.notFound("Licitația");
    }

    if (auction.getStatus() == AuctionStatus.CANCELLED) {
      return mapper.toResponse(auction, viewer.id());
    }
    if (auction.getStatus().isCommitted()) {
      throw new ApiException(
          ErrorCode.VALIDATION_FAILED,
          auction.getStatus() == AuctionStatus.SOLD
              ? "Anunțul este vândut și plătit, așa că nu mai poate fi retras."
              : "Ai acceptat o ofertă. Anuleaz-o mai întâi, apoi poți retrage anunțul.");
    }

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
