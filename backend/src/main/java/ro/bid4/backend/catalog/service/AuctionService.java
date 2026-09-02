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
import ro.bid4.backend.catalog.repo.AuctionRepository;
import ro.bid4.backend.catalog.repo.BidRepository;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.common.text.SearchTerms;
import ro.bid4.backend.common.web.PageResponse;
import ro.bid4.backend.common.web.Viewer;
import ro.bid4.backend.identity.api.dto.PublicUserResponse;
import ro.bid4.backend.identity.service.UserMapper;

/**
 * Reading the catalogue.
 *
 * <p>Authorisation here is on the row and not on the route. These endpoints answer an anonymous
 * caller, so "is this auction visible to whoever is asking" has to be decided per auction: a draft
 * belongs to its seller, and asking for one by id must look the same as asking for one that was
 * never created.
 */
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

  /** GET /auctions */
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

  /** GET /auctions/{id} */
  public AuctionResponse get(UUID id, Viewer viewer) {
    return mapper.toResponse(load(id, viewer), viewer.id());
  }

  /** GET /auctions/featured — the two homepage rows. */
  public FeaturedAuctionsResponse featured(Viewer viewer) {
    List<Auction> live = liveWindow();

    List<Auction> mostWatched = FeaturedRanking.mostWatched(live, CatalogRules.MOST_WATCHED_COUNT);
    List<Auction> latest = FeaturedRanking.latest(live, CatalogRules.LATEST_COUNT);

    // The rows overlap, and mapping them separately would fetch the same
    // sellers and causes twice.
    Map<UUID, AuctionResponse> mapped = mapTogether(viewer, mostWatched, latest);

    return new FeaturedAuctionsResponse(pick(mostWatched, mapped), pick(latest, mapped));
  }

  /** GET /auctions/{id}/related — "more like this", under an auction. */
  public List<AuctionResponse> related(UUID id, Viewer viewer) {
    Auction subject = load(id, viewer);
    List<Auction> ranked = FeaturedRanking.related(subject, liveWindow());
    return mapper.toResponses(ranked, viewer.id());
  }

  /**
   * GET /auctions/{id}/bids — the public history.
   *
   * <p>Pseudonymised: "Maria I." rather than a full name. Who is bidding against whom is not
   * something a listing page needs to publish.
   */
  public List<BidResponse> bidHistory(UUID auctionId, Viewer viewer) {
    load(auctionId, viewer);

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
                  bid.getStatus(),
                  shortName(bidder == null ? null : bidder.displayName()),
                  bidder == null ? "" : bidder.avatarUrl(),
                  "");
            })
        .toList();
  }

  /**
   * The ranking window: live auctions, soonest closing first, capped.
   *
   * <p>LIVE is the whole of it now. Nothing expires on its own, so a listing carrying that status
   * is genuinely open, and the window is bounded by count alone.
   */
  private List<Auction> liveWindow() {
    return auctions.findByStatusOrderByCreatedAtDesc(
        AuctionStatus.LIVE, Limit.of(CatalogRules.RANKING_WINDOW));
  }

  /**
   * Not found rather than forbidden.
   *
   * <p>A draft that answers 403 tells the asker it exists, which is the whole of what they were
   * trying to learn.
   */
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

  /**
   * The listing equivalent of {@link #isVisible}.
   *
   * <p>Staff see everything. A seller browsing their own shelf sees everything of theirs — which is
   * why the unpublished states are only reachable by naming yourself, never by naming someone else.
   */
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

  /** "Maria Ionescu" becomes "Maria I." — mirrors shortName in lib/api/bids.ts. */
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
}
