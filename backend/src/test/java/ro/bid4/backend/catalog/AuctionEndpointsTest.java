package ro.bid4.backend.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import ro.bid4.backend.TestcontainersConfiguration;
import ro.bid4.backend.catalog.domain.Auction;
import ro.bid4.backend.catalog.domain.AuctionStatus;
import ro.bid4.backend.catalog.domain.Bid;
import ro.bid4.backend.catalog.domain.BidStatus;
import ro.bid4.backend.catalog.domain.ItemCondition;
import ro.bid4.backend.catalog.repo.AuctionRepository;
import ro.bid4.backend.catalog.repo.BidRepository;
import ro.bid4.backend.catalog.service.CatalogRules;
import ro.bid4.backend.cause.domain.Cause;
import ro.bid4.backend.cause.domain.CauseStatus;
import ro.bid4.backend.cause.repo.CauseRepository;
import ro.bid4.backend.identity.domain.AccountType;
import ro.bid4.backend.identity.domain.UserAccount;
import ro.bid4.backend.identity.domain.UserRole;
import ro.bid4.backend.identity.repo.UserAccountRepository;
import ro.bid4.backend.security.jwt.JwtService;

@SpringBootTest
@AutoConfigureMockMvc
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@Import(TestcontainersConfiguration.class)
@TestPropertySource(properties = "bid4.rate-limit.enabled=false")
class AuctionEndpointsTest {
  private static final long LEU = 100;

  @Autowired private MockMvc mvc;
  @Autowired private UserAccountRepository users;
  @Autowired private CauseRepository causes;
  @Autowired private AuctionRepository auctions;
  @Autowired private BidRepository bids;
  @Autowired private JwtService tokens;

  private UserAccount seller;
  private UserAccount rival;
  private UserAccount leader;
  private UserAccount staff;

  private UserAccount loner;

  private Cause medical;
  private Cause shelter;
  private Cause lonerCause;

  private Auction canon;
  private Auction bicycle;
  private Auction paints;
  private Auction unpublished;
  private Auction sold;

  @BeforeAll
  void seedTheWorld() {
    seller = user("Maria Ionescu", UserRole.USER);
    rival = user("Vlad Petrescu", UserRole.USER);
    leader = user("Andrei Marinescu", UserRole.USER);
    staff = user("Cristina Dobre", UserRole.ADMIN);
    loner = user("Dana Constantin", UserRole.USER);

    medical = cause(seller.getId(), "Operația Anei", "medical", 45_000 * LEU, 12_400 * LEU);
    shelter = cause(rival.getId(), "Adăpostul de la marginea orașului", "animale", 30_000 * LEU, 0);
    lonerCause = cause(loner.getId(), "Atelier de robotică", "educatie", 8_000 * LEU, 0);

    Instant now = Instant.now();

    canon =
        auction(
            seller.getId(),
            medical.getId(),
            "Aparat foto Canon AE-1 Program",
            "Aparat pe film din 1983, complet funcțional.",
            "electronice",
            40,
            250 * LEU,
            400 * LEU,
            now.minus(Duration.ofDays(2)),
            AuctionStatus.LIVE);

    bicycle =
        auction(
            seller.getId(),
            medical.getId(),
            "Bicicletă de oraș Pegas Practic",
            "Rulată două veri, ținută în casă.",
            "sport",
            30,
            400 * LEU,
            null,
            now.minus(Duration.ofDays(1)),
            AuctionStatus.LIVE);

    paints =
        auction(
            rival.getId(),
            shelter.getId(),
            "Set de acuarele Winsor & Newton",
            "Cutie metalică, folosită de câteva ori.",
            "arta",
            100,
            120 * LEU,
            null,
            now.minus(Duration.ofHours(5)),
            AuctionStatus.LIVE);

    unpublished =
        auction(
            seller.getId(),
            medical.getId(),
            "Mașină de cusut Singer",
            "Funcțională, revizuită anul acesta.",
            "casa",
            45,
            350 * LEU,
            null,
            now.minus(Duration.ofHours(2)),
            AuctionStatus.PENDING_REVIEW);

    sold =
        auction(
            seller.getId(),
            shelter.getId(),
            "Ceas Certina DS Podium",
            "Purtat rar, baterie schimbată.",
            "bijuterii",
            75,
            900 * LEU,
            null,
            now.minus(Duration.ofDays(10)),
            AuctionStatus.LIVE);
    Bid winning = bid(sold.getId(), leader.getId(), 900 * LEU, BidStatus.WON);
    sold.setStatus(AuctionStatus.SOLD);
    sold.setWinnerId(leader.getId());
    sold.setAcceptedBidId(winning.getId());
    sold.setAcceptedAt(now.minus(Duration.ofDays(3)));
    sold.setBidCount(1);
    sold.setCurrentPrice(900 * LEU);
    auctions.save(sold);

    bid(canon.getId(), rival.getId(), 250 * LEU, BidStatus.OUTBID);
    bid(canon.getId(), leader.getId(), 300 * LEU, BidStatus.WINNING);
    canon.setCurrentPrice(300 * LEU);
    canon.setBidCount(2);
    auctions.save(canon);
  }

  @Test
  @DisplayName("GET /auctions answers the paged shape, with the seller and the cause joined in")
  void listReturnsThePagedShape() throws Exception {
    mvc.perform(get("/auctions").param("causeId", medical.getId().toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page").value(1))
        .andExpect(jsonPath("$.pageSize").value(CatalogRules.DEFAULT_PAGE_SIZE))
        .andExpect(jsonPath("$.total").value(2))
        .andExpect(jsonPath("$.totalPages").value(1))
        .andExpect(jsonPath("$.items[0].title").value("Bicicletă de oraș Pegas Practic"))
        .andExpect(jsonPath("$.items[1].title").value("Aparat foto Canon AE-1 Program"))
        .andExpect(jsonPath("$.items[1].sellerId").value(seller.getId().toString()))
        .andExpect(jsonPath("$.items[1].causeId").value(medical.getId().toString()))
        .andExpect(jsonPath("$.items[1].category").value("electronice"))
        .andExpect(jsonPath("$.items[1].condition").value("VERY_GOOD"))
        .andExpect(jsonPath("$.items[1].status").value("LIVE"))
        .andExpect(jsonPath("$.items[1].donationPercent").value(40))
        .andExpect(jsonPath("$.items[1].currentPrice").value(300 * LEU))
        .andExpect(jsonPath("$.items[1].bidCount").value(2))
        .andExpect(jsonPath("$.items[1].images").isArray())
        .andExpect(jsonPath("$.items[1].seller.displayName").value("Maria Ionescu"))
        .andExpect(jsonPath("$.items[1].seller.username").value(seller.getUsername()))
        .andExpect(jsonPath("$.items[1].cause.name").value("Operația Anei"))
        .andExpect(jsonPath("$.items[1].cause.slug").value(medical.getSlug()))
        .andExpect(jsonPath("$.items[1].cause.goalAmount").value(45_000 * LEU))
        .andExpect(jsonPath("$.items[1].cause.status").value("ACTIVE"));
  }

  @Test
  @DisplayName("Fields the TypeScript types declare as required are never dropped as null")
  void requiredStringsAreAlwaysPresent() throws Exception {
    UserAccount faceless = user("Fara Poza", UserRole.USER);
    Cause own = cause(faceless.getId(), "Cauza fără poză", "comunitate", 5_000 * LEU, 0);
    Auction listing =
        auction(
            faceless.getId(),
            own.getId(),
            "Anunț fără poză de profil",
            "Descriere.",
            "jucarii",
            10,
            100 * LEU,
            null,
            Instant.now().minus(Duration.ofHours(1)),
            AuctionStatus.LIVE);
    bid(listing.getId(), rival.getId(), 100 * LEU, BidStatus.WINNING);

    mvc.perform(get("/auctions/" + listing.getId()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.seller.avatarUrl").value(""))
        .andExpect(jsonPath("$.seller.bio").value(""))
        .andExpect(jsonPath("$.cause.imageUrl").exists())
        .andExpect(jsonPath("$.images").isArray());

    mvc.perform(get("/auctions/" + listing.getId() + "/bids"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].alias").exists())
        .andExpect(jsonPath("$[0].mine").exists());
  }

  @Test
  @DisplayName("The seller's own fields never travel: no email, no role, no status")
  void thePublicSellerBlockCarriesNothingPrivate() throws Exception {
    mvc.perform(get("/auctions/" + canon.getId()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.seller.email").doesNotExist())
        .andExpect(jsonPath("$.seller.role").doesNotExist())
        .andExpect(jsonPath("$.seller.status").doesNotExist())
        .andExpect(jsonPath("$.seller.hasPaymentMethod").doesNotExist());
  }

  @Test
  @DisplayName("An unpublished listing is not found rather than forbidden")
  void unpublishedListingsAreInvisibleToStrangers() throws Exception {
    mvc.perform(get("/auctions/" + unpublished.getId()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    mvc.perform(
            get("/auctions/" + unpublished.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(rival)))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("Its seller sees it, and so does staff")
  void unpublishedListingsAreVisibleToTheirSellerAndToStaff() throws Exception {
    mvc.perform(
            get("/auctions/" + unpublished.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(seller)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("PENDING_REVIEW"));

    mvc.perform(
            get("/auctions/" + unpublished.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(staff)))
        .andExpect(status().isOk());
  }

  @Test
  @DisplayName("Naming someone else as the seller does not open their unpublished shelf")
  void listingSomeoneElsesShelfShowsOnlyWhatIsPublic() throws Exception {
    mvc.perform(
            get("/auctions")
                .param("sellerId", seller.getId().toString())
                .header(HttpHeaders.AUTHORIZATION, bearer(rival)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.total").value(3));

    mvc.perform(
            get("/auctions")
                .param("sellerId", seller.getId().toString())
                .header(HttpHeaders.AUTHORIZATION, bearer(seller)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.total").value(4));
  }

  @Test
  @DisplayName("The reserve price reaches the seller and nobody else")
  void reservePriceIsOnlyEverSentToTheSeller() throws Exception {
    mvc.perform(get("/auctions/" + canon.getId()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.reservePrice").doesNotExist())
        .andExpect(jsonPath("$.reserveMet").value(false));

    mvc.perform(get("/auctions/" + canon.getId()).header(HttpHeaders.AUTHORIZATION, bearer(rival)))
        .andExpect(jsonPath("$.reservePrice").doesNotExist());

    mvc.perform(get("/auctions/" + canon.getId()).header(HttpHeaders.AUTHORIZATION, bearer(seller)))
        .andExpect(jsonPath("$.reservePrice").value(400 * LEU));
  }

  @Test
  @DisplayName("Viewer fields are absent without a viewer, and answer for one")
  void viewerFieldsDependOnWhoIsAsking() throws Exception {
    mvc.perform(get("/auctions/" + canon.getId()))
        .andExpect(jsonPath("$.isWatched").doesNotExist())
        .andExpect(jsonPath("$.viewerBidStatus").doesNotExist());

    mvc.perform(get("/auctions/" + canon.getId()).header(HttpHeaders.AUTHORIZATION, bearer(leader)))
        .andExpect(jsonPath("$.isWatched").value(false))
        .andExpect(jsonPath("$.viewerBidStatus").value("WINNING"));

    mvc.perform(get("/auctions/" + canon.getId()).header(HttpHeaders.AUTHORIZATION, bearer(rival)))
        .andExpect(jsonPath("$.viewerBidStatus").value("OUTBID"));

    mvc.perform(get("/auctions/" + canon.getId()).header(HttpHeaders.AUTHORIZATION, bearer(staff)))
        .andExpect(jsonPath("$.viewerBidStatus").value("NONE"));
  }

  @Test
  @DisplayName("Repeated status parameters bind as a list")
  void statusFilterBindsFromRepeatedQueryParameters() throws Exception {
    mvc.perform(
            get("/auctions")
                .param("status", "LIVE")
                .param("status", "SOLD")
                .param("sellerId", seller.getId().toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.total").value(3));
  }

  @Test
  @DisplayName("Search folds diacritics, because nobody types them into a search box")
  void searchFoldsDiacritics() throws Exception {
    mvc.perform(get("/auctions").param("q", "bicicleta pegas"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.total").value(1))
        .andExpect(jsonPath("$.items[0].id").value(bicycle.getId().toString()));

    mvc.perform(get("/auctions").param("q", "adapostul").param("status", "LIVE"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.total").value(1))
        .andExpect(jsonPath("$.items[0].id").value(paints.getId().toString()));

    mvc.perform(get("/auctions").param("q", "adapostul"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.total").value(2));
  }

  @Test
  @DisplayName("A wildcard typed into the search box is a character, not a wildcard")
  void searchWildcardsAreEscaped() throws Exception {
    mvc.perform(get("/auctions").param("q", "%"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.total").value(0));

    mvc.perform(get("/auctions").param("q", "_"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.total").value(0));

    mvc.perform(get("/auctions").param("q", "\\")).andExpect(status().isOk());
  }

  @Test
  @DisplayName("Sorting is an allow-list: an invented ordering is a bad request, not a 500")
  void sortingIsAnAllowList() throws Exception {
    mvc.perform(
            get("/auctions")
                .param("sort", "PRICE_DESC")
                .param("causeId", medical.getId().toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].id").value(bicycle.getId().toString()));

    mvc.perform(get("/auctions").param("sort", "DROP_TABLE")).andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("Page size is capped whatever the caller asks for")
  void pageSizeIsCapped() throws Exception {
    mvc.perform(get("/auctions").param("pageSize", "5000")).andExpect(status().isBadRequest());

    mvc.perform(get("/auctions").param("pageSize", "60"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.pageSize").value(60));
  }

  @Test
  @DisplayName("GET /auctions/featured answers both homepage rows")
  void featuredReturnsBothRows() throws Exception {
    String body =
        mvc.perform(get("/auctions/featured"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.mostWatched").isArray())
            .andExpect(jsonPath("$.latest").isArray())
            .andExpect(jsonPath("$.mostWatched[?(@.status != 'LIVE')]").isEmpty())
            .andExpect(jsonPath("$.latest[?(@.status != 'LIVE')]").isEmpty())
            .andReturn()
            .getResponse()
            .getContentAsString();

    List<Integer> followers = JsonPath.read(body, "$.mostWatched[*].watcherCount");
    assertThat(followers).isSortedAccordingTo(Comparator.reverseOrder());

    List<String> published = JsonPath.read(body, "$.latest[*].startTime");
    assertThat(published).isSortedAccordingTo(Comparator.reverseOrder());
  }

  @Test
  @DisplayName("Related prefers the shared cause over anything else")
  void relatedPrefersTheSameCause() throws Exception {
    mvc.perform(get("/auctions/" + canon.getId() + "/related"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(bicycle.getId().toString()))
        .andExpect(jsonPath("$[?(@.id == '" + canon.getId() + "')]").isEmpty());
  }

  @Test
  @DisplayName("The seller accepts an offer over HTTP, and the listing stays open until it is paid")
  void acceptRouteKeepsTheListingOpen() throws Exception {
    Auction listing = ownListing();
    Bid offer = bid(listing.getId(), rival.getId(), 100 * LEU, BidStatus.WINNING);

    mvc.perform(
            post("/auctions/" + listing.getId() + "/accept")
                .header(HttpHeaders.AUTHORIZATION, bearer(loner))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"bidId\":\"" + offer.getId() + "\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("LIVE"))
        .andExpect(jsonPath("$.winnerId").doesNotExist())
        .andExpect(jsonPath("$.dispatchDeadline").doesNotExist());

    mvc.perform(
            delete("/auctions/" + listing.getId() + "/accept")
                .header(HttpHeaders.AUTHORIZATION, bearer(loner)))
        .andExpect(status().is4xxClientError());
  }

  @Test
  @DisplayName("Accepting an offer on somebody else's listing is a 404, not a refusal")
  void acceptRouteIsSellerOnly() throws Exception {
    Auction listing = ownListing();
    Bid offer = bid(listing.getId(), rival.getId(), 100 * LEU, BidStatus.WINNING);

    mvc.perform(
            post("/auctions/" + listing.getId() + "/accept")
                .header(HttpHeaders.AUTHORIZATION, bearer(rival))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"bidId\":\"" + offer.getId() + "\"}"))
        .andExpect(status().isNotFound());

    mvc.perform(
            post("/auctions/" + listing.getId() + "/accept")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"bidId\":\"" + offer.getId() + "\"}"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("The seller's offer list carries every offer, and opens for nobody else")
  void sellerOffersRouteIsScopedToItsOwner() throws Exception {
    Auction listing = ownListing();
    bid(listing.getId(), rival.getId(), 100 * LEU, BidStatus.OUTBID);
    bid(listing.getId(), leader.getId(), 200 * LEU, BidStatus.WINNING);

    mvc.perform(
            get("/users/me/auctions/" + listing.getId() + "/offers")
                .header(HttpHeaders.AUTHORIZATION, bearer(loner)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(2))
        .andExpect(jsonPath("$[0].amount").value(200 * LEU))
        .andExpect(jsonPath("$[0].bidderUsername").value(leader.getUsername()));

    mvc.perform(
            get("/users/me/auctions/" + listing.getId() + "/offers")
                .header(HttpHeaders.AUTHORIZATION, bearer(rival)))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("The public bid history names nobody, and tells bidders apart only by alias")
  void bidHistoryIsAnonymous() throws Exception {
    mvc.perform(get("/auctions/" + canon.getId() + "/bids"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(2))
        .andExpect(jsonPath("$[0].amount").value(300 * LEU))
        .andExpect(jsonPath("$[0].status").value("WINNING"))
        .andExpect(jsonPath("$[*].bidderId").isEmpty())
        .andExpect(jsonPath("$[*].bidderDisplayName").isEmpty())
        .andExpect(jsonPath("$[*].bidderAvatarUrl").isEmpty())
        .andExpect(jsonPath("$[*].bidderUsername").isEmpty())
        .andExpect(
            result -> {
              String body = result.getResponse().getContentAsString();
              assertThat(body).doesNotContain("Andrei").doesNotContain("Vlad");
            });

    String first =
        mvc.perform(get("/auctions/" + canon.getId() + "/bids"))
            .andReturn()
            .getResponse()
            .getContentAsString();
    String second =
        mvc.perform(get("/auctions/" + canon.getId() + "/bids"))
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(first).isEqualTo(second);
  }

  @Test
  @DisplayName("An unpublished listing's history is as invisible as the listing")
  void bidHistoryFollowsTheListingsVisibility() throws Exception {
    mvc.perform(get("/auctions/" + unpublished.getId() + "/bids")).andExpect(status().isNotFound());
  }

  private UserAccount user(String displayName, UserRole role) {
    String suffix = UUID.randomUUID().toString().substring(0, 8);
    UserAccount account = new UserAccount();
    account.setEmail("catalog-" + suffix + "@bid4.ro");
    account.setDisplayName(displayName);
    account.setUsername("catalog-" + suffix);
    account.setRole(role);
    account.setAccountType(AccountType.INDIVIDUAL);
    account.setEmailVerifiedAt(Instant.now());
    account.setAvatarUrl("");
    return users.save(account);
  }

  private Cause cause(UUID organizerId, String name, String category, long goal, long raised) {
    Cause cause = new Cause();
    cause.setOrganizerId(organizerId);
    cause.setName(name);
    cause.setSlug("cauza-" + UUID.randomUUID().toString().substring(0, 8));
    cause.setShortDescription("Descriere scurtă pentru teste.");
    cause.setCategory(category);
    cause.setStatus(CauseStatus.ACTIVE);
    cause.setGoalAmount(goal);
    cause.setRaisedAmount(raised);
    return causes.save(cause);
  }

  private Auction auction(
      UUID sellerId,
      UUID causeId,
      String title,
      String description,
      String category,
      int donationPercent,
      long startingPrice,
      Long reservePrice,
      Instant startTime,
      AuctionStatus status) {
    Auction auction = new Auction();
    auction.setSellerId(sellerId);
    auction.setCauseId(causeId);
    auction.setTitle(title);
    auction.setDescription(description);
    auction.setImages(List.of("https://example.invalid/" + category + ".png"));
    auction.setCategory(category);
    auction.setCondition(ItemCondition.VERY_GOOD);
    auction.setWeightGrams(800);
    auction.setDonationPercent((short) donationPercent);
    auction.setStartingPrice(startingPrice);
    auction.setCurrentPrice(startingPrice);
    auction.setBidIncrement(10 * LEU);
    auction.setReservePrice(reservePrice);
    auction.setStartTime(startTime);
    auction.setCreatedAt(startTime);
    auction.setStatus(status);
    return auctions.save(auction);
  }

  private Auction ownListing() {
    return auction(
        loner.getId(),
        lonerCause.getId(),
        "Anunț pentru ofertă acceptată " + UUID.randomUUID(),
        "Descriere.",
        "jucarii",
        20,
        100 * LEU,
        null,
        Instant.now().minus(Duration.ofHours(3)),
        AuctionStatus.LIVE);
  }

  private Bid bid(UUID auctionId, UUID bidderId, long amount, BidStatus status) {
    Bid bid = new Bid();
    bid.setAuctionId(auctionId);
    bid.setBidderId(bidderId);
    bid.setAmount(amount);
    bid.setStatus(status);
    return bids.save(bid);
  }

  private String bearer(UserAccount account) {
    return "Bearer " + tokens.issueAccessToken(account).value();
  }
}
