package ro.bid4.backend.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import ro.bid4.backend.TestcontainersConfiguration;
import ro.bid4.backend.catalog.api.dto.AuctionResponse;
import ro.bid4.backend.catalog.api.dto.CreateAuctionRequest;
import ro.bid4.backend.catalog.domain.Auction;
import ro.bid4.backend.catalog.domain.AuctionStatus;
import ro.bid4.backend.catalog.domain.Bid;
import ro.bid4.backend.catalog.domain.BidStatus;
import ro.bid4.backend.catalog.domain.ItemCondition;
import ro.bid4.backend.catalog.repo.AuctionRepository;
import ro.bid4.backend.catalog.repo.BidRepository;
import ro.bid4.backend.catalog.service.CatalogRules;
import ro.bid4.backend.catalog.service.ListingService;
import ro.bid4.backend.cause.domain.Cause;
import ro.bid4.backend.cause.domain.CauseStatus;
import ro.bid4.backend.cause.repo.CauseRepository;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.common.web.Viewer;
import ro.bid4.backend.identity.domain.AccountType;
import ro.bid4.backend.identity.domain.UserAccount;
import ro.bid4.backend.identity.domain.UserRole;
import ro.bid4.backend.identity.repo.UserAccountRepository;
import ro.bid4.backend.storage.domain.StoredFile;
import ro.bid4.backend.storage.domain.Visibility;
import ro.bid4.backend.storage.repo.StoredFileRepository;

/**
 * Putting a listing up, and taking it back down.
 *
 * <p>Driven through the service rather than MockMvc: what matters is the row that ends up in the
 * table and who was allowed to write it, and a status code proves neither.
 */
@SpringBootTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@Import(TestcontainersConfiguration.class)
@TestPropertySource(properties = "bid4.rate-limit.enabled=false")
class ListingWriteTest {

  private static final long LEU = 100;

  @Autowired private ListingService listings;
  @Autowired private AuctionRepository auctions;
  @Autowired private BidRepository bids;
  @Autowired private CauseRepository causes;
  @Autowired private UserAccountRepository users;
  @Autowired private StoredFileRepository storedFiles;

  private UserAccount seller;
  private Cause approved;

  @BeforeAll
  void seedTheWorld() {
    seller = user("Vanzator Anunt", UserRole.USER);
    approved = cause(seller.getId(), CauseStatus.ACTIVE);
  }

  /* --- creating ----------------------------------------------------------- */

  @Test
  @DisplayName("a new listing queues for review rather than opening straight away")
  void createdListingWaitsForReview() {
    AuctionResponse created = listings.create(request().build(), viewer(seller));

    Auction stored = auctions.findById(created.id()).orElseThrow();
    assertThat(stored.getStatus()).isEqualTo(AuctionStatus.PENDING_REVIEW);
    assertThat(stored.getSellerId()).isEqualTo(seller.getId());
    // Nothing has been offered, so the price on the card is the ask.
    assertThat(stored.getCurrentPrice()).isEqualTo(stored.getStartingPrice());
    assertThat(stored.getBidCount()).isZero();
    assertThat(stored.getWinnerId()).isNull();
    // Read off the response, not the entity: images are a lazy collection and
    // the session that loaded the row is long closed by here.
    assertThat(created.images()).hasSize(2);
  }

  @Test
  @DisplayName("the seller is the token, not the body")
  void sellerComesFromTheViewer() {
    UserAccount other = user("Alt Vanzator", UserRole.USER);
    AuctionResponse created =
        listings.create(request().images(photos(other.getId())).build(), viewer(other));

    assertThat(auctions.findById(created.id()).orElseThrow().getSellerId())
        .isEqualTo(other.getId());
  }

  @Test
  @DisplayName("signing in is required to list anything")
  void anonymousCannotCreate() {
    assertThatThrownBy(() -> listings.create(request().build(), Viewer.anonymous()))
        .isInstanceOf(ApiException.class);
  }

  @Test
  @DisplayName("a listing can only raise money for a cause that was approved")
  void unapprovedCauseIsRefused() {
    Cause draft = cause(seller.getId(), CauseStatus.PENDING_APPROVAL);

    assertThatThrownBy(
            () -> listings.create(request().causeId(draft.getId()).build(), viewer(seller)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("aprobate");
  }

  @Test
  @DisplayName("a reserve below the starting price is refused")
  void reserveUnderStartIsRefused() {
    assertThatThrownBy(
            () -> listings.create(request().reservePrice(50 * LEU).build(), viewer(seller)))
        .isInstanceOf(ApiException.class);
  }

  @Test
  @DisplayName("a buy-now at or below the starting price is refused")
  void buyNowAtStartIsRefused() {
    // Equal to the start, the first bid always ends it — a fixed-price sale
    // wearing an auction's clothes.
    assertThatThrownBy(
            () -> listings.create(request().buyNowPrice(100 * LEU).build(), viewer(seller)))
        .isInstanceOf(ApiException.class);
  }

  @Test
  @DisplayName("the bid step is read off the asking price, not off the seller")
  void bidStepIsDerived() {
    // 100 lei sits on the first rung of the ladder, which steps by 5.
    AuctionResponse created = listings.create(request().build(), viewer(seller));

    assertThat(auctions.findById(created.id()).orElseThrow().getBidIncrement())
        .isEqualTo(CatalogRules.bidStepFor(100 * LEU))
        .isEqualTo(5 * LEU);
  }

  @Test
  @DisplayName("a listing opens now, and has nothing to close")
  void listingsHaveNoWindow() {
    Instant before = Instant.now();
    AuctionResponse created = listings.create(request().build(), viewer(seller));

    assertThat(created.startTime()).isBetween(before, Instant.now());
    assertThat(created.acceptedAt()).isNull();
    assertThat(created.dispatchDeadline()).isNull();
  }

  @Test
  @DisplayName("a category outside the list is refused rather than left to the database")
  void unknownCategoryIsRefused() {
    assertThatThrownBy(
            () -> listings.create(request().category("nave-spatiale").build(), viewer(seller)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("categorie");
  }

  /* --- withdrawing -------------------------------------------------------- */

  @Test
  @DisplayName("withdrawing marks the listing cancelled and releases every live offer")
  void cancelReleasesBidders() {
    Auction auction = liveAuction();
    UserAccount bidder = user("Licitator Retras", UserRole.USER);
    Bid offer = bid(auction, bidder.getId(), 200 * LEU, BidStatus.WINNING);

    listings.cancel(auction.getId(), viewer(seller));

    assertThat(auctions.findById(auction.getId()).orElseThrow().getStatus())
        .isEqualTo(AuctionStatus.CANCELLED);
    // Otherwise the bid sits at "Câștigi" against a listing that is gone.
    assertThat(bids.findById(offer.getId()).orElseThrow().getStatus()).isEqualTo(BidStatus.LOST);
  }

  @Test
  @DisplayName("somebody else's listing is not theirs to withdraw")
  void onlyTheSellerMayCancel() {
    Auction auction = liveAuction();
    UserAccount stranger = user("Trecator", UserRole.USER);

    assertThatThrownBy(() -> listings.cancel(auction.getId(), viewer(stranger)))
        .isInstanceOf(ApiException.class);
    assertThat(auctions.findById(auction.getId()).orElseThrow().getStatus())
        .isEqualTo(AuctionStatus.LIVE);
  }

  @Test
  @DisplayName("a listing with an accepted offer cannot be withdrawn until it is released")
  void reservedCannotBeCancelled() {
    Auction auction = liveAuction();
    UserAccount buyer = user("Cumparator Retinut", UserRole.USER);
    Bid offer = bid(auction, buyer.getId(), 200 * LEU, BidStatus.ACCEPTED);
    reserve(auction, buyer, offer);

    assertThatThrownBy(() -> listings.cancel(auction.getId(), viewer(seller)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("Anuleaz-o");
    assertThat(auctions.findById(auction.getId()).orElseThrow().getStatus())
        .isEqualTo(AuctionStatus.RESERVED);
  }

  @Test
  @DisplayName("a listing that has been paid for cannot be withdrawn at all")
  void soldCannotBeCancelled() {
    Auction auction = liveAuction();
    UserAccount buyer = user("Cumparator Platit", UserRole.USER);
    Bid offer = bid(auction, buyer.getId(), 200 * LEU, BidStatus.WON);
    reserve(auction, buyer, offer);
    auction.setStatus(AuctionStatus.SOLD);
    auctions.save(auction);

    assertThatThrownBy(() -> listings.cancel(auction.getId(), viewer(seller)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("vândut");
  }

  @Test
  @DisplayName("withdrawing twice is not an error")
  void cancelIsIdempotent() {
    Auction auction = liveAuction();

    listings.cancel(auction.getId(), viewer(seller));
    listings.cancel(auction.getId(), viewer(seller));

    assertThat(auctions.findById(auction.getId()).orElseThrow().getStatus())
        .isEqualTo(AuctionStatus.CANCELLED);
  }

  @Test
  @DisplayName("staff can withdraw a listing that is not theirs")
  void staffMayCancel() {
    Auction auction = liveAuction();
    UserAccount operator = user("Moderator", UserRole.OPERATOR);

    listings.cancel(auction.getId(), Viewer.of(operator.getId(), true));

    assertThat(auctions.findById(auction.getId()).orElseThrow().getStatus())
        .isEqualTo(AuctionStatus.CANCELLED);
  }

  @Test
  @DisplayName("a listing cannot be built from somebody else's photographs")
  void imagesMustBelongToTheSeller() {
    UserAccount other = user("Alt Vanzator Foto", UserRole.USER);

    assertThatThrownBy(
            () -> listings.create(request().images(photos(other.getId())).build(), viewer(seller)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("Fotografiile");
  }

  @Test
  @DisplayName("and not from an address the seller made up")
  void imagesMustBeRefs() {
    assertThatThrownBy(
            () ->
                listings.create(
                    request().images(List.of("https://example.invalid/a.png")).build(),
                    viewer(seller)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("Fotografiile");
  }

  /* --- fixtures ----------------------------------------------------------- */

  /** A valid listing, so each test only has to say what it is bending. */
  private Request request() {
    return new Request(approved.getId(), photos(seller.getId()));
  }

  /**
   * Two photographs already uploaded by this account.
   *
   * <p>A listing is created from refs to stored objects, and the refs have to be the seller's own —
   * so the fixture has to put them there, exactly as an upload would.
   */
  private List<String> photos(UUID ownerId) {
    return List.of(photo(ownerId), photo(ownerId)).stream().map(UUID::toString).toList();
  }

  private UUID photo(UUID ownerId) {
    StoredFile file = new StoredFile();
    file.setBucket("bid4-public");
    file.setObjectKey("listings/" + UUID.randomUUID() + ".webp");
    file.setVisibility(Visibility.PUBLIC);
    file.setOriginalName("photo.webp");
    file.setContentType("image/webp");
    file.setSizeBytes(1024);
    file.setChecksumSha256("a".repeat(64));
    file.setOwnerId(ownerId);
    return storedFiles.save(file).getId();
  }

  private static final class Request {
    private UUID causeId;
    private List<String> images;
    private String category = "electronice";
    private Long reservePrice;
    private Long buyNowPrice;

    Request(UUID causeId, List<String> images) {
      this.causeId = causeId;
      this.images = images;
    }

    Request images(List<String> value) {
      this.images = value;
      return this;
    }

    Request causeId(UUID value) {
      this.causeId = value;
      return this;
    }

    Request category(String value) {
      this.category = value;
      return this;
    }

    Request reservePrice(long value) {
      this.reservePrice = value;
      return this;
    }

    Request buyNowPrice(long value) {
      this.buyNowPrice = value;
      return this;
    }

    CreateAuctionRequest build() {
      return new CreateAuctionRequest(
          "Aparat foto de colecție",
          "Funcțional, păstrat în cutia originală, cu toate accesoriile incluse.",
          images,
          category,
          ItemCondition.VERY_GOOD,
          800,
          causeId,
          30,
          100 * LEU,
          reservePrice,
          buyNowPrice);
    }
  }

  private Auction liveAuction() {
    Auction auction = new Auction();
    auction.setSellerId(seller.getId());
    auction.setCauseId(approved.getId());
    auction.setTitle("Obiect de test " + UUID.randomUUID());
    auction.setDescription("Descriere suficient de lungă pentru validare.");
    auction.setImages(List.of("https://example.invalid/live.png"));
    auction.setCategory("electronice");
    auction.setCondition(ItemCondition.VERY_GOOD);
    auction.setWeightGrams(500);
    auction.setDonationPercent((short) 25);
    auction.setStartingPrice(100 * LEU);
    auction.setCurrentPrice(100 * LEU);
    auction.setBidIncrement(10 * LEU);
    auction.setStartTime(Instant.now().minus(Duration.ofHours(1)));
    auction.setStatus(AuctionStatus.LIVE);
    return auctions.save(auction);
  }

  /** Everything an acceptance writes at once, because the table refuses any half of it. */
  private void reserve(Auction auction, UserAccount buyer, Bid offer) {
    auction.setStatus(AuctionStatus.RESERVED);
    auction.setWinnerId(buyer.getId());
    auction.setAcceptedBidId(offer.getId());
    auction.setAcceptedAt(Instant.now());
    auctions.save(auction);
  }

  private Bid bid(Auction auction, UUID bidderId, long amount, BidStatus status) {
    Bid bid = new Bid();
    bid.setAuctionId(auction.getId());
    bid.setBidderId(bidderId);
    bid.setAmount(amount);
    bid.setStatus(status);
    return bids.save(bid);
  }

  private static Viewer viewer(UserAccount account) {
    return Viewer.of(account.getId(), false);
  }

  private UserAccount user(String displayName, UserRole role) {
    String suffix = UUID.randomUUID().toString().substring(0, 8);
    UserAccount account = new UserAccount();
    account.setEmail("listing-" + suffix + "@bid4.ro");
    account.setDisplayName(displayName);
    account.setUsername("listing-" + suffix);
    account.setRole(role);
    account.setAccountType(AccountType.INDIVIDUAL);
    account.setEmailVerifiedAt(Instant.now());
    account.setAvatarUrl("");
    return users.save(account);
  }

  private Cause cause(UUID organizerId, CauseStatus status) {
    Cause cause = new Cause();
    cause.setOrganizerId(organizerId);
    cause.setName("Cauza pentru anunturi");
    cause.setSlug("cauza-" + UUID.randomUUID().toString().substring(0, 8));
    cause.setShortDescription("Descriere scurtă pentru teste.");
    cause.setCategory("medical");
    cause.setStatus(status);
    cause.setGoalAmount(10_000 * LEU);
    cause.setRaisedAmount(0);
    return causes.save(cause);
  }
}
