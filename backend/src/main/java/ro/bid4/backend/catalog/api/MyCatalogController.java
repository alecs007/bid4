package ro.bid4.backend.catalog.api;

import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ro.bid4.backend.catalog.api.dto.AuctionResponse;
import ro.bid4.backend.catalog.api.dto.BidResponse;
import ro.bid4.backend.catalog.api.dto.MyBidResponse;
import ro.bid4.backend.catalog.service.MyCatalogService;
import ro.bid4.backend.cause.api.dto.CauseResponse;
import ro.bid4.backend.cause.service.CauseService;
import ro.bid4.backend.security.web.Viewers;

/**
 * The signed-in reader's own corner of the catalogue.
 *
 * <p>Separate from AuctionController because these are keyed by the token rather than by a path: no
 * id is accepted for whose listings to show, which is the simplest way to guarantee nobody can ask
 * for someone else's. The one id that does appear names a listing, and it is checked against the
 * token before it opens anything.
 */
@RestController
@RequestMapping("/users/me")
public class MyCatalogController {

  private final MyCatalogService mine;
  private final CauseService causes;

  public MyCatalogController(MyCatalogService mine, CauseService causes) {
    this.mine = mine;
    this.causes = causes;
  }

  @GetMapping("/auctions")
  List<AuctionResponse> myAuctions(@AuthenticationPrincipal Jwt jwt) {
    return mine.auctions(Viewers.from(jwt));
  }

  /**
   * Every offer on one of the caller's own listings, highest first.
   *
   * <p>What the seller reads before accepting one. Whose listing it is is checked against the
   * token, so the id in the path opens nothing that is not already theirs.
   */
  @GetMapping("/auctions/{id}/offers")
  List<BidResponse> myListingOffers(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    return mine.offers(id, Viewers.from(jwt));
  }

  @GetMapping("/watchlist")
  List<AuctionResponse> myWatchlist(@AuthenticationPrincipal Jwt jwt) {
    return mine.watchlist(Viewers.from(jwt));
  }

  @GetMapping("/bids")
  List<MyBidResponse> myBids(@AuthenticationPrincipal Jwt jwt) {
    return mine.bids(Viewers.from(jwt));
  }

  @GetMapping("/causes")
  List<CauseResponse> myCauses(@AuthenticationPrincipal Jwt jwt) {
    return causes.mine(Viewers.from(jwt));
  }
}
