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

/**
 * Auctions become responses here, and only here.
 *
 * <p>The single public entry point takes a list rather than one auction, because everything a card
 * needs beyond its own row — the seller, the cause, who is leading, whether the viewer is following
 * it — is fetched for the whole page at once. Mapping one at a time would turn a page of twelve
 * into fifty queries, and the only way to stop that happening by accident is to make the batched
 * call the easy one.
 */
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

    // Who is leading only matters for telling a viewer whether it is them, so an
    // anonymous page does not pay for it. Same for the two lookups below: with
    // nobody to answer about, they would fetch a row to compare against null.
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
      UUID viewerId) {

    boolean viewerIsSeller = viewerId != null && viewerId.equals(auction.getSellerId());

    return new AuctionResponse(
        auction.getId(),
        auction.getSellerId(),
        auction.getCauseId(),
        auction.getTitle(),
        auction.getDescription(),
        List.copyOf(auction.getImages()),
        auction.getCategory(),
        auction.getCondition(),
        auction.getWeightGrams(),
        auction.getDonationPercent(),
        auction.getStartingPrice(),
        auction.getCurrentPrice(),
        auction.getBidIncrement(),
        // The number itself is the seller's business. Everyone else is told
        // whether it was met, which is all the listing page ever shows.
        viewerIsSeller ? auction.getReservePrice() : null,
        auction.getBuyNowPrice(),
        auction.getStartTime(),
        auction.getEndTime(),
        auction.getAntiSnipeSeconds(),
        auction.getStatus(),
        auction.getWinnerId(),
        auction.getBidCount(),
        auction.getWatcherCount(),
        auction.getExtensionCount(),
        auction.getCreatedAt(),
        seller,
        cause,
        auction.isReserveMet(),
        viewerId == null ? null : watched,
        viewerBidStatus(viewerId, hasBid, leaderId));
  }

  /**
   * One bid, for the person who just made it.
   *
   * <p>Their own name is not shortened here — the pseudonymised history is for readers of someone
   * else's auction, and hiding a bidder from themselves would only be confusing.
   */
  public BidResponse toBidResponse(Bid bid, UUID viewerId) {
    return toBidResponse(bid, users.publicUsersById(List.of(bid.getBidderId())));
  }

  /**
   * The batched form, for callers holding more than one bid.
   *
   * <p>The single-bid overload above is one query; calling it in a loop is one query per row, which
   * is how a list of twenty offers became twenty-one round trips.
   */
  public BidResponse toBidResponse(Bid bid, Map<UUID, PublicUserResponse> bidders) {
    PublicUserResponse bidder = bidders.get(bid.getBidderId());
    return new BidResponse(
        bid.getId(),
        bid.getAuctionId(),
        bid.getBidderId(),
        bid.getAmount(),
        bid.getCreatedAt(),
        bid.getStatus(),
        bid.isTriggeredExtension(),
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
