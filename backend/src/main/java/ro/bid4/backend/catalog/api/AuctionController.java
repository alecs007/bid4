package ro.bid4.backend.catalog.api;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
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
import ro.bid4.backend.catalog.api.dto.AuctionQuery;
import ro.bid4.backend.catalog.api.dto.AuctionResponse;
import ro.bid4.backend.catalog.api.dto.BidResponse;
import ro.bid4.backend.catalog.api.dto.FeaturedAuctionsResponse;
import ro.bid4.backend.catalog.api.dto.PlaceBidRequest;
import ro.bid4.backend.catalog.api.dto.PlaceBidResponse;
import ro.bid4.backend.catalog.service.AuctionService;
import ro.bid4.backend.catalog.service.BidService;
import ro.bid4.backend.common.web.PageResponse;
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

  public AuctionController(AuctionService auctions, BidService bidding) {
    this.auctions = auctions;
    this.bidding = bidding;
  }

  @GetMapping
  PageResponse<AuctionResponse> list(
      @Valid @ModelAttribute AuctionQuery query, @AuthenticationPrincipal Jwt jwt) {
    return auctions.list(query, Viewers.from(jwt));
  }

  /** Before {@code /{id}}: a literal segment wins over a variable one, so this is not ambiguous. */
  @GetMapping("/featured")
  FeaturedAuctionsResponse featured(@AuthenticationPrincipal Jwt jwt) {
    return auctions.featured(Viewers.from(jwt));
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
