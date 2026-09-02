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

/**
 * The read half of frontend/src/lib/api/auctions.ts and the history in bids.ts.
 *
 * <p>Every route here answers an anonymous caller — browsing is the point of the site, and asking
 * someone to sign in before they can see what is being raised would defeat it. A token is still
 * read when one is sent, because it changes what the response carries: whether the viewer follows
 * the listing, where they stand in the bidding, and, for the seller alone, the reserve.
 */
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

  /**
   * Creates a listing. The seller is the token's subject, never a field in the body.
   *
   * <p>201 with the listing as the seller sees it, which includes the reserve — the one caller
   * entitled to read it back is the one who set it.
   */
  @PostMapping
  ResponseEntity<AuctionResponse> create(
      @Valid @RequestBody CreateAuctionRequest request, @AuthenticationPrincipal Jwt jwt) {
    AuctionResponse created = listings.create(request, Viewers.from(jwt));
    return ResponseEntity.status(HttpStatus.CREATED).body(created);
  }

  /** Withdraws a listing. A status change, not a delete — bids and orders point at this row. */
  @DeleteMapping("/{id}")
  AuctionResponse cancel(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    return listings.cancel(id, Viewers.from(jwt));
  }

  @GetMapping
  PageResponse<AuctionResponse> list(
      @Valid @ModelAttribute AuctionQuery query, @AuthenticationPrincipal Jwt jwt) {
    return auctions.list(query, Viewers.from(jwt));
  }

  /** Before {@code /{id}}: a literal segment wins over a variable one, so this is not ambiguous. */
  @GetMapping("/featured")
  ResponseEntity<FeaturedAuctionsResponse> featured(@AuthenticationPrincipal Jwt jwt) {
    Viewer viewer = Viewers.from(jwt);
    // Both homepage rows in one body, so the page is one request rather than two.
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

  /**
   * Places an offer.
   *
   * <p>The bidder comes from the token and the auction from the path, so the body carries only the
   * amount and cannot be made to bid on someone else's behalf.
   */
  @PostMapping("/{id}/bids")
  PlaceBidResponse placeBid(
      @PathVariable UUID id,
      @Valid @RequestBody PlaceBidRequest request,
      @AuthenticationPrincipal Jwt jwt) {
    return bidding.place(id, request.amount(), Viewers.from(jwt));
  }

  /**
   * The seller takes one of the offers, and the listing is held for that buyer.
   *
   * <p>Which offer is the only choice in the body. Any of them will do — that is the point of a
   * listing that does not close on a timer — but whose listing it is comes from the token.
   */
  @PostMapping("/{id}/accept")
  AuctionResponse acceptOffer(
      @PathVariable UUID id,
      @Valid @RequestBody AcceptOfferRequest request,
      @AuthenticationPrincipal Jwt jwt) {
    return offers.accept(id, request.bidId(), Viewers.from(jwt));
  }

  /**
   * The seller takes the acceptance back and the listing returns to the room.
   *
   * <p>Only while it is unpaid. After that it is a refund, which is not this route.
   */
  @DeleteMapping("/{id}/accept")
  AuctionResponse releaseOffer(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    return offers.release(id, Viewers.from(jwt));
  }

  @DeleteMapping("/{id}/bids/mine")
  RetractResponse retractBid(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    return new RetractResponse(bidding.retract(id, Viewers.from(jwt)));
  }

  /** One route for following and unfollowing, because the button is one button. */
  @PutMapping("/{id}/watch")
  WatchResponse watch(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    return new WatchResponse(bidding.toggleWatch(id, Viewers.from(jwt)));
  }

  /** The shape frontend/src/lib/api/auctions.ts expects back from a toggle. */
  public record WatchResponse(boolean watched) {}

  /** retractBid in lib/api/bids.ts reads {@code .auction}, so the auction is wrapped. */
  public record RetractResponse(AuctionResponse auction) {}
}
