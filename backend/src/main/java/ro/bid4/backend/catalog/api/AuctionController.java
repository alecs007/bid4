package ro.bid4.backend.catalog.api;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ro.bid4.backend.catalog.api.dto.AcceptOfferRequest;
import ro.bid4.backend.catalog.api.dto.AuctionQuery;
import ro.bid4.backend.catalog.api.dto.AuctionResponse;
import ro.bid4.backend.catalog.api.dto.BidResponse;
import ro.bid4.backend.catalog.api.dto.CreateAuctionRequest;
import ro.bid4.backend.catalog.api.dto.FeaturedAuctionsResponse;
import ro.bid4.backend.catalog.api.dto.PlaceBidRequest;
import ro.bid4.backend.catalog.api.dto.PlaceBidResponse;
import ro.bid4.backend.catalog.service.AuctionService;
import ro.bid4.backend.catalog.service.BidService;
import ro.bid4.backend.catalog.service.ListingService;
import ro.bid4.backend.catalog.service.OfferService;
import ro.bid4.backend.common.web.PageResponse;
import ro.bid4.backend.common.web.PublicCaching;
import ro.bid4.backend.common.web.Viewer;
import ro.bid4.backend.security.web.Viewers;

@RestController
@RequestMapping("/auctions")
public class AuctionController {
  private final AuctionService auctions;
  private final BidService bidding;
  private final ListingService listings;
  private final OfferService offers;

  public AuctionController(
      AuctionService auctions, BidService bidding, ListingService listings, OfferService offers) {
    this.auctions = auctions;
    this.bidding = bidding;
    this.listings = listings;
    this.offers = offers;
  }

  @PostMapping
  ResponseEntity<AuctionResponse> create(
      @Valid @RequestBody CreateAuctionRequest request, @AuthenticationPrincipal Jwt jwt) {
    AuctionResponse created = listings.create(request, Viewers.from(jwt));
    return ResponseEntity.status(HttpStatus.CREATED).body(created);
  }

  @DeleteMapping("/{id}")
  AuctionResponse cancel(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    return listings.cancel(id, Viewers.from(jwt));
  }

  @GetMapping
  PageResponse<AuctionResponse> list(
      @Valid @ModelAttribute AuctionQuery query, @AuthenticationPrincipal Jwt jwt) {
    return auctions.list(query, Viewers.from(jwt));
  }

  @GetMapping("/featured")
  ResponseEntity<FeaturedAuctionsResponse> featured(@AuthenticationPrincipal Jwt jwt) {
    Viewer viewer = Viewers.from(jwt);
    return PublicCaching.browsing(auctions.featured(viewer), viewer.isAnonymous());
  }

  @GetMapping("/{id}")
  AuctionResponse get(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    return auctions.get(id, Viewers.from(jwt));
  }

  @GetMapping("/{id}/related")
  List<AuctionResponse> related(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    return auctions.related(id, Viewers.from(jwt));
  }

  @GetMapping("/{id}/bids")
  List<BidResponse> bids(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    return auctions.bidHistory(id, Viewers.from(jwt));
  }

  @PostMapping("/{id}/bids")
  PlaceBidResponse placeBid(
      @PathVariable UUID id,
      @Valid @RequestBody PlaceBidRequest request,
      @AuthenticationPrincipal Jwt jwt) {
    return bidding.place(id, request.amount(), request.acceptedTermsVersion(), Viewers.from(jwt));
  }

  @PostMapping("/{id}/accept")
  AuctionResponse acceptOffer(
      @PathVariable UUID id,
      @Valid @RequestBody AcceptOfferRequest request,
      @AuthenticationPrincipal Jwt jwt) {
    return offers.accept(id, request.bidId(), Viewers.from(jwt));
  }

  @DeleteMapping("/{id}/accept")
  AuctionResponse releaseOffer(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    return offers.release(id, Viewers.from(jwt));
  }

  @DeleteMapping("/{id}/bids/mine")
  RetractResponse retractBid(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    return new RetractResponse(bidding.retract(id, Viewers.from(jwt)));
  }

  @PutMapping("/{id}/watch")
  WatchResponse watch(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    return new WatchResponse(bidding.toggleWatch(id, Viewers.from(jwt)));
  }

  public record WatchResponse(boolean watched) {}

  public record RetractResponse(AuctionResponse auction) {}
}
