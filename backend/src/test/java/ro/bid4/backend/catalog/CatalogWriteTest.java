package ro.bid4.backend.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import ro.bid4.backend.TestcontainersConfiguration;
import ro.bid4.backend.catalog.api.dto.AuctionResponse;
import ro.bid4.backend.catalog.api.dto.PlaceBidResponse;
import ro.bid4.backend.catalog.domain.Auction;
import ro.bid4.backend.catalog.domain.AuctionStatus;
import ro.bid4.backend.catalog.domain.Bid;
import ro.bid4.backend.catalog.domain.BidStatus;
import ro.bid4.backend.catalog.domain.ItemCondition;
import ro.bid4.backend.catalog.repo.AuctionRepository;
import ro.bid4.backend.catalog.repo.BidRepository;
import ro.bid4.backend.catalog.service.BidService;
import ro.bid4.backend.catalog.service.CatalogRules;
import ro.bid4.backend.catalog.service.OfferService;
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
import ro.bid4.backend.inbox.api.dto.ThreadItemResponse;
import ro.bid4.backend.inbox.domain.ThreadItemKind;
import ro.bid4.backend.inbox.service.InboxService;
import ro.bid4.backend.orders.domain.Order;
import ro.bid4.backend.orders.domain.OrderStatus;
import ro.bid4.backend.orders.repo.OrderRepository;
import ro.bid4.backend.orders.service.OrderService;
import ro.bid4.backend.orders.service.Terms;

@SpringBootTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@Import(TestcontainersConfiguration.class)
@TestPropertySource(properties = "bid4.rate-limit.enabled=false")
class CatalogWriteTest {
  private static final long LEU = 100;

  @Autowired private BidService bidding;
  @Autowired private OfferService offers;
  @Autowired private AuctionRepository auctions;
  @Autowired private BidRepository bids;
  @Autowired private CauseRepository causes;
  @Autowired private UserAccountRepository users;
  @Autowired private DeliveryMethodRepository deliveryMethods;
  @Autowired private PaymentMethodRepository paymentMethods;
  @Autowired private InboxService inbox;
  @Autowired private OrderService sales;
  @Autowired private OrderRepository orderRows;

  @Test
  @DisplayName("An offer at the buy-now price is accepted at once, and the listing stays open")
  void buyNowAcceptsTheOffer() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    Auction auction = auction(seller, 100 * LEU, 300 * LEU);

    PlaceBidResponse result =
        bidding.place(auction.getId(), 700 * LEU, Terms.CURRENT_VERSION, viewer(buyer));

    assertThat(result.boughtNow()).isTrue();
    assertThat(result.auction().status()).isEqualTo(AuctionStatus.LIVE);
    assertThat(result.bid().amount()).isEqualTo(300 * LEU);
    assertThat(result.bid().status()).isEqualTo(BidStatus.ACCEPTED);
    assertThat(orderFor(auction, buyer).getStatus()).isEqualTo(OrderStatus.AWAITING_CONFIRMATION);
  }

  @Test
  @DisplayName("The final price can still be taken after someone else has offered")
  void buyNowIsReachableAfterAnOffer() {
    UserAccount seller = seller();
    UserAccount first = bidder();
    UserAccount second = bidder();

    Auction auction = auction(seller, 100 * LEU, 120 * LEU);
    bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(first));

    PlaceBidResponse result =
        bidding.place(auction.getId(), 120 * LEU, Terms.CURRENT_VERSION, viewer(second));

    assertThat(result.boughtNow()).isTrue();
    assertThat(result.auction().currentPrice()).isEqualTo(120 * LEU);
  }

  @Test
  @DisplayName("Accepting leaves the other offers standing")
  void acceptingLeavesTheOthersStanding() {
    UserAccount seller = seller();
    UserAccount modest = bidder();
    UserAccount top = bidder();
    Auction auction = auction(seller, 100 * LEU, null);

    bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(modest));
    bidding.place(auction.getId(), 200 * LEU, Terms.CURRENT_VERSION, viewer(top));

    Bid lower = offerOf(auction, modest);
    var after = offers.accept(auction.getId(), lower.getId(), viewer(seller));

    assertThat(after.status()).isEqualTo(AuctionStatus.LIVE);
    assertThat(after.winnerId()).isNull();
    assertThat(reloadBid(lower).getStatus()).isEqualTo(BidStatus.ACCEPTED);
    assertThat(reloadBid(offerOf(auction, top)).getStatus()).isEqualTo(BidStatus.WINNING);
    assertThat(orderFor(auction, modest).getFinalPrice()).isEqualTo(100 * LEU);
  }

  @Test
  @DisplayName("Several offers can be accepted at once, each with its own order")
  void severalOffersCanBeAccepted() {
    UserAccount seller = seller();
    UserAccount first = bidder();
    UserAccount second = bidder();
    Auction auction = auction(seller, 100 * LEU, null);

    bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(first));
    bidding.place(auction.getId(), 150 * LEU, Terms.CURRENT_VERSION, viewer(second));
    offers.accept(auction.getId(), offerOf(auction, first).getId(), viewer(seller));
    offers.accept(auction.getId(), offerOf(auction, second).getId(), viewer(seller));
    offers.accept(auction.getId(), offerOf(auction, second).getId(), viewer(seller));

    assertThat(orderRows.findUnpaidForAuction(auction.getId())).hasSize(2);
    assertThat(reload(auction).getStatus()).isEqualTo(AuctionStatus.LIVE);
  }

  @Test
  @DisplayName("An accepted offer is not the bidder's to retract or to change")
  void acceptedOffersAreFixed() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    Auction auction = auction(seller, 100 * LEU, null);

    bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(buyer));
    offers.accept(auction.getId(), offerOf(auction, buyer).getId(), viewer(seller));

    assertThatThrownBy(() -> bidding.retract(auction.getId(), viewer(buyer)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("acceptată");
    assertThatThrownBy(
            () -> bidding.place(auction.getId(), 300 * LEU, Terms.CURRENT_VERSION, viewer(buyer)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("acceptată");
  }

  @Test
  @DisplayName("The first payment sells the item and closes every other accepted offer")
  void theFirstPaymentSells() {
    UserAccount seller = seller();
    UserAccount slow = bidder();
    UserAccount quick = bidder();
    Auction auction = auction(seller, 100 * LEU, null);

    bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(slow));
    bidding.place(auction.getId(), 150 * LEU, Terms.CURRENT_VERSION, viewer(quick));
    offers.accept(auction.getId(), offerOf(auction, slow).getId(), viewer(seller));
    offers.accept(auction.getId(), offerOf(auction, quick).getId(), viewer(seller));

    Order slowOrder = readyToPay(auction, slow);
    Order quickOrder = readyToPay(auction, quick);
    sales.markPaid(quickOrder.getId(), viewer(quick));

    Auction sold = reload(auction);
    assertThat(sold.getStatus()).isEqualTo(AuctionStatus.SOLD);
    assertThat(sold.getWinnerId()).isEqualTo(quick.getId());
    assertThat(sold.getDispatchDeadline())
        .isCloseTo(
            Instant.now().plus(Duration.ofDays(CatalogRules.DISPATCH_DAYS)),
            within(1, ChronoUnit.MINUTES));
    assertThat(reloadBid(offerOf(auction, quick)).getStatus()).isEqualTo(BidStatus.WON);
    assertThat(reloadBid(offerOf(auction, slow)).getStatus()).isEqualTo(BidStatus.LOST);
    assertThat(orderRows.findById(slowOrder.getId()).orElseThrow().getStatus())
        .isEqualTo(OrderStatus.CANCELLED);

    assertThatThrownBy(() -> sales.markPaid(slowOrder.getId(), viewer(slow)))
        .isInstanceOf(ApiException.class);
    assertThat(sales.settle(slowOrder).getStatus()).isEqualTo(OrderStatus.CANCELLED);
  }

  @Test
  @DisplayName("Two payments arriving together sell the item once")
  void concurrentPaymentsSellOnce() throws Exception {
    UserAccount seller = seller();
    UserAccount left = bidder();
    UserAccount right = bidder();
    Auction auction = auction(seller, 100 * LEU, null);

    bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(left));
    bidding.place(auction.getId(), 150 * LEU, Terms.CURRENT_VERSION, viewer(right));
    offers.accept(auction.getId(), offerOf(auction, left).getId(), viewer(seller));
    offers.accept(auction.getId(), offerOf(auction, right).getId(), viewer(seller));
    Map<UserAccount, Order> ready =
        Map.of(left, readyToPay(auction, left), right, readyToPay(auction, right));

    CountDownLatch go = new CountDownLatch(1);
    AtomicInteger paid = new AtomicInteger();
    ExecutorService pool = Executors.newFixedThreadPool(2);
    ready.forEach(
        (who, order) ->
            pool.submit(
                () -> {
                  try {
                    go.await();
                    sales.markPaid(order.getId(), viewer(who));
                    paid.incrementAndGet();
                  } catch (Exception ignored) {
                  }
                }));

    go.countDown();
    pool.shutdown();
    assertThat(pool.awaitTermination(30, TimeUnit.SECONDS)).isTrue();

    assertThat(paid.get()).isEqualTo(1);
    assertThat(
            ready.values().stream()
                .map(order -> orderRows.findById(order.getId()).orElseThrow().getStatus())
                .filter(status -> status == OrderStatus.PAID_HELD))
        .hasSize(1);
    assertThat(reload(auction).getStatus()).isEqualTo(AuctionStatus.SOLD);
  }

  @Test
  @DisplayName("A cancelled order puts the buyer's offer back among the others")
  void cancellingReopensTheOffer() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    Auction auction = auction(seller, 100 * LEU, null);

    bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(buyer));
    offers.accept(auction.getId(), offerOf(auction, buyer).getId(), viewer(seller));

    sales.cancel(orderFor(auction, buyer).getId(), null, viewer(buyer));

    assertThat(reloadBid(offerOf(auction, buyer)).getStatus()).isEqualTo(BidStatus.WINNING);
    assertThat(reload(auction).getStatus()).isEqualTo(AuctionStatus.LIVE);
  }

  @Test
  @DisplayName("Somebody else's listing is not theirs to accept an offer on")
  void onlyTheSellerMayAccept() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    UserAccount stranger = bidder();
    Auction auction = auction(seller, 100 * LEU, null);

    bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(buyer));
    Bid offer = offerOf(auction, buyer);

    assertThatThrownBy(() -> offers.accept(auction.getId(), offer.getId(), viewer(stranger)))
        .isInstanceOf(ApiException.class);
    assertThat(reload(auction).getStatus()).isEqualTo(AuctionStatus.LIVE);
  }

  @Test
  @DisplayName("An offer from another listing cannot be accepted onto this one")
  void offersBelongToTheirOwnListing() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    Auction mine = auction(seller, 100 * LEU, null);
    Auction other = auction(seller, 100 * LEU, null);

    bidding.place(other.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(buyer));
    Bid elsewhere = offerOf(other, buyer);

    assertThatThrownBy(() -> offers.accept(mine.getId(), elsewhere.getId(), viewer(seller)))
        .isInstanceOf(ApiException.class);
  }

  @Test
  @DisplayName("An offer below the starting price is refused")
  void tooLowIsRefused() {
    UserAccount seller = seller();
    Auction auction = auction(seller, 100 * LEU, null);

    UserAccount buyer = bidder();
    assertThatThrownBy(
            () -> bidding.place(auction.getId(), 95 * LEU, Terms.CURRENT_VERSION, viewer(buyer)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("100");
  }

  @Test
  @DisplayName("A later offer does not have to beat the ones before it")
  void offersDoNotHaveToRise() {
    UserAccount seller = seller();
    Auction auction = auction(seller, 100 * LEU, null);
    bidding.place(auction.getId(), 300 * LEU, Terms.CURRENT_VERSION, viewer(bidder()));

    PlaceBidResponse modest =
        bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(bidder()));

    assertThat(modest.bid().amount()).isEqualTo(100 * LEU);
    assertThat(modest.auction().currentPrice()).isEqualTo(300 * LEU);
  }

  @Test
  @DisplayName("An absurd offer is refused rather than accepted and defaulted on")
  void absurdAmountsAreRefused() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    Auction auction = auction(seller, 100 * LEU, null);

    assertThatThrownBy(
            () ->
                bidding.place(
                    auction.getId(), 900_000_000_000L, Terms.CURRENT_VERSION, viewer(buyer)))
        .isInstanceOf(ApiException.class);
  }

  @Test
  @DisplayName("A seller cannot bid on their own listing")
  void sellersCannotBidOnThemselves() {
    UserAccount seller = seller();
    Auction auction = auction(seller, 100 * LEU, null);

    assertThatThrownBy(
            () -> bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(seller)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("propriul");
  }

  @Test
  @DisplayName("An offer needs no saved card and no delivery method")
  void anOfferNeedsNothingSavedInAdvance() {
    UserAccount seller = seller();
    UserAccount unequipped = user("Fara Card", UserRole.USER);
    Auction auction = auction(seller, 100 * LEU, null);

    PlaceBidResponse placed =
        bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(unequipped));

    assertThat(placed.auction().bidCount()).isEqualTo(1);
    assertThat(placed.auction().viewerBidAmount()).isEqualTo(100 * LEU);
  }

  @Test
  @DisplayName("Raising replaces your own offer rather than stacking a second one")
  void raisingReplacesYourOwnOffer() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    Auction auction = auction(seller, 100 * LEU, null);

    bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(buyer));
    PlaceBidResponse second =
        bidding.place(auction.getId(), 200 * LEU, Terms.CURRENT_VERSION, viewer(buyer));

    assertThat(bids.findByAuctionIdOrderByAmountDesc(auction.getId())).hasSize(1);
    assertThat(second.auction().bidCount()).isEqualTo(1);
  }

  @Test
  @DisplayName("The leader may pull back, and the price falls to the offer beneath")
  void retractingRestoresThePreviousPrice() {
    UserAccount seller = seller();
    UserAccount first = bidder();
    UserAccount second = bidder();
    Auction auction = auction(seller, 100 * LEU, null);

    bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(first));
    bidding.place(auction.getId(), 150 * LEU, Terms.CURRENT_VERSION, viewer(second));

    var after = bidding.retract(auction.getId(), viewer(second));

    assertThat(after.currentPrice()).isEqualTo(100 * LEU);
    assertThat(after.bidCount()).isEqualTo(1);
    assertThat(bids.findByAuctionIdOrderByAmountDesc(auction.getId()).getFirst().getStatus())
        .isEqualTo(BidStatus.WINNING);
  }

  @Test
  @DisplayName("An offer beneath the lead can be withdrawn, and the price stays with the leader")
  void anOfferBeneathTheLeadCanBeWithdrawn() {
    UserAccount seller = seller();
    UserAccount first = bidder();
    UserAccount second = bidder();
    Auction auction = auction(seller, 100 * LEU, null);

    bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(first));
    bidding.place(auction.getId(), 150 * LEU, Terms.CURRENT_VERSION, viewer(second));

    AuctionResponse after = bidding.retract(auction.getId(), viewer(first));

    assertThat(after.currentPrice()).isEqualTo(150 * LEU);
    assertThat(after.bidCount()).isEqualTo(1);
    assertThat(bids.findByAuctionIdAndBidderId(auction.getId(), first.getId())).isEmpty();
    assertThat(bids.findByAuctionIdAndBidderId(auction.getId(), second.getId())).isPresent();
  }

  @Test
  @DisplayName("Someone with no offer has nothing to withdraw")
  void withdrawingNeedsAnOffer() {
    UserAccount seller = seller();
    UserAccount stranger = bidder();
    Auction auction = auction(seller, 100 * LEU, null);

    assertThatThrownBy(() -> bidding.retract(auction.getId(), viewer(stranger)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("Nu ai o ofertă activă");
  }

  @Test
  @DisplayName("Retracting is refused once the seller has accepted an offer")
  void retractingLocksAfterAnAcceptance() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    Auction auction = auction(seller, 100 * LEU, null);
    bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(buyer));

    Bid offer = bids.findByAuctionIdOrderByAmountDesc(auction.getId()).getFirst();
    offers.accept(auction.getId(), offer.getId(), viewer(seller));

    assertThatThrownBy(() -> bidding.retract(auction.getId(), viewer(buyer)))
        .isInstanceOf(ApiException.class);
  }

  @Test
  @DisplayName("Watching toggles, and the counter follows it both ways")
  void watchingTogglesAndCounts() {
    UserAccount seller = seller();
    UserAccount follower = bidder();
    Auction auction = auction(seller, 100 * LEU, null);

    assertThat(bidding.toggleWatch(auction.getId(), viewer(follower))).isTrue();
    assertThat(auctions.findById(auction.getId()).orElseThrow().getWatcherCount()).isEqualTo(1);

    assertThat(bidding.toggleWatch(auction.getId(), viewer(follower))).isFalse();
    assertThat(auctions.findById(auction.getId()).orElseThrow().getWatcherCount()).isZero();
  }

  @Test
  @DisplayName("Two offers arriving together cannot both win")
  void concurrentBidsCannotBothWin() throws Exception {
    UserAccount seller = seller();
    UserAccount left = bidder();
    UserAccount right = bidder();
    Auction auction = auction(seller, 100 * LEU, null);

    CountDownLatch go = new CountDownLatch(1);
    AtomicInteger accepted = new AtomicInteger();
    ExecutorService pool = Executors.newFixedThreadPool(2);

    for (UserAccount who : List.of(left, right)) {
      pool.submit(
          () -> {
            try {
              go.await();
              bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(who));
              accepted.incrementAndGet();
            } catch (Exception ignored) {
            }
          });
    }

    go.countDown();
    pool.shutdown();
    assertThat(pool.awaitTermination(30, TimeUnit.SECONDS)).isTrue();

    List<Bid> history = bids.findByAuctionIdOrderByAmountDesc(auction.getId());
    assertThat(history.stream().filter(b -> b.getStatus() == BidStatus.WINNING)).hasSize(1);
    assertThat(auctions.findById(auction.getId()).orElseThrow().getBidCount())
        .isEqualTo(history.size());
    assertThat(accepted.get()).isPositive();
  }

  @Test
  @DisplayName("An offer that names no accepted terms is refused")
  void anOfferWithoutAcceptedTermsIsRefused() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    Auction auction = auction(seller, 100 * LEU, null);

    assertThatThrownBy(() -> bidding.place(auction.getId(), 100 * LEU, null, viewer(buyer)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("accepți");

    assertThat(bids.countByAuctionId(auction.getId())).isZero();
  }

  @Test
  @DisplayName("An offer naming a version that is no longer published is refused")
  void anOfferNamingStaleTermsIsRefused() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    Auction auction = auction(seller, 100 * LEU, null);

    assertThatThrownBy(() -> bidding.place(auction.getId(), 100 * LEU, "1999-01-01", viewer(buyer)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("accepți");
  }

  @Test
  @DisplayName("A standing offer carries which terms were accepted, and when")
  void anOfferRecordsTheAcceptanceBesideIt() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    Auction auction = auction(seller, 100 * LEU, null);

    Instant before = Instant.now().minusSeconds(1);
    bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(buyer));

    Bid stored = bids.findByAuctionIdAndBidderId(auction.getId(), buyer.getId()).orElseThrow();
    assertThat(stored.getTermsVersion()).isEqualTo(Terms.CURRENT_VERSION);
    assertThat(stored.getTermsAcceptedAt()).isAfter(before);
  }

  @Test
  @DisplayName("A first offer writes OFFER_PLACED into the thread, with its amount")
  void aFirstOfferIsNarratedIntoTheThread() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    Auction auction = auction(seller, 100 * LEU, null);

    bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(buyer));

    ThreadItemResponse card = newestEvent(auction, buyer);
    assertThat(card.eventType()).isEqualTo("OFFER_PLACED");
    assertThat(card.payload()).containsEntry("amount", String.valueOf(100 * LEU));
  }

  @Test
  @DisplayName("Raising writes OFFER_RAISED carrying both the old amount and the new")
  void raisingIsNarratedWithWhatItWasBefore() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    Auction auction = auction(seller, 100 * LEU, null);

    bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(buyer));
    bidding.place(auction.getId(), 150 * LEU, Terms.CURRENT_VERSION, viewer(buyer));

    ThreadItemResponse card = newestEvent(auction, buyer);
    assertThat(card.eventType()).isEqualTo("OFFER_RAISED");
    assertThat(card.payload())
        .containsEntry("previous", String.valueOf(100 * LEU))
        .containsEntry("amount", String.valueOf(150 * LEU));

    assertThat(eventTypes(auction, buyer)).containsExactly("OFFER_RAISED", "OFFER_PLACED");
  }

  @Test
  @DisplayName("Withdrawing writes OFFER_WITHDRAWN, naming the amount that was pulled")
  void withdrawingIsNarratedIntoTheThread() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    Auction auction = auction(seller, 100 * LEU, null);

    bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(buyer));
    bidding.retract(auction.getId(), viewer(buyer));

    ThreadItemResponse card = newestEvent(auction, buyer);
    assertThat(card.eventType()).isEqualTo("OFFER_WITHDRAWN");
    assertThat(card.payload()).containsEntry("amount", String.valueOf(100 * LEU));
  }

  private Order orderFor(Auction auction, UserAccount buyer) {
    return orderRows.findOpenForAuctionAndBuyer(auction.getId(), buyer.getId()).orElseThrow();
  }

  private Order readyToPay(Auction auction, UserAccount buyer) {
    Order order = orderFor(auction, buyer);
    UUID locker = deliveryMethods.findByUserIdOrderByCreatedAtAsc(buyer.getId()).getFirst().getId();
    return sales.chooseDelivery(order.getId(), locker, viewer(buyer));
  }

  private Auction reload(Auction auction) {
    return auctions.findById(auction.getId()).orElseThrow();
  }

  private Bid reloadBid(Bid bid) {
    return bids.findById(bid.getId()).orElseThrow();
  }

  private Bid offerOf(Auction auction, UserAccount bidder) {
    return bids.findByAuctionIdAndBidderId(auction.getId(), bidder.getId()).orElseThrow();
  }

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

  private Auction auction(UserAccount seller, long startingPrice, Long buyNow) {
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
    auction.setBuyNowPrice(buyNow);
    auction.setStartTime(Instant.now().minus(Duration.ofHours(1)));
    auction.setStatus(AuctionStatus.LIVE);
    return auctions.save(auction);
  }

  private List<String> eventTypes(Auction listing, UserAccount bidder) {
    return events(listing, bidder).map(ThreadItemResponse::eventType).toList();
  }

  private ThreadItemResponse newestEvent(Auction listing, UserAccount bidder) {
    return events(listing, bidder).findFirst().orElseThrow();
  }

  private Stream<ThreadItemResponse> events(Auction listing, UserAccount bidder) {
    UUID conversationId =
        inbox.list(null, false, viewer(bidder)).items().stream()
            .filter(row -> listing.getId().equals(row.listingId()))
            .findFirst()
            .orElseThrow()
            .id();
    return inbox.thread(conversationId, viewer(bidder)).items().stream()
        .filter(item -> item.kind() == ThreadItemKind.EVENT);
  }

  private static Viewer viewer(UserAccount account) {
    return Viewer.of(account.getId(), false);
  }
}
