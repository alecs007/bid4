package ro.bid4.backend.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import ro.bid4.backend.TestcontainersConfiguration;
import ro.bid4.backend.catalog.api.dto.PlaceBidResponse;
import ro.bid4.backend.catalog.domain.Auction;
import ro.bid4.backend.catalog.domain.AuctionStatus;
import ro.bid4.backend.catalog.domain.Bid;
import ro.bid4.backend.catalog.domain.BidStatus;
import ro.bid4.backend.catalog.domain.ItemCondition;
import ro.bid4.backend.catalog.repo.AuctionRepository;
import ro.bid4.backend.catalog.repo.BidRepository;
import ro.bid4.backend.catalog.service.BidService;
import ro.bid4.backend.cause.domain.Cause;
import ro.bid4.backend.cause.domain.CauseStatus;
import ro.bid4.backend.cause.repo.CauseRepository;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.common.web.Viewer;
import ro.bid4.backend.identity.domain.AccountType;
import ro.bid4.backend.identity.domain.DeliveryMethod;
import ro.bid4.backend.identity.domain.DeliveryMethodType;
import ro.bid4.backend.identity.domain.PaymentMethodCard;
import ro.bid4.backend.identity.domain.UserAccount;
import ro.bid4.backend.identity.domain.UserRole;
import ro.bid4.backend.identity.repo.DeliveryMethodRepository;
import ro.bid4.backend.identity.repo.PaymentMethodRepository;
import ro.bid4.backend.identity.repo.UserAccountRepository;

/**
 * The rules that decide who owns an item and for how much.
 *
 * <p>This is the part of the catalogue where money is at stake, so it is tested against the service
 * rather than through MockMvc: what matters here is the transaction, the row lock and the state
 * left behind, none of which a status code proves.
 */
@SpringBootTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@Import(TestcontainersConfiguration.class)
@TestPropertySource(properties = "bid4.rate-limit.enabled=false")
class CatalogWriteTest {

  private static final long LEU = 100;

  @Autowired private BidService bidding;
  @Autowired private AuctionRepository auctions;
  @Autowired private BidRepository bids;
  @Autowired private CauseRepository causes;
  @Autowired private UserAccountRepository users;
  @Autowired private DeliveryMethodRepository deliveryMethods;
  @Autowired private PaymentMethodRepository paymentMethods;

  /* --- buy now ------------------------------------------------------------ */

  @Test
  @DisplayName("An offer at or above the final price takes the item, and settles at that price")
  void buyNowSettlesAtTheAdvertisedPrice() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, 300 * LEU);

    // Offered well over the advertised price.
    PlaceBidResponse result = bidding.place(auction.getId(), 700 * LEU, viewer(buyer));

    assertThat(result.boughtNow()).isTrue();
    assertThat(result.auction().status()).isEqualTo(AuctionStatus.SOLD);
    assertThat(result.auction().winnerId()).isEqualTo(buyer.getId());
    // Nobody pays more than the number the page advertised.
    assertThat(result.auction().currentPrice()).isEqualTo(300 * LEU);
    assertThat(result.bid().amount()).isEqualTo(300 * LEU);
    assertThat(result.bid().status()).isEqualTo(BidStatus.WON);
  }

  @Test
  @DisplayName("The final price is reachable even when it sits below the next increment")
  void buyNowIsReachableBelowTheMinimumRaise() {
    UserAccount seller = seller();
    UserAccount first = bidder();
    UserAccount second = bidder();

    // Increment of 50 lei, final price only 20 lei above the standing offer:
    // the next valid raise (150) overshoots the price that ends it (120).
    Auction auction = auction(seller, 100 * LEU, 50 * LEU, 120 * LEU);
    bidding.place(auction.getId(), 100 * LEU, viewer(first));

    PlaceBidResponse result = bidding.place(auction.getId(), 120 * LEU, viewer(second));

    assertThat(result.boughtNow()).isTrue();
    assertThat(result.auction().currentPrice()).isEqualTo(120 * LEU);
  }

  @Test
  @DisplayName("Everyone else's offer is marked lost when the item is taken outright")
  void buyNowLosesTheStandingOffers() {
    UserAccount seller = seller();
    UserAccount loser = bidder();
    UserAccount winner = bidder();
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, 300 * LEU);

    bidding.place(auction.getId(), 110 * LEU, viewer(loser));
    bidding.place(auction.getId(), 300 * LEU, viewer(winner));

    List<Bid> history = bids.findByAuctionIdOrderByAmountDesc(auction.getId());
    assertThat(history).hasSize(2);
    assertThat(history.getFirst().getStatus()).isEqualTo(BidStatus.WON);
    assertThat(history.getLast().getStatus()).isEqualTo(BidStatus.LOST);
  }

  /* --- the ordinary rules -------------------------------------------------- */

  @Test
  @DisplayName("An offer below the minimum raise is refused")
  void tooLowIsRefused() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, null);
    bidding.place(auction.getId(), 100 * LEU, viewer(buyer));

    UserAccount other = bidder();
    assertThatThrownBy(() -> bidding.place(auction.getId(), 105 * LEU, viewer(other)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("110");
  }

  @Test
  @DisplayName("An absurd offer is refused rather than accepted and defaulted on")
  void absurdAmountsAreRefused() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, null);

    assertThatThrownBy(() -> bidding.place(auction.getId(), 900_000_000_000L, viewer(buyer)))
        .isInstanceOf(ApiException.class);
  }

  @Test
  @DisplayName("A seller cannot bid on their own listing")
  void sellersCannotBidOnThemselves() {
    UserAccount seller = seller();
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, null);

    assertThatThrownBy(() -> bidding.place(auction.getId(), 100 * LEU, viewer(seller)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("propriul");
  }

  @Test
  @DisplayName("Without a card and a delivery method there is no bidding")
  void theGateIsEnforcedOnTheServer() {
    UserAccount seller = seller();
    UserAccount unequipped = user("Fara Card", UserRole.USER);
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, null);

    assertThatThrownBy(() -> bidding.place(auction.getId(), 100 * LEU, viewer(unequipped)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("card");
  }

  @Test
  @DisplayName("A bid in the closing window pushes the close out")
  void antiSnipeExtendsTheClose() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, null);
    auction.setEndTime(Instant.now().plusSeconds(30));
    auctions.save(auction);

    PlaceBidResponse result = bidding.place(auction.getId(), 100 * LEU, viewer(buyer));

    assertThat(result.extendedBySeconds()).isEqualTo(auction.getAntiSnipeSeconds());
    assertThat(result.auction().extensionCount()).isEqualTo(1);
    assertThat(result.bid().triggeredExtension()).isTrue();
  }

  @Test
  @DisplayName("Raising replaces your own offer rather than stacking a second one")
  void raisingReplacesYourOwnOffer() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, null);

    bidding.place(auction.getId(), 100 * LEU, viewer(buyer));
    PlaceBidResponse second = bidding.place(auction.getId(), 200 * LEU, viewer(buyer));

    assertThat(bids.findByAuctionIdOrderByAmountDesc(auction.getId())).hasSize(1);
    assertThat(second.auction().bidCount()).isEqualTo(1);
  }

  /* --- retracting ---------------------------------------------------------- */

  @Test
  @DisplayName("The leader may pull back, and the price falls to the offer beneath")
  void retractingRestoresThePreviousPrice() {
    UserAccount seller = seller();
    UserAccount first = bidder();
    UserAccount second = bidder();
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, null);

    bidding.place(auction.getId(), 100 * LEU, viewer(first));
    bidding.place(auction.getId(), 150 * LEU, viewer(second));

    var after = bidding.retract(auction.getId(), viewer(second));

    assertThat(after.currentPrice()).isEqualTo(100 * LEU);
    assertThat(after.bidCount()).isEqualTo(1);
    assertThat(bids.findByAuctionIdOrderByAmountDesc(auction.getId()).getFirst().getStatus())
        .isEqualTo(BidStatus.WINNING);
  }

  @Test
  @DisplayName("Someone who is not leading cannot retract")
  void onlyTheLeaderMayRetract() {
    UserAccount seller = seller();
    UserAccount first = bidder();
    UserAccount second = bidder();
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, null);

    bidding.place(auction.getId(), 100 * LEU, viewer(first));
    bidding.place(auction.getId(), 150 * LEU, viewer(second));

    assertThatThrownBy(() -> bidding.retract(auction.getId(), viewer(first)))
        .isInstanceOf(ApiException.class);
  }

  @Test
  @DisplayName("Retracting locks in the closing minutes, because that is bid shielding")
  void retractingLocksNearTheClose() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, null);
    bidding.place(auction.getId(), 100 * LEU, viewer(buyer));

    Auction reloaded = auctions.findById(auction.getId()).orElseThrow();
    reloaded.setEndTime(Instant.now().plusSeconds(60));
    auctions.save(reloaded);

    assertThatThrownBy(() -> bidding.retract(auction.getId(), viewer(buyer)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("5 minute");
  }

  /* --- following ----------------------------------------------------------- */

  @Test
  @DisplayName("Watching toggles, and the counter follows it both ways")
  void watchingTogglesAndCounts() {
    UserAccount seller = seller();
    UserAccount follower = bidder();
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, null);

    assertThat(bidding.toggleWatch(auction.getId(), viewer(follower))).isTrue();
    assertThat(auctions.findById(auction.getId()).orElseThrow().getWatcherCount()).isEqualTo(1);

    assertThat(bidding.toggleWatch(auction.getId(), viewer(follower))).isFalse();
    assertThat(auctions.findById(auction.getId()).orElseThrow().getWatcherCount()).isZero();
  }

  /* --- two people at once --------------------------------------------------- */

  @Test
  @DisplayName("Two offers arriving together cannot both win")
  void concurrentBidsCannotBothWin() throws Exception {
    UserAccount seller = seller();
    UserAccount left = bidder();
    UserAccount right = bidder();
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, null);

    CountDownLatch go = new CountDownLatch(1);
    AtomicInteger accepted = new AtomicInteger();
    ExecutorService pool = Executors.newFixedThreadPool(2);

    for (UserAccount who : List.of(left, right)) {
      pool.submit(
          () -> {
            try {
              go.await();
              bidding.place(auction.getId(), 100 * LEU, viewer(who));
              accepted.incrementAndGet();
            } catch (Exception ignored) {
              // One of the two is expected to lose the race and be refused for
              // bidding under the minimum the winner just set.
            }
          });
    }

    go.countDown();
    pool.shutdown();
    assertThat(pool.awaitTermination(30, TimeUnit.SECONDS)).isTrue();

    // Whatever the interleaving, the invariant holds: one leader, and the
    // stored count matches the rows that actually exist.
    List<Bid> history = bids.findByAuctionIdOrderByAmountDesc(auction.getId());
    assertThat(history.stream().filter(b -> b.getStatus() == BidStatus.WINNING)).hasSize(1);
    assertThat(auctions.findById(auction.getId()).orElseThrow().getBidCount())
        .isEqualTo(history.size());
    assertThat(accepted.get()).isPositive();
  }

  /* --- fixtures ------------------------------------------------------------- */

  private UserAccount user(String displayName, UserRole role) {
    String suffix = UUID.randomUUID().toString().substring(0, 8);
    UserAccount account = new UserAccount();
    account.setEmail("write-" + suffix + "@bid4.ro");
    account.setDisplayName(displayName);
    account.setUsername("write-" + suffix);
    account.setRole(role);
    account.setAccountType(AccountType.INDIVIDUAL);
    account.setEmailVerifiedAt(Instant.now());
    return users.save(account);
  }

  private UserAccount seller() {
    return user("Vanzator Test", UserRole.USER);
  }

  /** A user who has cleared the card-and-delivery gate. */
  private UserAccount bidder() {
    UserAccount account = user("Ofertant Test", UserRole.USER);

    DeliveryMethod locker = new DeliveryMethod();
    locker.setUserId(account.getId());
    locker.setType(DeliveryMethodType.EASYBOX);
    locker.setLabel("Easybox test");
    locker.setEasyboxLockerId("TEST-1");
    locker.setLockerName("Easybox test");
    locker.setPhone("+40740123456");
    locker.setDefault(true);
    deliveryMethods.save(locker);

    PaymentMethodCard card = new PaymentMethodCard();
    card.setUserId(account.getId());
    card.setProviderMethodId("pm_test_" + UUID.randomUUID().toString().substring(0, 8));
    card.setBrand("VISA");
    card.setLast4("4242");
    card.setExpMonth((short) 11);
    card.setExpYear((short) 2030);
    card.setHolderName(account.getDisplayName());
    card.setDefault(true);
    paymentMethods.save(card);

    account.setDefaultDeliveryMethodId(locker.getId());
    return users.save(account);
  }

  private Cause cause(UUID organizerId) {
    Cause cause = new Cause();
    cause.setOrganizerId(organizerId);
    cause.setName("Cauza de test");
    cause.setSlug("cauza-" + UUID.randomUUID().toString().substring(0, 8));
    cause.setShortDescription("Pentru teste.");
    cause.setCategory("comunitate");
    cause.setStatus(CauseStatus.ACTIVE);
    cause.setGoalAmount(10_000 * LEU);
    return causes.save(cause);
  }

  private Auction auction(UserAccount seller, long startingPrice, long increment, Long buyNow) {
    Auction auction = new Auction();
    auction.setSellerId(seller.getId());
    auction.setCauseId(cause(seller.getId()).getId());
    auction.setTitle("Obiect de test");
    auction.setDescription("Descriere de test.");
    auction.setImages(List.of("https://example.invalid/test.png"));
    auction.setCategory("colectii");
    auction.setCondition(ItemCondition.GOOD);
    auction.setWeightGrams(500);
    auction.setDonationPercent((short) 50);
    auction.setStartingPrice(startingPrice);
    auction.setCurrentPrice(startingPrice);
    auction.setBidIncrement(increment);
    auction.setBuyNowPrice(buyNow);
    auction.setStartTime(Instant.now().minus(Duration.ofHours(1)));
    auction.setEndTime(Instant.now().plus(Duration.ofDays(2)));
    auction.setStatus(AuctionStatus.LIVE);
    return auctions.save(auction);
  }

  private static Viewer viewer(UserAccount account) {
    return Viewer.of(account.getId(), false);
  }
}
