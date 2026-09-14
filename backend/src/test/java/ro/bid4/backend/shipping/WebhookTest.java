package ro.bid4.backend.shipping;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
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
import ro.bid4.backend.common.web.Viewer;
import ro.bid4.backend.identity.domain.AccountType;
import ro.bid4.backend.identity.domain.DeliveryMethod;
import ro.bid4.backend.identity.domain.DeliveryMethodType;
import ro.bid4.backend.identity.domain.UserAccount;
import ro.bid4.backend.identity.domain.UserRole;
import ro.bid4.backend.identity.repo.DeliveryMethodRepository;
import ro.bid4.backend.identity.repo.UserAccountRepository;
import ro.bid4.backend.orders.domain.Order;
import ro.bid4.backend.orders.domain.OrderStatus;
import ro.bid4.backend.orders.repo.OrderRepository;
import ro.bid4.backend.orders.repo.OrderTrackingRepository;
import ro.bid4.backend.orders.service.OrderService;

@SpringBootTest
@AutoConfigureMockMvc
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@Import(TestcontainersConfiguration.class)
@TestPropertySource(
    properties = {
      "bid4.rate-limit.enabled=false",
      "bid4.shipping.webhook-secret=courier-test-secret",
      "bid4.payments.webhook-secret=payments-test-secret"
    })
class WebhookTest {
  private static final long LEU = 100;
  private static final String COURIER_SECRET = "courier-test-secret";
  private static final String PAYMENTS_SECRET = "payments-test-secret";

  @Autowired private MockMvc mvc;
  @Autowired private OfferService offers;
  @Autowired private OrderService orders;
  @Autowired private OrderRepository orderRows;
  @Autowired private OrderTrackingRepository tracking;
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
    seller = user("Vanzator Webhook");
    buyer = user("Cumparator Webhook");
    approved = cause(seller.getId());
    buyerLocker = locker(buyer.getId());
  }

  @Test
  @DisplayName("An unsigned courier callback is refused and moves nothing")
  void anUnsignedCourierCallbackIsRefused() throws Exception {
    Order order = shipped();
    String body = courierBody("evt-unsigned", order.getAwb(), "IN_TRANSIT");

    mvc.perform(post("/webhooks/courier").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isUnauthorized());

    assertThat(reload(order).getStatus()).isEqualTo(OrderStatus.LABEL_GENERATED);
  }

  @Test
  @DisplayName("A callback signed with the wrong secret is refused")
  void aWronglySignedCourierCallbackIsRefused() throws Exception {
    Order order = shipped();
    String body = courierBody("evt-wrong-key", order.getAwb(), "IN_TRANSIT");

    mvc.perform(
            post("/webhooks/courier")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-Bid4-Signature", sign(body, "not-the-secret"))
                .content(body))
        .andExpect(status().isUnauthorized());

    assertThat(reload(order).getStatus()).isEqualTo(OrderStatus.LABEL_GENERATED);
  }

  @Test
  @DisplayName("A signed scan moves the parcel, and the words the courier sent are kept")
  void aSignedScanMovesTheParcel() throws Exception {
    Order order = shipped();

    send("/webhooks/courier", courierBody("evt-move", order.getAwb(), "IN_TRANSIT"), COURIER_SECRET)
        .andExpect(status().isOk());

    assertThat(reload(order).getStatus()).isEqualTo(OrderStatus.IN_TRANSIT);
    assertThat(tracking.findByOrderIdOrderByAtDesc(order.getId()))
        .extracting(event -> event.getLabel())
        .contains("Colet plecat din depozit");
  }

  @Test
  @DisplayName("The same scan twice is recorded once")
  void theSameScanTwiceIsRecordedOnce() throws Exception {
    Order order = shipped();
    String body = courierBody("evt-repeat", order.getAwb(), "IN_TRANSIT");

    send("/webhooks/courier", body, COURIER_SECRET).andExpect(status().isOk());
    send("/webhooks/courier", body, COURIER_SECRET).andExpect(status().isOk());

    assertThat(tracking.findByOrderIdOrderByAtDesc(order.getId()))
        .filteredOn(event -> event.getStatus() == OrderStatus.IN_TRANSIT)
        .hasSize(1);
  }

  @Test
  @DisplayName("A scan for an AWB nobody knows is accepted and dropped")
  void anUnknownParcelIsAcceptedAndDropped() throws Exception {
    send(
            "/webhooks/courier",
            courierBody("evt-nobody", "SMD00000000000", "DELIVERED"),
            COURIER_SECRET)
        .andExpect(status().isOk());
  }

  @Test
  @DisplayName("A courier code that means nothing to a sale is accepted and ignored")
  void anUnmappedCodeIsIgnored() throws Exception {
    Order order = shipped();

    send(
            "/webhooks/courier",
            courierBody("evt-loaded", order.getAwb(), "VEHICLE_LOADED"),
            COURIER_SECRET)
        .andExpect(status().isOk());

    assertThat(reload(order).getStatus()).isEqualTo(OrderStatus.LABEL_GENERATED);
  }

  @Test
  @DisplayName("Delivery through the courier starts the clock that silence runs down")
  void deliveryStartsTheAutoReleaseClock() throws Exception {
    Order order = shipped();

    send("/webhooks/courier", courierBody("evt-t", order.getAwb(), "IN_TRANSIT"), COURIER_SECRET);
    send("/webhooks/courier", courierBody("evt-d", order.getAwb(), "DELIVERED"), COURIER_SECRET)
        .andExpect(status().isOk());

    Order delivered = reload(order);
    assertThat(delivered.getStatus()).isEqualTo(OrderStatus.DELIVERED);
    assertThat(delivered.getDeliveredAt()).isNotNull();
    assertThat(delivered.getAutoReleaseAt()).isNotNull();
  }

  @Test
  @DisplayName("An unsigned payment callback is refused and pays nothing")
  void anUnsignedPaymentCallbackIsRefused() throws Exception {
    Order order = awaitingPayment();
    String body = paymentBody(order.getPaymentReference(), "SUCCEEDED");

    mvc.perform(post("/webhooks/payments").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isUnauthorized());

    assertThat(reload(order).getStatus()).isEqualTo(OrderStatus.AWAITING_PAYMENT);
  }

  @Test
  @DisplayName("A signed success settles the sale into escrow")
  void aSignedSuccessSettlesTheSale() throws Exception {
    Order order = awaitingPayment();

    send(
            "/webhooks/payments",
            paymentBody(order.getPaymentReference(), "SUCCEEDED"),
            PAYMENTS_SECRET)
        .andExpect(status().isOk());

    Order paid = reload(order);
    assertThat(paid.getStatus()).isEqualTo(OrderStatus.PAID_HELD);
    assertThat(paid.getPaidAt()).isNotNull();
  }

  @Test
  @DisplayName("A failed payment leaves the sale where the buyer can retry it")
  void aFailedPaymentIsRetryable() throws Exception {
    Order order = awaitingPayment();

    send("/webhooks/payments", paymentBody(order.getPaymentReference(), "FAILED"), PAYMENTS_SECRET)
        .andExpect(status().isOk());

    Order failed = reload(order);
    assertThat(failed.getStatus()).isEqualTo(OrderStatus.PAYMENT_FAILED);
    assertThat(failed.getPaymentFailureReason()).isNotBlank();
  }

  private Order awaitingPayment() {
    Order order = accept(liveListing(), 200 * LEU);
    orders.chooseDelivery(order.getId(), buyerLocker, viewer(buyer));
    OrderService.Settlement paid = orders.markPaid(order.getId(), viewer(buyer));

    Order back = orderRows.findById(paid.order().getId()).orElseThrow();
    back.setStatus(OrderStatus.AWAITING_PAYMENT);
    back.setPaidAt(null);
    return orderRows.save(back);
  }

  private Order shipped() {
    Order order = accept(liveListing(), 200 * LEU);
    orders.chooseDelivery(order.getId(), buyerLocker, viewer(buyer));
    orders.markPaid(order.getId(), viewer(buyer));
    return orders.generateLabel(order.getId(), viewer(seller));
  }

  private ResultActions send(String path, String body, String secret) throws Exception {
    return mvc.perform(
        post(path)
            .contentType(MediaType.APPLICATION_JSON)
            .header("X-Bid4-Signature", sign(body, secret))
            .content(body));
  }

  private static String courierBody(String eventId, String awb, String status) {
    return "{\"eventId\":\"%s\",\"awb\":\"%s\",\"status\":\"%s\",".formatted(eventId, awb, status)
        + "\"location\":\"Bucuresti\",\"description\":\"Colet plecat din depozit\"}";
  }

  private static String paymentBody(String reference, String outcome) {
    return "{\"paymentReference\":\"%s\",\"outcome\":\"%s\",".formatted(reference, outcome)
        + "\"reason\":\"Card refuzat de banca emitenta.\"}";
  }

  private static String sign(String body, String secret) throws Exception {
    Mac mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
    byte[] digest = mac.doFinal(body.getBytes(StandardCharsets.UTF_8));
    StringBuilder hex = new StringBuilder(digest.length * 2);
    for (byte value : digest) {
      hex.append("%02x".formatted(value));
    }
    return hex.toString();
  }

  private Order accept(Auction listing, long price) {
    Bid offer = new Bid();
    offer.setAuctionId(listing.getId());
    offer.setBidderId(buyer.getId());
    offer.setAmount(price);
    offer.setStatus(BidStatus.WINNING);
    Bid saved = bids.save(offer);
    offers.accept(listing.getId(), saved.getId(), viewer(seller));
    return orderRows.findOpenForAuction(listing.getId()).orElseThrow();
  }

  private Order reload(Order order) {
    return orderRows.findById(order.getId()).orElseThrow();
  }

  private Auction liveListing() {
    Auction auction = new Auction();
    auction.setSellerId(seller.getId());
    auction.setCauseId(approved.getId());
    auction.setTitle("Obiect pentru webhook " + UUID.randomUUID());
    auction.setDescription("Descriere suficient de lunga pentru validare.");
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
    method.setLabel("Easybox de langa birou");
    method.setEasyboxLockerId("EB-001");
    method.setLockerName("Easybox Unirii");
    method.setLockerAddress("Piata Unirii 1");
    method.setPhone("0722333444");
    return deliveryMethods.save(method).getId();
  }

  private static Viewer viewer(UserAccount account) {
    return Viewer.of(account.getId(), false);
  }

  private UserAccount user(String displayName) {
    String suffix = UUID.randomUUID().toString().substring(0, 8);
    UserAccount account = new UserAccount();
    account.setEmail("hook-" + suffix + "@bid4.ro");
    account.setDisplayName(displayName);
    account.setUsername("hook-" + suffix);
    account.setRole(UserRole.USER);
    account.setAccountType(AccountType.INDIVIDUAL);
    account.setEmailVerifiedAt(Instant.now());
    account.setAvatarUrl("");
    return users.save(account);
  }

  private Cause cause(UUID organizerId) {
    Cause cause = new Cause();
    cause.setOrganizerId(organizerId);
    cause.setName("Cauza webhook");
    cause.setSlug("cauza-hook-" + UUID.randomUUID().toString().substring(0, 8));
    cause.setShortDescription("Pentru teste.");
    cause.setCategory("comunitate");
    cause.setStatus(CauseStatus.ACTIVE);
    cause.setGoalAmount(10_000 * LEU);
    return causes.save(cause);
  }
}
