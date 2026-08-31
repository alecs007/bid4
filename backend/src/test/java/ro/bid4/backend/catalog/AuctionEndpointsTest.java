package ro.bid4.backend.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
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
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
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
import ro.bid4.backend.cause.domain.Cause;
import ro.bid4.backend.cause.domain.CauseStatus;
import ro.bid4.backend.cause.repo.CauseRepository;
import ro.bid4.backend.identity.domain.AccountType;
import ro.bid4.backend.identity.domain.UserAccount;
import ro.bid4.backend.identity.domain.UserRole;
import ro.bid4.backend.identity.repo.UserAccountRepository;
import ro.bid4.backend.security.jwt.JwtService;

/**
 * The catalogue as the frontend sees it.
 *
 * <p>Two things are being asserted throughout: that the body matches AuctionDetail in
 * frontend/src/lib/types/auction.ts field by field, and that what a caller may see depends on who
 * they are rather than on which route they used.
 */
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

  private Cause medical;
  private Cause shelter;

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

    medical = cause(seller.getId(), "Operația Anei", "medical", 45_000 * LEU, 12_400 * LEU);
    shelter = cause(rival.getId(), "Adăpostul de la marginea orașului", "animale", 30_000 * LEU, 0);

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
            now.plus(Duration.ofHours(6)),
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
            now.plus(Duration.ofDays(3)),
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
            now.plus(Duration.ofDays(5)),
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
            now.plus(Duration.ofDays(7)),
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
            now.minus(Duration.ofDays(3)),
            AuctionStatus.SOLD);
    sold.setWinnerId(leader.getId());
    auctions.save(sold);

    // Two offers on the Canon, so the leader and the outbid are both real.
    bid(canon.getId(), rival.getId(), 250 * LEU, BidStatus.OUTBID);
    bid(canon.getId(), leader.getId(), 300 * LEU, BidStatus.WINNING);
    canon.setCurrentPrice(300 * LEU);
    canon.setBidCount(2);
    auctions.save(canon);
  }

  /* --- the shape ---------------------------------------------------------- */

  @Test
  @DisplayName("GET /auctions answers the paged shape, with the seller and the cause joined in")
  void listReturnsThePagedShape() throws Exception {
    mvc.perform(get("/auctions").param("causeId", medical.getId().toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page").value(1))
        .andExpect(jsonPath("$.pageSize").value(12))
        .andExpect(jsonPath("$.total").value(2))
        .andExpect(jsonPath("$.totalPages").value(1))
        // Default sort is ENDING_SOON, so the Canon comes first.
        .andExpect(jsonPath("$.items[0].title").value("Aparat foto Canon AE-1 Program"))
        .andExpect(jsonPath("$.items[0].sellerId").value(seller.getId().toString()))
        .andExpect(jsonPath("$.items[0].causeId").value(medical.getId().toString()))
        .andExpect(jsonPath("$.items[0].category").value("electronice"))
        .andExpect(jsonPath("$.items[0].condition").value("VERY_GOOD"))
        .andExpect(jsonPath("$.items[0].status").value("LIVE"))
        .andExpect(jsonPath("$.items[0].donationPercent").value(40))
        .andExpect(jsonPath("$.items[0].currentPrice").value(300 * LEU))
        .andExpect(jsonPath("$.items[0].bidCount").value(2))
        .andExpect(jsonPath("$.items[0].images").isArray())
        .andExpect(jsonPath("$.items[0].seller.displayName").value("Maria Ionescu"))
        .andExpect(jsonPath("$.items[0].seller.username").value(seller.getUsername()))
        .andExpect(jsonPath("$.items[0].cause.name").value("Operația Anei"))
        .andExpect(jsonPath("$.items[0].cause.slug").value(medical.getSlug()))
        .andExpect(jsonPath("$.items[0].cause.goalAmount").value(45_000 * LEU))
        .andExpect(jsonPath("$.items[0].cause.status").value("ACTIVE"));
  }

  @Test
  @DisplayName("Fields the TypeScript types declare as required are never dropped as null")
  void requiredStringsAreAlwaysPresent() throws Exception {
    // avatarUrl is nullable in the column and required in the type. Left as
    // null, non_null inclusion drops it and the frontend holds a declared
    // string that is undefined at runtime.
    UserAccount faceless = user("Fara Poza", UserRole.USER);
    // Its own cause, so the counts the other tests assert stay put.
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
            Instant.now().plus(Duration.ofDays(4)),
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
        .andExpect(jsonPath("$[0].bidderAvatarUrl").exists())
        .andExpect(jsonPath("$[0].bidderUsername").exists());
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

  /* --- who may see what --------------------------------------------------- */

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
        // 300 lei bid against a 400 lei reserve.
        .andExpect(jsonPath("$.reserveMet").value(false));

    mvc.perform(get("/auctions/" + canon.getId()).header(HttpHeaders.AUTHORIZATION, bearer(rival)))
        .andExpect(jsonPath("$.reservePrice").doesNotExist());

    mvc.perform(get("/auctions/" + canon.getId()).header(HttpHeaders.AUTHORIZATION, bearer(seller)))
        .andExpect(jsonPath("$.reservePrice").value(400 * LEU));
  }

  /* --- the viewer's own state --------------------------------------------- */

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

  /* --- filtering and sorting ---------------------------------------------- */

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

    // The cause's name counts too: it is usually the reason someone is looking.
    // Both the shelter's listings match on it, so the status narrows to the one.
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
    // Left unescaped these are LIKE wildcards, and '%' alone would match every
    // row in the table — the cheapest way to turn a narrowing query into a full
    // scan of everything.
    mvc.perform(get("/auctions").param("q", "%"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.total").value(0));

    mvc.perform(get("/auctions").param("q", "_"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.total").value(0));

    // And an escape character is just a character too.
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

  /* --- the derived rows --------------------------------------------------- */

  @Test
  @DisplayName("GET /auctions/featured answers both homepage rows")
  void featuredReturnsBothRows() throws Exception {
    String body =
        mvc.perform(get("/auctions/featured"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.endingSoon").isArray())
            .andExpect(jsonPath("$.popular").isArray())
            // Only what is actually running.
            .andExpect(jsonPath("$.endingSoon[?(@.status != 'LIVE')]").isEmpty())
            .andReturn()
            .getResponse()
            .getContentAsString();

    // The sort is asserted as a property of the answer rather than by naming
    // which listing should be first. `featured` reads the whole catalogue and
    // returns only a handful of it, and every test class shares this database:
    // name a listing and the assertion breaks the moment another class seeds one
    // that closes sooner, which says nothing about whether the sort works.
    List<String> closing = JsonPath.read(body, "$.endingSoon[*].endTime");
    assertThat(closing).isSorted();
  }

  @Test
  @DisplayName("Related prefers the shared cause over anything else")
  void relatedPrefersTheSameCause() throws Exception {
    mvc.perform(get("/auctions/" + canon.getId() + "/related"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(bicycle.getId().toString()))
        .andExpect(jsonPath("$[?(@.id == '" + canon.getId() + "')]").isEmpty());
  }

  /* --- the bid history ----------------------------------------------------- */

  @Test
  @DisplayName("The public bid history is pseudonymised and carries no handle")
  void bidHistoryIsPseudonymised() throws Exception {
    mvc.perform(get("/auctions/" + canon.getId() + "/bids"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(2))
        // Highest first.
        .andExpect(jsonPath("$[0].amount").value(300 * LEU))
        .andExpect(jsonPath("$[0].status").value("WINNING"))
        .andExpect(jsonPath("$[0].bidderDisplayName").value("Andrei M."))
        .andExpect(jsonPath("$[0].bidderUsername").value(""))
        .andExpect(jsonPath("$[1].bidderDisplayName").value("Vlad P."));
  }

  @Test
  @DisplayName("An unpublished listing's history is as invisible as the listing")
  void bidHistoryFollowsTheListingsVisibility() throws Exception {
    mvc.perform(get("/auctions/" + unpublished.getId() + "/bids")).andExpect(status().isNotFound());
  }

  /* --- fixtures ------------------------------------------------------------ */

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
      Instant endTime,
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
    auction.setEndTime(endTime);
    auction.setStatus(status);
    return auctions.save(auction);
  }

  private void bid(UUID auctionId, UUID bidderId, long amount, BidStatus status) {
    Bid bid = new Bid();
    bid.setAuctionId(auctionId);
    bid.setBidderId(bidderId);
    bid.setAmount(amount);
    bid.setStatus(status);
    bids.save(bid);
  }

  /** A real signed token rather than a stubbed principal, so the decoder is exercised too. */
  private String bearer(UserAccount account) {
    return "Bearer " + tokens.issueAccessToken(account).value();
  }
}
