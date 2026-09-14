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
import ro.bid4.backend.catalog.domain.BidStatus;
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

  public AuctionMapper(
      UserMapper users, CauseMapper causes, BidRepository bids, AuctionWatchRepository watches) {
    this.users = users;
    this.causes = causes;
    this.bids = bids;
    this.watches = watches;
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

    Map<UUID, UUID> leaders = new HashMap<>();
    if (viewerId != null) {
      for (BidRepository.Leader leader : bids.findLeaders(auctionIds, BidStatus.WINNING)) {
        leaders.put(leader.getAuctionId(), leader.getBidderId());
      }
    }

    Set<UUID> watched =
        viewerId == null
            ? Set.of()
            : Set.copyOf(watches.findWatchedAuctionIds(viewerId, auctionIds));
    Set<UUID> bidOn =
        viewerId == null ? Set.of() : Set.copyOf(bids.findAuctionIdsBidOnBy(viewerId, auctionIds));

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
                    leaders.get(auction.getId()),
                    watched.contains(auction.getId()),
                    bidOn.contains(auction.getId()),
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
      UUID leaderId,
      boolean watched,
      boolean hasBid,
      Long acceptedAmount,
      UUID viewerId) {
    boolean viewerIsSeller = viewerId != null && viewerId.equals(auction.getSellerId());

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
        auction.getBidIncrement(),
        viewerIsSeller ? auction.getReservePrice() : null,
        auction.getBuyNowPrice(),
        auction.getStartTime(),
        auction.getAcceptedAt(),
        acceptedAmount,
        auction.getDispatchDeadline(),
        auction.getStatus(),
        auction.getWinnerId(),
        auction.getBidCount(),
        auction.getWatcherCount(),
        auction.getCreatedAt(),
        seller,
        cause,
        auction.isReserveMet(),
        viewerId == null ? null : watched,
        viewerBidStatus(viewerId, hasBid, leaderId));
  }

  public BidResponse toBidResponse(Bid bid, UUID viewerId) {
    return toBidResponse(bid, users.publicUsersById(List.of(bid.getBidderId())));
  }

  public BidResponse toBidResponse(Bid bid, Map<UUID, PublicUserResponse> bidders) {
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
        bidder == null ? "" : bidder.username());
  }

  private static ViewerBidStatus viewerBidStatus(UUID viewerId, boolean hasBid, UUID leaderId) {
    if (viewerId == null) {
      return null;
    }
    if (!hasBid) {
      return ViewerBidStatus.NONE;
    }
    return viewerId.equals(leaderId) ? ViewerBidStatus.WINNING : ViewerBidStatus.OUTBID;
  }
}
