package ro.bid4.backend.orders;

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
import ro.bid4.backend.catalog.domain.Auction;
import ro.bid4.backend.catalog.domain.AuctionStatus;
import ro.bid4.backend.catalog.domain.Bid;
import ro.bid4.backend.catalog.domain.BidStatus;
import ro.bid4.backend.catalog.domain.ItemCondition;
import ro.bid4.backend.catalog.repo.AuctionRepository;
import ro.bid4.backend.catalog.repo.BidRepository;
import ro.bid4.backend.catalog.service.OfferService;
import ro.bid4.backend.cause.domain.Cause;
import ro.bid4.backend.cause.domain.CauseStatus;
import ro.bid4.backend.cause.repo.CauseRepository;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.common.web.Viewer;
import ro.bid4.backend.identity.domain.AccountType;
import ro.bid4.backend.identity.domain.DeliveryMethod;
import ro.bid4.backend.identity.domain.DeliveryMethodType;
import ro.bid4.backend.identity.domain.UserAccount;
import ro.bid4.backend.identity.domain.UserRole;
import ro.bid4.backend.identity.repo.DeliveryMethodRepository;
import ro.bid4.backend.identity.repo.UserAccountRepository;
import ro.bid4.backend.inbox.api.dto.ThreadItemResponse;
import ro.bid4.backend.inbox.domain.ThreadItemKind;
import ro.bid4.backend.inbox.service.InboxService;
import ro.bid4.backend.ledger.domain.AccountKind;
import ro.bid4.backend.ledger.service.LedgerService;
import ro.bid4.backend.orders.domain.Order;
import ro.bid4.backend.orders.domain.OrderStatus;
import ro.bid4.backend.orders.repo.OrderRepository;
import ro.bid4.backend.orders.service.Fees;
import ro.bid4.backend.orders.service.OrderService;
import ro.bid4.backend.orders.service.ShippingPrices;

/**
 * A sale, from the seller taking an offer to the money being released — and the thread it writes
 * itself into on the way.
 *
 * <p>The two halves are checked together on purpose. A step that moves the row without appearing in
 * the conversation is a step neither party can see happened, and a card that appears without the
 * row having moved is a button that does nothing.
 */
@SpringBootTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@Import(TestcontainersConfiguration.class)
@TestPropertySource(properties = "bid4.rate-limit.enabled=false")
class OrderFlowTest {

  private static final long LEU = 100;

  @Autowired private OfferService offers;
  @Autowired private OrderService orders;
  @Autowired private InboxService inbox;
  @Autowired private LedgerService ledger;
  @Autowired private OrderRepository orderRows;
  @Autowired private AuctionRepository auctions;
  @Autowired private BidRepository bids;
  @Autowired private CauseRepository causes;
  @Autowired private UserAccountRepository users;
  @Autowired private DeliveryMethodRepository deliveryMethods;

  private UserAccount seller;
  private UserAccount buyer;
  private Cause approved;
  private UUID buyerLocker;

  @BeforeAll
  void seedTheWorld() {
    seller = user("Vanzator Comanda");
    buyer = user("Cumparator Comanda");
    approved = cause(seller.getId());
    buyerLocker = locker(buyer.getId());
  }

  /* --- opening ------------------------------------------------------------ */

  @Test
  @DisplayName("accepting an offer opens the sale and says so in the thread")
  void acceptanceOpensTheOrder() {
    Auction listing = liveListing();
    Bid offer = bid(listing, 200 * LEU);

    offers.accept(listing.getId(), offer.getId(), viewer(seller));

    Order order = orderRows.findOpenForAuction(listing.getId()).orElseThrow();
    assertThat(order.getStatus()).isEqualTo(OrderStatus.AWAITING_CONFIRMATION);
    assertThat(order.getBuyerId()).isEqualTo(buyer.getId());

    ThreadItemResponse card = newestEvent(listing);
    assertThat(card.kind()).isEqualTo(ThreadItemKind.EVENT);
    assertThat(card.eventType()).isEqualTo("OFFER_ACCEPTED");
    // The status the order was in when the card was written, which is what makes
    // it the live one until the sale moves on.
    assertThat(card.orderStatus()).isEqualTo("AWAITING_CONFIRMATION");
    assertThat(card.payload()).containsEntry("price", String.valueOf(200 * LEU));
  }

  @Test
  @DisplayName("the money is frozen when the offer is taken, and divides in two")
  void moneyIsFrozenAtAcceptance() {
    Auction listing = liveListing();
    Order order = accept(listing, 200 * LEU);

    Fees.Breakdown expected = Fees.compute(200 * LEU, listing.getDonationPercent(), 0);
    assertThat(order.getFinalPrice()).isEqualTo(expected.finalPrice());
    assertThat(order.getPlatformTax()).isEqualTo(expected.buyerTax());
    // Nothing is taken out between the cause and the seller: bid4's cut rides
    // on the buyer's side, so the price divides in two rather than in three.
    assertThat(order.getDonationAmount() + order.getSellerShare()).isEqualTo(order.getFinalPrice());
  }

  @Test
  @DisplayName("a second acceptance of the same listing does not open a second sale")
  void openingIsIdempotent() {
    Auction listing = liveListing();
    Order first = accept(listing, 150 * LEU);
    Order again = orders.open(listing, buyer.getId(), 150 * LEU);

    assertThat(again.getId()).isEqualTo(first.getId());
  }

  /* --- whose turn it is --------------------------------------------------- */

  @Test
  @DisplayName("the seller cannot choose the buyer's delivery, and cannot pay for them")
  void stepsBelongToOneSideOnly() {
    Auction listing = liveListing();
    Order order = accept(listing, 100 * LEU);

    assertThatThrownBy(() -> orders.chooseDelivery(order.getId(), buyerLocker, viewer(seller)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("cumpărătorul");
  }

  @Test
  @DisplayName("the buyer cannot ship on the seller's behalf")
  void sellerStepsAreTheSellers() {
    Auction listing = liveListing();
    Order order = accept(listing, 100 * LEU);
    orders.chooseDelivery(order.getId(), buyerLocker, viewer(buyer));
    orders.markPaid(order.getId(), viewer(buyer));

    assertThatThrownBy(() -> orders.generateLabel(order.getId(), viewer(buyer)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("vânzătorul");
  }

  @Test
  @DisplayName("a step that has already been taken is refused rather than repeated")
  void stepsHappenOnce() {
    Auction listing = liveListing();
    Order order = accept(listing, 100 * LEU);
    orders.chooseDelivery(order.getId(), buyerLocker, viewer(buyer));

    assertThatThrownBy(() -> orders.chooseDelivery(order.getId(), buyerLocker, viewer(buyer)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("nu mai este în acest pas");
  }

  @Test
  @DisplayName("nobody can pay before saying where it goes")
  void stepsKeepTheirOrder() {
    Auction listing = liveListing();
    Order order = accept(listing, 100 * LEU);

    assertThatThrownBy(() -> orders.markPaid(order.getId(), viewer(buyer)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("nu mai este în acest pas");
  }

  @Test
  @DisplayName("a stranger cannot even see the sale, and it reads as missing")
  void strangersSeeNothing() {
    Auction listing = liveListing();
    Order order = accept(listing, 100 * LEU);
    UserAccount stranger = user("Curios Comanda");

    assertThatThrownBy(() -> orders.get(order.getId(), viewer(stranger)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("nu a fost găsită");
  }

  /* --- the whole way through ---------------------------------------------- */

  @Test
  @DisplayName("a sale walks from acceptance to release, one card per step, in order")
  void theWholeJourney() {
    Auction listing = liveListing();
    Order order = accept(listing, 300 * LEU);

    orders.chooseDelivery(order.getId(), buyerLocker, viewer(buyer));
    assertThat(reload(order).getShipping()).isEqualTo(ShippingPrices.EASYBOX);
    assertThat(reload(order).getTotalPaid())
        .isEqualTo(order.getFinalPrice() + order.getPlatformTax() + ShippingPrices.EASYBOX);

    orders.markPaid(order.getId(), viewer(buyer));
    assertThat(reload(order).getPaidAt()).isNotNull();

    orders.generateLabel(order.getId(), viewer(seller));
    assertThat(reload(order).getAwb()).isNotBlank();

    orders.markDroppedOff(order.getId(), viewer(seller));

    // The courier's, not a button: neither party may claim a parcel moved.
    orders.recordTracking(
        order.getId(), OrderStatus.DELIVERED, "Livrat în easybox", "București", "scan-1");
    assertThat(reload(order).getAutoReleaseAt()).isNotNull();

    orders.confirmReceipt(order.getId(), viewer(buyer));
    Order finished = reload(order);
    assertThat(finished.getStatus()).isEqualTo(OrderStatus.COMPLETED);
    assertThat(finished.getReleasedAt()).isNotNull();
    assertThat(finished.getAutoReleaseAt()).isNull();

    // Oldest first, which is how the thread is drawn.
    List<String> steps =
        inbox.thread(conversationId(listing), viewer(buyer)).items().stream()
            .filter(item -> item.kind() == ThreadItemKind.EVENT)
            .map(ThreadItemResponse::eventType)
            .toList()
            .reversed();

    assertThat(steps)
        .containsExactly(
            "OFFER_ACCEPTED",
            "DELIVERY_CHOSEN",
            "PAYMENT_HELD",
            "LABEL_READY",
            "SHIPPED",
            "DELIVERED",
            "RELEASED");
  }

  @Test
  @DisplayName("the same scan delivered twice moves the parcel once")
  void trackingIsIdempotent() {
    Auction listing = liveListing();
    Order order = accept(listing, 100 * LEU);
    orders.chooseDelivery(order.getId(), buyerLocker, viewer(buyer));
    orders.markPaid(order.getId(), viewer(buyer));

    orders.recordTracking(order.getId(), OrderStatus.IN_TRANSIT, "În tranzit", null, "scan-dup");
    orders.recordTracking(order.getId(), OrderStatus.IN_TRANSIT, "În tranzit", null, "scan-dup");

    assertThat(orders.trackingFor(order.getId(), viewer(buyer))).hasSize(1);
  }

  @Test
  @DisplayName("a scan that arrives late does not walk the parcel backwards")
  void theJourneyOnlyGoesForward() {
    Auction listing = liveListing();
    Order order = accept(listing, 100 * LEU);
    orders.chooseDelivery(order.getId(), buyerLocker, viewer(buyer));
    orders.markPaid(order.getId(), viewer(buyer));

    orders.recordTracking(order.getId(), OrderStatus.DELIVERED, "Livrat", null, "scan-late-2");
    orders.recordTracking(order.getId(), OrderStatus.IN_TRANSIT, "În tranzit", null, "scan-late-1");

    assertThat(reload(order).getStatus()).isEqualTo(OrderStatus.DELIVERED);
  }

  @Test
  @DisplayName("money left alone releases itself rather than stranding the seller")
  void silenceReleasesTheMoney() {
    Auction listing = liveListing();
    Order order = accept(listing, 100 * LEU);
    orders.chooseDelivery(order.getId(), buyerLocker, viewer(buyer));
    orders.markPaid(order.getId(), viewer(buyer));
    orders.recordTracking(order.getId(), OrderStatus.DELIVERED, "Livrat", null, "scan-quiet");

    Order delivered = reload(order);
    delivered.setAutoReleaseAt(Instant.now().minus(Duration.ofMinutes(1)));
    orderRows.save(delivered);

    assertThat(orders.releaseWhatIsDue()).isPositive();
    assertThat(reload(order).getStatus()).isEqualTo(OrderStatus.COMPLETED);
  }

  /* --- the money ---------------------------------------------------------- */

  @Test
  @DisplayName("paying puts the whole amount in escrow and nothing in anybody's balance")
  void payingHoldsTheMoney() {
    Auction listing = liveListing();
    Order order = accept(listing, 400 * LEU);
    orders.chooseDelivery(order.getId(), buyerLocker, viewer(buyer));

    long escrowBefore = ledger.platform(AccountKind.PLATFORM_ESCROW).getBalance();
    // Deltas, not absolutes: the seller and the cause are shared by every test
    // in this class, so what matters is that paying moved nothing into either.
    long sellerBefore = ledger.balanceOf(AccountKind.USER_AVAILABLE, seller.getId());
    long causeBefore = ledger.balanceOf(AccountKind.CAUSE_AVAILABLE, approved.getId());

    orders.markPaid(order.getId(), viewer(buyer));
    Order paid = reload(order);

    assertThat(ledger.platform(AccountKind.PLATFORM_ESCROW).getBalance())
        .isEqualTo(escrowBefore + paid.getTotalPaid());
    // Not a leu of it is the seller's yet. That is what escrow means, and it is
    // the promise the listing page makes.
    assertThat(ledger.balanceOf(AccountKind.USER_AVAILABLE, seller.getId()))
        .isEqualTo(sellerBefore);
    assertThat(ledger.balanceOf(AccountKind.CAUSE_AVAILABLE, approved.getId()))
        .isEqualTo(causeBefore);
  }

  @Test
  @DisplayName("releasing empties escrow into four places that add up to what was paid")
  void releasingDividesTheMoney() {
    Auction listing = liveListing();
    Order order = accept(listing, 400 * LEU);
    orders.chooseDelivery(order.getId(), buyerLocker, viewer(buyer));
    orders.markPaid(order.getId(), viewer(buyer));
    orders.recordTracking(order.getId(), OrderStatus.DELIVERED, "Livrat", null, "scan-money");

    Order paid = reload(order);
    long escrowBefore = ledger.platform(AccountKind.PLATFORM_ESCROW).getBalance();
    long sellerBefore = ledger.balanceOf(AccountKind.USER_AVAILABLE, seller.getId());
    long causeBefore = ledger.balanceOf(AccountKind.CAUSE_AVAILABLE, approved.getId());
    long revenueBefore = ledger.platform(AccountKind.PLATFORM_REVENUE).getBalance();
    long shippingBefore = ledger.platform(AccountKind.PLATFORM_SHIPPING).getBalance();

    orders.confirmReceipt(order.getId(), viewer(buyer));

    assertThat(ledger.platform(AccountKind.PLATFORM_ESCROW).getBalance())
        .isEqualTo(escrowBefore - paid.getTotalPaid());
    assertThat(ledger.balanceOf(AccountKind.USER_AVAILABLE, seller.getId()))
        .isEqualTo(sellerBefore + paid.getSellerShare());
    assertThat(ledger.balanceOf(AccountKind.CAUSE_AVAILABLE, approved.getId()))
        .isEqualTo(causeBefore + paid.getDonationAmount());
    assertThat(ledger.platform(AccountKind.PLATFORM_REVENUE).getBalance())
        .isEqualTo(revenueBefore + paid.getPlatformTax());
    assertThat(ledger.platform(AccountKind.PLATFORM_SHIPPING).getBalance())
        .isEqualTo(shippingBefore + paid.getShipping());

    assertThat(ledger.isConsistent(ledger.platform(AccountKind.PLATFORM_ESCROW).getId())).isTrue();
  }

  @Test
  @DisplayName("a release asked for twice divides the money once")
  void releasingIsIdempotent() {
    Auction listing = liveListing();
    Order order = accept(listing, 200 * LEU);
    orders.chooseDelivery(order.getId(), buyerLocker, viewer(buyer));
    orders.markPaid(order.getId(), viewer(buyer));
    orders.recordTracking(order.getId(), OrderStatus.DELIVERED, "Livrat", null, "scan-twice");
    orders.confirmReceipt(order.getId(), viewer(buyer));

    long sellerAfterFirst = ledger.balanceOf(AccountKind.USER_AVAILABLE, seller.getId());

    // The scheduled release runs over an order a buyer has already confirmed.
    Order done = reload(order);
    done.setStatus(OrderStatus.DELIVERED);
    done.setAutoReleaseAt(Instant.now().minus(Duration.ofMinutes(1)));
    orderRows.save(done);
    orders.releaseWhatIsDue();

    assertThat(ledger.balanceOf(AccountKind.USER_AVAILABLE, seller.getId()))
        .isEqualTo(sellerAfterFirst);
  }

  /* --- fixtures ----------------------------------------------------------- */

  private Order accept(Auction listing, long price) {
    Bid offer = bid(listing, price);
    offers.accept(listing.getId(), offer.getId(), viewer(seller));
    return orderRows.findOpenForAuction(listing.getId()).orElseThrow();
  }

  private Order reload(Order order) {
    return orderRows.findById(order.getId()).orElseThrow();
  }

  private UUID conversationId(Auction listing) {
    return inbox.list(null, false, viewer(buyer)).items().stream()
        .filter(row -> listing.getId().equals(row.listingId()))
        .findFirst()
        .orElseThrow()
        .id();
  }

  private ThreadItemResponse newestEvent(Auction listing) {
    return inbox.thread(conversationId(listing), viewer(buyer)).items().stream()
        .filter(item -> item.kind() == ThreadItemKind.EVENT)
        .findFirst()
        .orElseThrow();
  }

  private Bid bid(Auction listing, long amount) {
    Bid offer = new Bid();
    offer.setAuctionId(listing.getId());
    offer.setBidderId(buyer.getId());
    offer.setAmount(amount);
    offer.setStatus(BidStatus.WINNING);
    return bids.save(offer);
  }

  private Auction liveListing() {
    Auction auction = new Auction();
    auction.setSellerId(seller.getId());
    auction.setCauseId(approved.getId());
    auction.setTitle("Obiect de vânzare " + UUID.randomUUID());
    auction.setDescription("Descriere suficient de lungă pentru validare.");
    auction.setImages(List.of("https://example.invalid/live.png"));
    auction.setCategory("electronice");
    auction.setCondition(ItemCondition.VERY_GOOD);
    auction.setWeightGrams(500);
    auction.setDonationPercent((short) 30);
    auction.setStartingPrice(100 * LEU);
    auction.setCurrentPrice(100 * LEU);
    auction.setBidIncrement(10 * LEU);
    auction.setStartTime(Instant.now().minus(Duration.ofHours(1)));
    auction.setStatus(AuctionStatus.LIVE);
    return auctions.save(auction);
  }

  private UUID locker(UUID ownerId) {
    DeliveryMethod method = new DeliveryMethod();
    method.setUserId(ownerId);
    method.setType(DeliveryMethodType.EASYBOX);
    method.setLabel("Easybox de lângă birou");
    method.setEasyboxLockerId("EB-001");
    method.setLockerName("Easybox Unirii");
    method.setLockerAddress("Piața Unirii 1");
    method.setPhone("0722333444");
    return deliveryMethods.save(method).getId();
  }

  private static Viewer viewer(UserAccount account) {
    return Viewer.of(account.getId(), false);
  }

  private UserAccount user(String displayName) {
    String suffix = UUID.randomUUID().toString().substring(0, 8);
    UserAccount account = new UserAccount();
    account.setEmail("order-" + suffix + "@bid4.ro");
    account.setDisplayName(displayName);
    account.setUsername("order-" + suffix);
    account.setRole(UserRole.USER);
    account.setAccountType(AccountType.INDIVIDUAL);
    account.setEmailVerifiedAt(Instant.now());
    account.setAvatarUrl("");
    return users.save(account);
  }

  private Cause cause(UUID organizerId) {
    Cause cause = new Cause();
    cause.setOrganizerId(organizerId);
    cause.setName("Cauza pentru comenzi");
    cause.setSlug("cauza-comenzi-" + UUID.randomUUID().toString().substring(0, 8));
    cause.setShortDescription("Descriere scurtă pentru teste.");
    cause.setCategory("medical");
    cause.setStatus(CauseStatus.ACTIVE);
    cause.setGoalAmount(10_000 * LEU);
    cause.setRaisedAmount(0);
    return causes.save(cause);
  }
}
