package ro.bid4.backend.catalog.service;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Component;
import ro.bid4.backend.catalog.api.dto.AuctionResponse;
import ro.bid4.backend.catalog.api.dto.BidResponse;
import ro.bid4.backend.catalog.api.dto.ViewerBidStatus;
import ro.bid4.backend.catalog.domain.Auction;
import ro.bid4.backend.catalog.domain.Bid;
import ro.bid4.backend.catalog.repo.AuctionWatchRepository;
import ro.bid4.backend.catalog.repo.BidRepository;
import ro.bid4.backend.cause.api.dto.CauseSummaryResponse;
import ro.bid4.backend.cause.service.CauseMapper;
import ro.bid4.backend.identity.api.dto.PublicUserResponse;
import ro.bid4.backend.identity.service.UserMapper;
import ro.bid4.backend.storage.service.MediaUrls;

@Component
public class AuctionMapper {
  private final UserMapper users;
  private final CauseMapper causes;
  private final BidRepository bids;
  private final AuctionWatchRepository watches;
  private final BidderAliases aliases;

  public AuctionMapper(
      UserMapper users,
      CauseMapper causes,
      BidRepository bids,
      AuctionWatchRepository watches,
      BidderAliases aliases) {
    this.users = users;
    this.causes = causes;
    this.bids = bids;
    this.watches = watches;
    this.aliases = aliases;
  }

  public List<AuctionResponse> toResponses(List<Auction> auctions, UUID viewerId) {
    if (auctions.isEmpty()) {
      return List.of();
    }

    Set<UUID> auctionIds = new HashSet<>(auctions.size());
    Set<UUID> sellerIds = new HashSet<>(auctions.size());
    Set<UUID> causeIds = new HashSet<>(auctions.size());
    for (Auction auction : auctions) {
      auctionIds.add(auction.getId());
      sellerIds.add(auction.getSellerId());
      causeIds.add(auction.getCauseId());
    }

    Map<UUID, PublicUserResponse> sellers = users.publicUsersById(sellerIds);
    Map<UUID, CauseSummaryResponse> causeSummaries = causes.summariesById(causeIds);

    Set<UUID> watched =
        viewerId == null
            ? Set.of()
            : Set.copyOf(watches.findWatchedAuctionIds(viewerId, auctionIds));
    Map<UUID, BidRepository.Own> ownBids = new HashMap<>();
    if (viewerId != null) {
      for (BidRepository.Own own : bids.findOwnBids(viewerId, auctionIds)) {
        ownBids.put(own.getAuctionId(), own);
      }
    }

    Set<UUID> acceptedBidIds = new HashSet<>();
    for (Auction auction : auctions) {
      if (auction.getAcceptedBidId() != null) {
        acceptedBidIds.add(auction.getAcceptedBidId());
      }
    }
    Map<UUID, Long> acceptedAmounts = new HashMap<>();
    if (!acceptedBidIds.isEmpty()) {
      for (BidRepository.Amount amount : bids.findAmounts(acceptedBidIds)) {
        acceptedAmounts.put(amount.getId(), amount.getAmount());
      }
    }

    return auctions.stream()
        .map(
            auction ->
                toResponse(
                    auction,
                    sellers.get(auction.getSellerId()),
                    causeSummaries.get(auction.getCauseId()),
                    watched.contains(auction.getId()),
                    ownBids.get(auction.getId()),
                    auction.getAcceptedBidId() == null
                        ? null
                        : acceptedAmounts.get(auction.getAcceptedBidId()),
                    viewerId))
        .toList();
  }

  public AuctionResponse toResponse(Auction auction, UUID viewerId) {
    return toResponses(List.of(auction), viewerId).getFirst();
  }

  private AuctionResponse toResponse(
      Auction auction,
      PublicUserResponse seller,
      CauseSummaryResponse cause,
      boolean watched,
      BidRepository.Own ownBid,
      Long acceptedAmount,
      UUID viewerId) {
    boolean viewerIsSeller = viewerId != null && viewerId.equals(auction.getSellerId());
    boolean viewerWon = viewerId != null && viewerId.equals(auction.getWinnerId());

    return new AuctionResponse(
        auction.getId(),
        auction.getSellerId(),
        auction.getCauseId(),
        auction.getTitle(),
        auction.getDescription(),
        MediaUrls.resolveAll(auction.getImages()),
        auction.getCategory(),
        auction.getCondition(),
        auction.getWeightGrams(),
        auction.getDonationPercent(),
        auction.getStartingPrice(),
        auction.getCurrentPrice(),
        viewerIsSeller ? auction.getReservePrice() : null,
        auction.getBuyNowPrice(),
        auction.getStartTime(),
        auction.getAcceptedAt(),
        acceptedAmount,
        auction.getDispatchDeadline(),
        auction.getStatus(),
        viewerIsSeller || viewerWon ? auction.getWinnerId() : null,
        auction.getBidCount(),
        auction.getWatcherCount(),
        auction.getCreatedAt(),
        seller,
        cause,
        auction.isReserveMet(),
        viewerId == null ? null : watched,
        viewerBidStatus(viewerId, ownBid),
        ownBid == null ? null : ownBid.getAmount());
  }

  public BidResponse toBidResponse(Bid bid, UUID viewerId) {
    return toBidResponse(bid, users.publicUsersById(List.of(bid.getBidderId())), viewerId);
  }

  public BidResponse toBidResponse(Bid bid, Map<UUID, PublicUserResponse> bidders, UUID viewerId) {
    PublicUserResponse bidder = bidders.get(bid.getBidderId());
    return new BidResponse(
        bid.getId(),
        bid.getAuctionId(),
        bid.getBidderId(),
        bid.getAmount(),
        bid.getCreatedAt(),
        bid.getStatus(),
        bidder == null ? "Ofertant" : bidder.displayName(),
        bidder == null ? "" : bidder.avatarUrl(),
        bidder == null ? "" : bidder.username(),
        bid.getBidderId().equals(viewerId),
        aliases.of(bid.getAuctionId(), bid.getBidderId()));
  }

  private static ViewerBidStatus viewerBidStatus(UUID viewerId, BidRepository.Own own) {
    if (viewerId == null) {
      return null;
    }
    if (own == null) {
      return ViewerBidStatus.NONE;
    }
    return switch (own.getStatus()) {
      case WINNING -> ViewerBidStatus.WINNING;
      case ACCEPTED, WON -> ViewerBidStatus.ACCEPTED;
      default -> ViewerBidStatus.OUTBID;
    };
  }
}
