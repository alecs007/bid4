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

  public List<AuctionResponse> auctions(Viewer viewer) {
    if (viewer.isAnonymous()) {
      return List.of();
    }
    return mapper.toResponses(
        auctions.findBySellerIdOrderByCreatedAtDesc(viewer.id()), viewer.id());
  }

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

  public List<AuctionResponse> watchlist(Viewer viewer) {
    if (viewer.isAnonymous()) {
      return List.of();
    }
    List<UUID> watched = watches.findWatchedAuctionIdsFor(viewer.id());
    if (watched.isEmpty()) {
      return List.of();
    }

    Map<UUID, Auction> byId = new HashMap<>();
    for (Auction auction : auctions.findByIdIn(watched)) {
      byId.put(auction.getId(), auction);
    }
    List<Auction> ordered = watched.stream().map(byId::get).filter(Objects::nonNull).toList();

    return mapper.toResponses(ordered, viewer.id());
  }

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
