package ro.bid4.backend.catalog.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.catalog.api.dto.AuctionResponse;
import ro.bid4.backend.catalog.api.dto.BidResponse;
import ro.bid4.backend.catalog.api.dto.MyBidResponse;
import ro.bid4.backend.catalog.domain.Auction;
import ro.bid4.backend.catalog.domain.Bid;
import ro.bid4.backend.catalog.domain.BidStatus;
import ro.bid4.backend.catalog.repo.AuctionRepository;
import ro.bid4.backend.catalog.repo.AuctionWatchRepository;
import ro.bid4.backend.catalog.repo.BidRepository;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.common.error.ErrorCode;
import ro.bid4.backend.common.web.Viewer;
import ro.bid4.backend.identity.api.dto.PublicUserResponse;
import ro.bid4.backend.identity.service.UserMapper;

/**
 * What the signed-in reader has done: sold, followed, offered on.
 *
 * <p>Every method here is scoped by the token's subject. Only one takes an id at all, and it names
 * a listing rather than a person — checked against the token before a single row is read.
 */
@Service
@Transactional(readOnly = true)
public class MyCatalogService {

  private final AuctionRepository auctions;
  private final BidRepository bids;
  private final AuctionWatchRepository watches;
  private final AuctionMapper mapper;
  private final UserMapper users;

  public MyCatalogService(
      AuctionRepository auctions,
      BidRepository bids,
      AuctionWatchRepository watches,
      AuctionMapper mapper,
      UserMapper users) {
    this.auctions = auctions;
    this.bids = bids;
    this.watches = watches;
    this.mapper = mapper;
    this.users = users;
  }

  /** GET /users/me/auctions — the seller's own shelf, any status. */
  public List<AuctionResponse> auctions(Viewer viewer) {
    if (viewer.isAnonymous()) {
      return List.of();
    }
    return mapper.toResponses(
        auctions.findBySellerIdOrderByCreatedAtDesc(viewer.id()), viewer.id());
  }

  /**
   * GET /users/me/auctions/{id}/offers — every offer on one of the seller's own listings.
   *
   * <p>The listing that does not close on a timer needs this: the seller reads what has been
   * offered and picks, so they have to be able to see all of it, highest first, with a name against
   * each one. The public history on the listing page shortens those names to "Maria I." because it
   * is read by strangers; the person deciding who to sell to is not a stranger, and gets what any
   * public profile already shows.
   *
   * <p>The id in the path names a listing, not a seller. It is checked against the token before
   * anything is read, and a listing belonging to someone else is a 404 rather than a refusal —
   * whether it exists is not this caller's to confirm.
   */
  public List<BidResponse> offers(UUID auctionId, Viewer viewer) {
    if (viewer.isAnonymous()) {
      throw new ApiException(ErrorCode.UNAUTHENTICATED);
    }

    Auction auction =
        auctions.findById(auctionId).orElseThrow(() -> ApiException.notFound("Licitația"));
    if (!viewer.is(auction.getSellerId())) {
      throw ApiException.notFound("Licitația");
    }

    List<Bid> offers = bids.findByAuctionIdOrderByAmountDesc(auctionId);
    if (offers.isEmpty()) {
      return List.of();
    }

    Map<UUID, PublicUserResponse> bidders =
        users.publicUsersById(offers.stream().map(Bid::getBidderId).distinct().toList());
    return offers.stream().map(bid -> mapper.toBidResponse(bid, bidders)).toList();
  }

  /** GET /users/me/watchlist */
  public List<AuctionResponse> watchlist(Viewer viewer) {
    if (viewer.isAnonymous()) {
      return List.of();
    }
    List<UUID> watched = watches.findWatchedAuctionIdsFor(viewer.id());
    if (watched.isEmpty()) {
      return List.of();
    }

    // findByIdIn answers in whatever order the database liked. The query above
    // is ordered newest-followed-first, and that is the order the page shows,
    // so it is reimposed here rather than silently lost.
    Map<UUID, Auction> byId = new HashMap<>();
    for (Auction auction : auctions.findByIdIn(watched)) {
      byId.put(auction.getId(), auction);
    }
    List<Auction> ordered = watched.stream().map(byId::get).filter(Objects::nonNull).toList();

    return mapper.toResponses(ordered, viewer.id());
  }

  /**
   * GET /users/me/bids — one row per auction, carrying the reader's best offer on it.
   *
   * <p>A bidder holds at most one offer per auction, so "my top bid" is simply the one there is;
   * the grouping exists because the frontend renders a card per auction, not per bid.
   */
  public List<MyBidResponse> bids(Viewer viewer) {
    if (viewer.isAnonymous()) {
      return List.of();
    }

    List<Bid> mine = bids.findByBidderIdOrderByCreatedAtDesc(viewer.id());
    if (mine.isEmpty()) {
      return List.of();
    }

    List<UUID> auctionIds = mine.stream().map(Bid::getAuctionId).distinct().toList();
    Map<UUID, Auction> byId = new HashMap<>();
    for (Auction auction : auctions.findByIdIn(auctionIds)) {
      byId.put(auction.getId(), auction);
    }

    List<Auction> ordered = new ArrayList<>();
    List<Bid> aligned = new ArrayList<>();
    for (Bid bid : mine) {
      Auction auction = byId.get(bid.getAuctionId());
      if (auction != null) {
        ordered.add(auction);
        aligned.add(bid);
      }
    }

    List<AuctionResponse> views = mapper.toResponses(ordered, viewer.id());
    // One lookup for the whole list rather than one per row: every bid here
    // belongs to the same person, so this map has exactly one entry.
    Map<UUID, PublicUserResponse> bidders = users.publicUsersById(List.of(viewer.id()));

    List<MyBidResponse> summaries = new ArrayList<>(views.size());
    for (int index = 0; index < views.size(); index++) {
      Bid bid = aligned.get(index);
      summaries.add(
          new MyBidResponse(
              views.get(index),
              mapper.toBidResponse(bid, bidders),
              bid.getStatus() == BidStatus.WINNING || bid.getStatus() == BidStatus.WON));
    }
    return summaries;
  }
}
