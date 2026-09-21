package ro.bid4.backend.catalog.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.catalog.api.dto.AuctionQuery;
import ro.bid4.backend.catalog.api.dto.AuctionResponse;
import ro.bid4.backend.catalog.api.dto.BidResponse;
import ro.bid4.backend.catalog.api.dto.FeaturedAuctionsResponse;
import ro.bid4.backend.catalog.domain.Auction;
import ro.bid4.backend.catalog.domain.AuctionStatus;
import ro.bid4.backend.catalog.domain.Bid;
import ro.bid4.backend.catalog.domain.BidStatus;
import ro.bid4.backend.catalog.repo.AuctionRepository;
import ro.bid4.backend.catalog.repo.BidRepository;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.common.text.SearchTerms;
import ro.bid4.backend.common.web.PageResponse;
import ro.bid4.backend.common.web.Viewer;
import ro.bid4.backend.identity.api.dto.PublicUserResponse;
import ro.bid4.backend.identity.service.UserMapper;

@Service
@Transactional(readOnly = true)
public class AuctionService {
  private final AuctionRepository auctions;
  private final BidRepository bids;
  private final AuctionMapper mapper;
  private final UserMapper users;

  public AuctionService(
      AuctionRepository auctions, BidRepository bids, AuctionMapper mapper, UserMapper users) {
    this.auctions = auctions;
    this.bids = bids;
    this.mapper = mapper;
    this.users = users;
  }

  public PageResponse<AuctionResponse> list(AuctionQuery query, Viewer viewer) {
    List<Specification<Auction>> filters = new ArrayList<>();
    filters.add(visibleTo(query, viewer));

    if (query.status() != null && !query.status().isEmpty()) {
      filters.add(AuctionSpecifications.statusIn(query.status()));
    }
    if (query.category() != null && !query.category().isEmpty()) {
      filters.add(AuctionSpecifications.categoryIn(query.category()));
    }
    if (query.condition() != null && !query.condition().isEmpty()) {
      filters.add(AuctionSpecifications.conditionIn(query.condition()));
    }
    if (query.causeId() != null) {
      filters.add(AuctionSpecifications.causeIs(query.causeId()));
    }
    if (query.sellerId() != null) {
      filters.add(AuctionSpecifications.sellerIs(query.sellerId()));
    }
    if (query.minPrice() != null) {
      filters.add(AuctionSpecifications.priceAtLeast(query.minPrice()));
    }
    if (query.maxPrice() != null) {
      filters.add(AuctionSpecifications.priceAtMost(query.maxPrice()));
    }
    if (query.minDonationPercent() != null) {
      filters.add(AuctionSpecifications.donationAtLeast(query.minDonationPercent()));
    }
    if (!SearchTerms.words(query.q()).isEmpty()) {
      filters.add(AuctionSpecifications.matchesText(query.q()));
    }

    int pageSize =
        query.pageSizeOrDefault(CatalogRules.DEFAULT_PAGE_SIZE, CatalogRules.MAX_PAGE_SIZE);
    Pageable pageable =
        PageRequest.of(query.zeroBasedPage(), pageSize, query.sortOrDefault().sort());

    Page<Auction> page = auctions.findAll(Specification.allOf(filters), pageable);

    return PageResponse.of(
        mapper.toResponses(page.getContent(), viewer.id()),
        page.getNumber() + 1,
        page.getSize(),
        page.getTotalElements());
  }

  public AuctionResponse get(UUID id, Viewer viewer) {
    return mapper.toResponse(load(id, viewer), viewer.id());
  }

  public FeaturedAuctionsResponse featured(Viewer viewer) {
    List<Auction> live = liveWindow();

    List<Auction> mostWatched = FeaturedRanking.mostWatched(live, CatalogRules.MOST_WATCHED_COUNT);
    List<Auction> latest = FeaturedRanking.latest(live, CatalogRules.LATEST_COUNT);

    Map<UUID, AuctionResponse> mapped = mapTogether(viewer, mostWatched, latest);

    return new FeaturedAuctionsResponse(pick(mostWatched, mapped), pick(latest, mapped));
  }

  public List<AuctionResponse> related(UUID id, Viewer viewer) {
    Auction subject = load(id, viewer);
    List<Auction> ranked = FeaturedRanking.related(subject, liveWindow());
    return mapper.toResponses(ranked, viewer.id());
  }

  public List<BidResponse> bidHistory(UUID auctionId, Viewer viewer) {
    Auction auction = load(auctionId, viewer);
    boolean seller = viewer.is(auction.getSellerId());
    if (auction.getStatus().isCommitted() && !seller) {
      return List.of();
    }

    List<Bid> history = bids.findByAuctionIdOrderByAmountDesc(auctionId);
    if (history.isEmpty()) {
      return List.of();
    }

    Map<UUID, PublicUserResponse> bidders =
        users.publicUsersById(history.stream().map(Bid::getBidderId).distinct().toList());

    return history.stream()
        .map(
            bid -> {
              PublicUserResponse bidder = bidders.get(bid.getBidderId());
              return new BidResponse(
                  bid.getId(),
                  bid.getAuctionId(),
                  bid.getBidderId(),
                  bid.getAmount(),
                  bid.getCreatedAt(),
                  seller || viewer.is(bid.getBidderId()) ? bid.getStatus() : publicStatus(bid),
                  shortName(bidder == null ? null : bidder.displayName()),
                  bidder == null ? "" : bidder.avatarUrl(),
                  "");
            })
        .toList();
  }

  private List<Auction> liveWindow() {
    return auctions.findByStatusOrderByCreatedAtDesc(
        AuctionStatus.LIVE, Limit.of(CatalogRules.RANKING_WINDOW));
  }

  private Auction load(UUID id, Viewer viewer) {
    Auction auction = auctions.findById(id).orElseThrow(() -> ApiException.notFound("Licitația"));
    if (!isVisible(auction, viewer)) {
      throw ApiException.notFound("Licitația");
    }
    return auction;
  }

  private static boolean isVisible(Auction auction, Viewer viewer) {
    return auction.getStatus().isPublic() || viewer.staff() || viewer.is(auction.getSellerId());
  }

  private static Specification<Auction> visibleTo(AuctionQuery query, Viewer viewer) {
    if (viewer.staff()) {
      return Specification.unrestricted();
    }
    if (query.sellerId() != null && viewer.is(query.sellerId())) {
      return Specification.unrestricted();
    }
    return AuctionSpecifications.statusIn(AuctionStatus.PUBLIC);
  }

  @SafeVarargs
  private Map<UUID, AuctionResponse> mapTogether(Viewer viewer, List<Auction>... rows) {
    Map<UUID, Auction> distinct = new LinkedHashMap<>();
    for (List<Auction> row : rows) {
      for (Auction auction : row) {
        distinct.putIfAbsent(auction.getId(), auction);
      }
    }
    Map<UUID, AuctionResponse> byId = new LinkedHashMap<>();
    for (AuctionResponse response :
        mapper.toResponses(List.copyOf(distinct.values()), viewer.id())) {
      byId.put(response.id(), response);
    }
    return byId;
  }

  private static List<AuctionResponse> pick(List<Auction> row, Map<UUID, AuctionResponse> mapped) {
    return row.stream()
        .map(auction -> mapped.get(auction.getId()))
        .filter(Objects::nonNull)
        .toList();
  }

  private static String shortName(String displayName) {
    if (displayName == null || displayName.isBlank()) {
      return "Ofertant";
    }
    String[] parts = displayName.trim().split("\\s+");
    if (parts.length == 1) {
      return parts[0];
    }
    return parts[0] + " " + parts[1].charAt(0) + ".";
  }

  private static BidStatus publicStatus(Bid bid) {
    return bid.getStatus() == BidStatus.WINNING ? BidStatus.WINNING : BidStatus.OUTBID;
  }
}
