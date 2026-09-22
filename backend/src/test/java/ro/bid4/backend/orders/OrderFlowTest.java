package ro.bid4.backend.orders;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
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
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
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
import ro.bid4.backend.orders.domain.AgreementKind;
import ro.bid4.backend.orders.domain.DisputeOutcome;
import ro.bid4.backend.orders.domain.Order;
import ro.bid4.backend.orders.domain.OrderAgreement;
import ro.bid4.backend.orders.domain.OrderStatus;
import ro.bid4.backend.orders.repo.OrderRepository;
import ro.bid4.backend.orders.service.Fees;
import ro.bid4.backend.orders.service.OrderMapper;
import ro.bid4.backend.orders.service.OrderService;
import ro.bid4.backend.orders.service.ShippingPrices;
import ro.bid4.backend.security.jwt.JwtService;

@SpringBootTest
@AutoConfigureMockMvc
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
  @Autowired private OrderMapper mapper;
  @Autowired private MockMvc mvc;
  @Autowired private JwtService tokens;
  @Autowired private AuctionRepository auctions;
  @Autowired private BidRepository bids;
  @Autowired private CauseRepository causes;
  @Autowired private UserAccountRepository users;
  @Autowired private DeliveryMethodRepository deliveryMethods;
  @Autowired private JdbcTemplate jdbc;

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

  @Test
  @DisplayName("accepting an offer opens the sale and says so in the thread")
  void acceptanceOpensTheOrder() {
    Auction listing = liveListing();
    Bid offer = bid(listing, 200 * LEU);

    offers.accept(listing.getId(), offer.getId(), viewer(seller));

    Order order =
        orderRows.findOpenForAuctionAndBuyer(listing.getId(), buyer.getId()).orElseThrow();
    assertThat(order.getStatus()).isEqualTo(OrderStatus.AWAITING_CONFIRMATION);
    assertThat(order.getBuyerId()).isEqualTo(buyer.getId());

    ThreadItemResponse card = newestEvent(listing);
    assertThat(card.kind()).isEqualTo(ThreadItemKind.EVENT);
    assertThat(card.eventType()).isEqualTo("OFFER_ACCEPTED");
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

    orders.recordTracking(
        order.getId(), OrderStatus.DELIVERED, "Livrat în easybox", "București", "scan-1");
    assertThat(reload(order).getAutoReleaseAt()).isNotNull();

    orders.confirmReceipt(order.getId(), viewer(buyer));
    Order finished = reload(order);
    assertThat(finished.getStatus()).isEqualTo(OrderStatus.COMPLETED);
    assertThat(finished.getReleasedAt()).isNotNull();
    assertThat(finished.getAutoReleaseAt()).isNull();

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

  @Test
  @DisplayName("a buyer who reports a problem stops the money where it is")
  void disputeHoldsTheMoney() {
    Auction listing = liveListing();
    Order order = accept(listing, 100 * LEU);
    orders.chooseDelivery(order.getId(), buyerLocker, viewer(buyer));
    orders.markPaid(order.getId(), viewer(buyer));
    orders.recordTracking(order.getId(), OrderStatus.DELIVERED, "Livrat", null, "scan-dispute");

    orders.openDispute(order.getId(), "Produsul a ajuns deteriorat.", viewer(buyer));

    Order disputed = reload(order);
    assertThat(disputed.getStatus()).isEqualTo(OrderStatus.DISPUTE_OPEN);
    assertThat(disputed.getConfirmationDeadline()).isNull();

    disputed.setAutoReleaseAt(Instant.now().minus(Duration.ofMinutes(1)));
    orderRows.save(disputed);
    orders.releaseWhatIsDue();
    assertThat(reload(order).getStatus()).isEqualTo(OrderStatus.DISPUTE_OPEN);
  }

  @Test
  @DisplayName("only the buyer may hold their own money back")
  void onlyTheBuyerDisputes() {
    Auction listing = liveListing();
    Order order = accept(listing, 100 * LEU);
    orders.chooseDelivery(order.getId(), buyerLocker, viewer(buyer));
    orders.markPaid(order.getId(), viewer(buyer));

    assertThatThrownBy(() -> orders.openDispute(order.getId(), null, viewer(seller)))
        .isInstanceOf(ApiException.class);
  }

  @Test
  @DisplayName("an operator refunding a dispute empties escrow back the way it came")
  void disputeRefundReturnsTheMoney() {
    Auction listing = liveListing();
    Order order = accept(listing, 100 * LEU);
    orders.chooseDelivery(order.getId(), buyerLocker, viewer(buyer));
    orders.markPaid(order.getId(), viewer(buyer));
    orders.recordTracking(order.getId(), OrderStatus.DELIVERED, "Livrat", null, "scan-refund");
    orders.openDispute(order.getId(), "Deteriorat", viewer(buyer));

    long escrowBefore = balanceOf(AccountKind.PLATFORM_ESCROW);
    long sellerBefore = balanceOfUser(seller.getId());

    orders.resolveDispute(order.getId(), DisputeOutcome.REFUND, "Returnare integrală", staff());

    Order refunded = reload(order);
    assertThat(refunded.getStatus()).isEqualTo(OrderStatus.REFUNDED);
    assertThat(escrowBefore - balanceOf(AccountKind.PLATFORM_ESCROW))
        .isEqualTo(refunded.getTotalPaid());
    assertThat(balanceOfUser(seller.getId())).isEqualTo(sellerBefore);
  }

  @Test
  @DisplayName("an operator releasing a dispute divides it exactly as a confirmation would")
  void disputeReleasePaysOut() {
    Auction listing = liveListing();
    Order order = accept(listing, 100 * LEU);
    orders.chooseDelivery(order.getId(), buyerLocker, viewer(buyer));
    orders.markPaid(order.getId(), viewer(buyer));
    orders.recordTracking(order.getId(), OrderStatus.DELIVERED, "Livrat", null, "scan-release");
    orders.openDispute(order.getId(), "Întârziere", viewer(buyer));

    long escrowBefore = balanceOf(AccountKind.PLATFORM_ESCROW);
    long sellerBefore = balanceOfUser(seller.getId());

    orders.resolveDispute(
        order.getId(), DisputeOutcome.RELEASE, "Livrarea stă în picioare", staff());

    Order settled = reload(order);
    assertThat(settled.getStatus()).isEqualTo(OrderStatus.COMPLETED);
    assertThat(escrowBefore - balanceOf(AccountKind.PLATFORM_ESCROW))
        .isEqualTo(settled.getTotalPaid());
    assertThat(balanceOfUser(seller.getId()) - sellerBefore).isEqualTo(settled.getSellerShare());
  }

  @Test
  @DisplayName("neither party may settle their own dispute")
  void onlyStaffResolve() {
    Auction listing = liveListing();
    Order order = accept(listing, 100 * LEU);
    orders.chooseDelivery(order.getId(), buyerLocker, viewer(buyer));
    orders.markPaid(order.getId(), viewer(buyer));
    orders.openDispute(order.getId(), null, viewer(buyer));

    assertThatThrownBy(
            () ->
                orders.resolveDispute(order.getId(), DisputeOutcome.RELEASE, null, viewer(seller)))
        .isInstanceOf(ApiException.class);
    assertThatThrownBy(
            () -> orders.resolveDispute(order.getId(), DisputeOutcome.REFUND, null, viewer(buyer)))
        .isInstanceOf(ApiException.class);
  }

  @Test
  @DisplayName("a sale can be called off while the escrow is empty, and not after")
  void cancellingOnlyBeforeTheMoney() {
    Auction listing = liveListing();
    Order order = accept(listing, 100 * LEU);

    orders.cancel(order.getId(), "M-am răzgândit", viewer(buyer));
    assertThat(reload(order).getStatus()).isEqualTo(OrderStatus.CANCELLED);

    Auction second = liveListing();
    Order paid = accept(second, 100 * LEU);
    orders.chooseDelivery(paid.getId(), buyerLocker, viewer(buyer));
    orders.markPaid(paid.getId(), viewer(buyer));

    assertThatThrownBy(() -> orders.cancel(paid.getId(), null, viewer(seller)))
        .isInstanceOf(ApiException.class);
  }

  @Test
  @DisplayName("a buyer who never chooses delivery has the sale closed for them")
  void lapsedOrdersAreCancelled() {
    Auction listing = liveListing();
    Order order = accept(listing, 100 * LEU);

    Order waiting = reload(order);
    waiting.setConfirmationDeadline(Instant.now().minus(Duration.ofMinutes(1)));
    orderRows.save(waiting);

    assertThat(orders.cancelWhatHasLapsed()).isPositive();
    assertThat(reload(order).getStatus()).isEqualTo(OrderStatus.CANCELLED);
  }

  @Test
  @DisplayName("each party's agreement is recorded at the step it governs, and only once")
  void agreementsAreRecordedWhereTheyAreMade() {
    Auction listing = liveListing();
    Order order = accept(listing, 100 * LEU);

    assertThat(orders.agreementsFor(order.getId(), viewer(buyer))).isEmpty();

    orders.chooseDelivery(order.getId(), buyerLocker, viewer(buyer));
    orders.markPaid(order.getId(), viewer(buyer));
    orders.generateLabel(order.getId(), viewer(seller));

    var agreed = orders.agreementsFor(order.getId(), viewer(buyer));
    assertThat(agreed).hasSize(3);
    assertThat(agreed)
        .extracting(OrderAgreement::getKind)
        .containsExactlyInAnyOrder(
            AgreementKind.SALE, AgreementKind.PAYMENT, AgreementKind.SHIPPING);
    assertThat(agreed).filteredOn(row -> row.getUserId().equals(buyer.getId())).hasSize(2);
    assertThat(agreed).allSatisfy(row -> assertThat(row.getTermsVersion()).isNotBlank());
  }

  @Test
  @DisplayName("paying puts the whole amount in escrow and nothing in anybody's balance")
  void payingHoldsTheMoney() {
    Auction listing = liveListing();
    Order order = accept(listing, 400 * LEU);
    orders.chooseDelivery(order.getId(), buyerLocker, viewer(buyer));

    long escrowBefore = ledger.platform(AccountKind.PLATFORM_ESCROW).getBalance();
    long sellerBefore = ledger.balanceOf(AccountKind.USER_AVAILABLE, seller.getId());
    long causeBefore = ledger.balanceOf(AccountKind.CAUSE_AVAILABLE, approved.getId());

    orders.markPaid(order.getId(), viewer(buyer));
    Order paid = reload(order);

    assertThat(ledger.platform(AccountKind.PLATFORM_ESCROW).getBalance())
        .isEqualTo(escrowBefore + paid.getTotalPaid());
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

    Order done = reload(order);
    done.setStatus(OrderStatus.DELIVERED);
    done.setAutoReleaseAt(Instant.now().minus(Duration.ofMinutes(1)));
    orderRows.save(done);
    orders.releaseWhatIsDue();

    assertThat(ledger.balanceOf(AccountKind.USER_AVAILABLE, seller.getId()))
        .isEqualTo(sellerAfterFirst);
  }

  @Test
  @DisplayName("A party can list their own sales, narrowed to the side they asked for")
  void bothSidesCanListTheirOwnSales() {
    Auction listing = liveListing();
    accept(listing, 200 * LEU);

    assertThat(orders.forParty("BUYER", viewer(buyer)))
        .extracting(Order::getAuctionId)
        .contains(listing.getId());
    assertThat(orders.forParty("SELLER", viewer(seller)))
        .extracting(Order::getAuctionId)
        .contains(listing.getId());

    assertThat(orders.forParty("SELLER", viewer(buyer))).isEmpty();
    assertThat(orders.forParty("BUYER", viewer(seller))).isEmpty();

    assertThat(orders.forParty(null, viewer(buyer))).isNotEmpty();
  }

  @Test
  @DisplayName("An order carries the summaries the screens name things with")
  void anOrderCarriesItsSummaries() {
    Auction listing = liveListing();
    Order order = accept(listing, 200 * LEU);

    var response = mapper.toResponse(reload(order));
    assertThat(response.auction()).isNotNull();
    assertThat(response.auction().title()).isEqualTo(listing.getTitle());
    assertThat(response.buyer()).isNotNull();
    assertThat(response.buyer().displayName()).isEqualTo(buyer.getDisplayName());
    assertThat(response.seller()).isNotNull();
    assertThat(response.seller().displayName()).isEqualTo(seller.getDisplayName());
    assertThat(response.cause()).isNotNull();
    assertThat(response.cause().name()).isEqualTo(approved.getName());
  }

  @Test
  @DisplayName("Both order routes serialise, summaries and all")
  void theOrderRoutesSerialise() throws Exception {
    Auction listing = liveListing();
    Order order = accept(listing, 200 * LEU);

    mvc.perform(get("/orders").header(HttpHeaders.AUTHORIZATION, bearer(buyer)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].auction.title").value(listing.getTitle()))
        .andExpect(jsonPath("$[0].buyer.displayName").value(buyer.getDisplayName()))
        .andExpect(jsonPath("$[0].seller.displayName").value(seller.getDisplayName()))
        .andExpect(jsonPath("$[0].cause.name").value(approved.getName()));

    mvc.perform(get("/orders/" + order.getId()).header(HttpHeaders.AUTHORIZATION, bearer(buyer)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.auction.images").isArray())
        .andExpect(jsonPath("$.reference").value(order.getReference()));

    mvc.perform(get("/orders").header(HttpHeaders.AUTHORIZATION, bearer(seller)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].reference").value(order.getReference()));
  }

  @Test
  @DisplayName("once an offer is taken, only the two parties learn who took it")
  void theBuyerStaysPrivate() throws Exception {
    Auction listing = liveListing();
    Order order = accept(listing, 200 * LEU);
    orders.chooseDelivery(order.getId(), buyerLocker, viewer(buyer));
    orders.markPaid(order.getId(), viewer(buyer));
    UserAccount stranger = user("Privitor Comanda");
    String auction = "/auctions/" + listing.getId();

    mvc.perform(get(auction).header(HttpHeaders.AUTHORIZATION, bearer(stranger)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.winnerId").doesNotExist());
    mvc.perform(get(auction))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.winnerId").doesNotExist());
    mvc.perform(get(auction).header(HttpHeaders.AUTHORIZATION, bearer(buyer)))
        .andExpect(jsonPath("$.winnerId").value(buyer.getId().toString()));
    mvc.perform(get(auction).header(HttpHeaders.AUTHORIZATION, bearer(seller)))
        .andExpect(jsonPath("$.winnerId").value(buyer.getId().toString()));

    mvc.perform(get(auction + "/bids").header(HttpHeaders.AUTHORIZATION, bearer(stranger)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].amount").value(200 * LEU))
        .andExpect(jsonPath("$[0].bidderId").doesNotExist())
        .andExpect(jsonPath("$[0].bidderDisplayName").doesNotExist())
        .andExpect(jsonPath("$[0].bidderAvatarUrl").doesNotExist())
        .andExpect(jsonPath("$[0].status").value("OUTBID"))
        .andExpect(jsonPath("$[0].alias").isNotEmpty());
    mvc.perform(get(auction + "/bids"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].bidderId").doesNotExist());
    mvc.perform(get(auction + "/bids").header(HttpHeaders.AUTHORIZATION, bearer(buyer)))
        .andExpect(jsonPath("$[0].mine").value(true))
        .andExpect(jsonPath("$[0].bidderId").value(buyer.getId().toString()));
    mvc.perform(get(auction + "/bids").header(HttpHeaders.AUTHORIZATION, bearer(seller)))
        .andExpect(jsonPath("$[0].bidderId").value(buyer.getId().toString()))
        .andExpect(jsonPath("$[0].bidderDisplayName").isNotEmpty());
  }

  @Test
  @DisplayName("on a live listing, bidders are anonymous to everyone but the seller and themselves")
  void biddersAreAnonymous() throws Exception {
    Auction listing = liveListing();
    bid(listing, 150 * LEU);
    UserAccount rival = user("Rival Anonim");
    Bid theirs = new Bid();
    theirs.setAuctionId(listing.getId());
    theirs.setBidderId(rival.getId());
    theirs.setAmount(120 * LEU);
    theirs.setStatus(BidStatus.OUTBID);
    bids.save(theirs);
    UserAccount stranger = user("Privitor Licitatie");
    String route = "/auctions/" + listing.getId() + "/bids";

    mvc.perform(get(route).header(HttpHeaders.AUTHORIZATION, bearer(stranger)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(2))
        .andExpect(jsonPath("$[*].bidderId").isEmpty())
        .andExpect(jsonPath("$[*].bidderDisplayName").isEmpty())
        .andExpect(jsonPath("$[*].bidderAvatarUrl").isEmpty())
        .andExpect(jsonPath("$[0].alias").isNotEmpty())
        .andExpect(jsonPath("$[1].alias").isNotEmpty());

    mvc.perform(get(route).header(HttpHeaders.AUTHORIZATION, bearer(rival)))
        .andExpect(jsonPath("$[0].bidderId").doesNotExist())
        .andExpect(jsonPath("$[0].mine").value(false))
        .andExpect(jsonPath("$[1].mine").value(true))
        .andExpect(jsonPath("$[1].bidderId").value(rival.getId().toString()));
  }

  @Test
  @DisplayName("V16 repairs listings left behind by the single-acceptance model")
  void legacyListingsAreRepaired() throws Exception {
    Auction unpaid = liveListing();
    Order waiting = orders.open(unpaid, buyer.getId(), 100 * LEU);

    Auction paid = liveListing();
    Order settled = orders.open(paid, buyer.getId(), 200 * LEU);
    settled.setStatus(OrderStatus.PAID_HELD);
    settled.setPaidAt(Instant.now());
    orderRows.save(settled);

    Auction reserved = liveListing();
    Bid taken = bid(reserved, 150 * LEU);
    taken.setStatus(BidStatus.ACCEPTED);
    bids.save(taken);
    jdbc.update(
        "update auctions set status = 'RESERVED', winner_id = ?, accepted_bid_id = ?,"
            + " accepted_at = now() where id = ?",
        buyer.getId(),
        taken.getId(),
        reserved.getId());

    String script =
        new String(
            new ClassPathResource("db/migration/V16__no_reserved_listings.sql")
                .getInputStream()
                .readAllBytes(),
            StandardCharsets.UTF_8);
    for (String statement : script.split(";")) {
      if (!statement.isBlank()) {
        jdbc.update(statement);
      }
    }

    assertThat(auctions.findById(unpaid.getId()).orElseThrow().getStatus())
        .isEqualTo(AuctionStatus.LIVE);
    assertThat(
            bids.findByAuctionIdAndBidderId(unpaid.getId(), buyer.getId())
                .orElseThrow()
                .getStatus())
        .isEqualTo(BidStatus.ACCEPTED);
    assertThat(orderRows.findById(waiting.getId()).orElseThrow().getStatus())
        .isEqualTo(OrderStatus.AWAITING_CONFIRMATION);

    Auction sold = auctions.findById(paid.getId()).orElseThrow();
    assertThat(sold.getStatus()).isEqualTo(AuctionStatus.SOLD);
    assertThat(sold.getWinnerId()).isEqualTo(buyer.getId());
    assertThat(
            bids.findByAuctionIdAndBidderId(paid.getId(), buyer.getId()).orElseThrow().getStatus())
        .isEqualTo(BidStatus.WON);

    Auction live = auctions.findById(reserved.getId()).orElseThrow();
    assertThat(live.getStatus()).isEqualTo(AuctionStatus.LIVE);
    assertThat(live.getWinnerId()).isNull();
    assertThat(bids.findById(taken.getId()).orElseThrow().getStatus())
        .isEqualTo(BidStatus.ACCEPTED);
  }

  private Order accept(Auction listing, long price) {
    Bid offer = bid(listing, price);
    offers.accept(listing.getId(), offer.getId(), viewer(seller));
    return orderRows.findOpenForAuctionAndBuyer(listing.getId(), buyer.getId()).orElseThrow();
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

  private String bearer(UserAccount account) {
    return "Bearer " + tokens.issueAccessToken(account).value();
  }

  private static Viewer viewer(UserAccount account) {
    return Viewer.of(account.getId(), false);
  }

  private static Viewer staff() {
    return Viewer.of(UUID.randomUUID(), true);
  }

  private long balanceOf(AccountKind kind) {
    return ledger.platform(kind).getBalance();
  }

  private long balanceOfUser(UUID userId) {
    return ledger.balanceOf(AccountKind.USER_AVAILABLE, userId);
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
