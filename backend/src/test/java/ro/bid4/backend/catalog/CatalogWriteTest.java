package ro.bid4.backend.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
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
import ro.bid4.backend.orders.service.Terms;

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
  @Autowired private OfferService offers;
  @Autowired private AuctionRepository auctions;
  @Autowired private BidRepository bids;
  @Autowired private CauseRepository causes;
  @Autowired private UserAccountRepository users;
  @Autowired private DeliveryMethodRepository deliveryMethods;
  @Autowired private PaymentMethodRepository paymentMethods;
  @Autowired private InboxService inbox;

  /* --- buy now ------------------------------------------------------------ */

  @Test
  @DisplayName("An offer at or above the final price takes the item, and settles at that price")
  void buyNowSettlesAtTheAdvertisedPrice() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, 300 * LEU);

    // Offered well over the advertised price.
    PlaceBidResponse result =
        bidding.place(auction.getId(), 700 * LEU, Terms.CURRENT_VERSION, viewer(buyer));

    assertThat(result.boughtNow()).isTrue();
    // Reserved, not sold: the seller is bound by the price they published, but
    // nobody has paid yet, and SOLD is for money that has actually arrived.
    assertThat(result.auction().status()).isEqualTo(AuctionStatus.RESERVED);
    assertThat(result.auction().winnerId()).isEqualTo(buyer.getId());
    assertThat(result.auction().acceptedAt()).isNotNull();
    // Nobody pays more than the number the page advertised.
    assertThat(result.auction().currentPrice()).isEqualTo(300 * LEU);
    assertThat(result.bid().amount()).isEqualTo(300 * LEU);
    assertThat(result.bid().status()).isEqualTo(BidStatus.ACCEPTED);
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
    bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(first));

    PlaceBidResponse result =
        bidding.place(auction.getId(), 120 * LEU, Terms.CURRENT_VERSION, viewer(second));

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

    bidding.place(auction.getId(), 110 * LEU, Terms.CURRENT_VERSION, viewer(loser));
    bidding.place(auction.getId(), 300 * LEU, Terms.CURRENT_VERSION, viewer(winner));

    List<Bid> history = bids.findByAuctionIdOrderByAmountDesc(auction.getId());
    assertThat(history).hasSize(2);
    assertThat(history.getFirst().getStatus()).isEqualTo(BidStatus.ACCEPTED);
    assertThat(history.getLast().getStatus()).isEqualTo(BidStatus.LOST);
  }

  /* --- the acceptance ------------------------------------------------------ */

  @Test
  @DisplayName("The seller may take an offer that is not the highest one")
  void anyOfferMayBeAccepted() {
    UserAccount seller = seller();
    UserAccount modest = bidder();
    UserAccount top = bidder();
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, null);

    bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(modest));
    bidding.place(auction.getId(), 200 * LEU, Terms.CURRENT_VERSION, viewer(top));

    Bid lower = offerOf(auction, modest);
    var reserved = offers.accept(auction.getId(), lower.getId(), viewer(seller));

    assertThat(reserved.status()).isEqualTo(AuctionStatus.RESERVED);
    assertThat(reserved.winnerId()).isEqualTo(modest.getId());
    assertThat(reserved.acceptedAt()).isNotNull();
    assertThat(reload(auction).getAcceptedBidId()).isEqualTo(lower.getId());
    assertThat(reloadBid(lower).getStatus()).isEqualTo(BidStatus.ACCEPTED);
    // The rest are left standing, because this is still reversible.
    assertThat(reloadBid(offerOf(auction, top)).getStatus()).isEqualTo(BidStatus.WINNING);
  }

  @Test
  @DisplayName("A reserved listing goes on taking offers, and the acceptance survives them")
  void reservedKeepsTakingOffers() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    UserAccount latecomer = bidder();
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, null);

    bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(buyer));
    Bid taken = offerOf(auction, buyer);
    offers.accept(auction.getId(), taken.getId(), viewer(seller));

    // The whole reason the room stays open: the seller can still change their
    // mind, so a better offer is worth making and worth seeing.
    bidding.place(auction.getId(), 500 * LEU, Terms.CURRENT_VERSION, viewer(latecomer));

    assertThat(reload(auction).getStatus()).isEqualTo(AuctionStatus.RESERVED);
    assertThat(reload(auction).getCurrentPrice()).isEqualTo(500 * LEU);
    // The acceptance is untouched by the newcomer: still ACCEPTED, still the
    // bid the auction row points at, still naming the buyer.
    assertThat(reloadBid(taken).getStatus()).isEqualTo(BidStatus.ACCEPTED);
    assertThat(reload(auction).getAcceptedBidId()).isEqualTo(taken.getId());
    assertThat(reload(auction).getWinnerId()).isEqualTo(buyer.getId());
    assertThat(reloadBid(offerOf(auction, latecomer)).getStatus()).isEqualTo(BidStatus.WINNING);
  }

  @Test
  @DisplayName("Taking a second offer means releasing the first one first")
  void switchingBuyersGoesThroughRelease() {
    UserAccount seller = seller();
    UserAccount first = bidder();
    UserAccount better = bidder();
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, null);

    bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(first));
    offers.accept(auction.getId(), offerOf(auction, first).getId(), viewer(seller));
    bidding.place(auction.getId(), 500 * LEU, Terms.CURRENT_VERSION, viewer(better));

    Bid betterOffer = offerOf(auction, better);
    assertThatThrownBy(() -> offers.accept(auction.getId(), betterOffer.getId(), viewer(seller)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("Anuleaz-o");

    offers.release(auction.getId(), viewer(seller));
    var reserved = offers.accept(auction.getId(), betterOffer.getId(), viewer(seller));

    assertThat(reserved.status()).isEqualTo(AuctionStatus.RESERVED);
    assertThat(reserved.winnerId()).isEqualTo(better.getId());
    assertThat(reserved.acceptedAmount()).isEqualTo(500 * LEU);
  }

  @Test
  @DisplayName("An accepted offer is not the bidder's to retract")
  void acceptedOffersCannotBeRetracted() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, null);

    bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(buyer));
    offers.accept(auction.getId(), offerOf(auction, buyer).getId(), viewer(seller));

    assertThatThrownBy(() -> bidding.retract(auction.getId(), viewer(buyer)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("acceptată");
  }

  @Test
  @DisplayName("Buy-now is off the table once an offer has been accepted")
  void buyNowIsUnavailableWhileReserved() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    UserAccount latecomer = bidder();
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, 300 * LEU);

    bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(buyer));
    offers.accept(auction.getId(), offerOf(auction, buyer).getId(), viewer(seller));

    // The price is still published, but it cannot take the item over the top of
    // a buyer the seller has already chosen. It lands as an ordinary offer.
    var result =
        bidding.place(auction.getId(), 300 * LEU, Terms.CURRENT_VERSION, viewer(latecomer));

    assertThat(result.boughtNow()).isNull();
    assertThat(reload(auction).getStatus()).isEqualTo(AuctionStatus.RESERVED);
    assertThat(reload(auction).getWinnerId()).isEqualTo(buyer.getId());
  }

  @Test
  @DisplayName("Releasing hands the listing back and leaves a leader behind")
  void releaseRestoresTheLeader() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, null);

    bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(buyer));
    Bid only = offerOf(auction, buyer);
    offers.accept(auction.getId(), only.getId(), viewer(seller));

    var released = offers.release(auction.getId(), viewer(seller));

    assertThat(released.status()).isEqualTo(AuctionStatus.LIVE);
    assertThat(released.winnerId()).isNull();
    assertThat(released.acceptedAt()).isNull();
    assertThat(reload(auction).getAcceptedBidId()).isNull();
    // The accepted offer was also the top one, so releasing has to give the lead
    // back to somebody — otherwise the listing runs on with nobody winning it.
    assertThat(reloadBid(only).getStatus()).isEqualTo(BidStatus.WINNING);
  }

  @Test
  @DisplayName("Payment is what makes it a sale, and what starts the dispatch clock")
  void paymentSettlesTheListing() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    UserAccount loser = bidder();
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, null);

    bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(loser));
    bidding.place(auction.getId(), 200 * LEU, Terms.CURRENT_VERSION, viewer(buyer));
    Bid taken = offerOf(auction, buyer);
    offers.accept(auction.getId(), taken.getId(), viewer(seller));

    Auction paid = offers.markPaid(auction.getId());

    assertThat(paid.getStatus()).isEqualTo(AuctionStatus.SOLD);
    assertThat(reloadBid(taken).getStatus()).isEqualTo(BidStatus.WON);
    assertThat(reloadBid(offerOf(auction, loser)).getStatus()).isEqualTo(BidStatus.LOST);
    assertThat(paid.getDispatchDeadline())
        .isCloseTo(
            Instant.now().plus(Duration.ofDays(CatalogRules.DISPATCH_DAYS)),
            within(1, ChronoUnit.MINUTES));

    // A refund is a different conversation, and not this route's.
    assertThatThrownBy(() -> offers.release(auction.getId(), viewer(seller)))
        .isInstanceOf(ApiException.class);
  }

  @Test
  @DisplayName("Somebody else's listing is not theirs to accept an offer on")
  void onlyTheSellerMayAccept() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    UserAccount stranger = bidder();
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, null);

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
    Auction mine = auction(seller, 100 * LEU, 10 * LEU, null);
    Auction other = auction(seller, 100 * LEU, 10 * LEU, null);

    bidding.place(other.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(buyer));
    Bid elsewhere = offerOf(other, buyer);

    assertThatThrownBy(() -> offers.accept(mine.getId(), elsewhere.getId(), viewer(seller)))
        .isInstanceOf(ApiException.class);
  }

  /* --- the ordinary rules -------------------------------------------------- */

  @Test
  @DisplayName("An offer below the minimum raise is refused")
  void tooLowIsRefused() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, null);
    bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(buyer));

    UserAccount other = bidder();
    assertThatThrownBy(
            () -> bidding.place(auction.getId(), 105 * LEU, Terms.CURRENT_VERSION, viewer(other)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("110");
  }

  @Test
  @DisplayName("An absurd offer is refused rather than accepted and defaulted on")
  void absurdAmountsAreRefused() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, null);

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
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, null);

    assertThatThrownBy(
            () -> bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(seller)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("propriul");
  }

  @Test
  @DisplayName("Without a card and a delivery method there is no bidding")
  void theGateIsEnforcedOnTheServer() {
    UserAccount seller = seller();
    UserAccount unequipped = user("Fara Card", UserRole.USER);
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, null);

    assertThatThrownBy(
            () ->
                bidding.place(
                    auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(unequipped)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("card");
  }

  @Test
  @DisplayName("Raising replaces your own offer rather than stacking a second one")
  void raisingReplacesYourOwnOffer() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, null);

    bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(buyer));
    PlaceBidResponse second =
        bidding.place(auction.getId(), 200 * LEU, Terms.CURRENT_VERSION, viewer(buyer));

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

    bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(first));
    bidding.place(auction.getId(), 150 * LEU, Terms.CURRENT_VERSION, viewer(second));

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

    bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(first));
    bidding.place(auction.getId(), 150 * LEU, Terms.CURRENT_VERSION, viewer(second));

    assertThatThrownBy(() -> bidding.retract(auction.getId(), viewer(first)))
        .isInstanceOf(ApiException.class);
  }

  @Test
  @DisplayName("Retracting is refused once the seller has accepted an offer")
  void retractingLocksAfterAnAcceptance() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, null);
    bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(buyer));

    Bid offer = bids.findByAuctionIdOrderByAmountDesc(auction.getId()).getFirst();
    offers.accept(auction.getId(), offer.getId(), viewer(seller));

    // Pulling the offer out from under an acceptance is not a retraction, it is
    // a broken deal.
    assertThatThrownBy(() -> bidding.retract(auction.getId(), viewer(buyer)))
        .isInstanceOf(ApiException.class);
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
              bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(who));
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

  /* --- what the bidder accepted -------------------------------------------- */

  @Test
  @DisplayName("An offer that names no accepted terms is refused")
  void anOfferWithoutAcceptedTermsIsRefused() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, null);

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
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, null);

    // Consenting to a text nobody is being shown is not consent.
    assertThatThrownBy(() -> bidding.place(auction.getId(), 100 * LEU, "1999-01-01", viewer(buyer)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("accepți");
  }

  @Test
  @DisplayName("A standing offer carries which terms were accepted, and when")
  void anOfferRecordsTheAcceptanceBesideIt() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, null);

    Instant before = Instant.now().minusSeconds(1);
    bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(buyer));

    Bid stored = bids.findByAuctionIdAndBidderId(auction.getId(), buyer.getId()).orElseThrow();
    assertThat(stored.getTermsVersion()).isEqualTo(Terms.CURRENT_VERSION);
    assertThat(stored.getTermsAcceptedAt()).isAfter(before);
  }

  /* --- the offer events ----------------------------------------------------- */

  @Test
  @DisplayName("A first offer writes OFFER_PLACED into the thread, with its amount")
  void aFirstOfferIsNarratedIntoTheThread() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, null);

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
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, null);

    bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(buyer));
    bidding.place(auction.getId(), 150 * LEU, Terms.CURRENT_VERSION, viewer(buyer));

    ThreadItemResponse card = newestEvent(auction, buyer);
    assertThat(card.eventType()).isEqualTo("OFFER_RAISED");
    assertThat(card.payload())
        .containsEntry("previous", String.valueOf(100 * LEU))
        .containsEntry("amount", String.valueOf(150 * LEU));

    // Raising replaces the offer but not the record: both cards stay, so the
    // seller can see the offer move rather than only where it ended up.
    assertThat(eventTypes(auction, buyer)).containsExactly("OFFER_RAISED", "OFFER_PLACED");
  }

  @Test
  @DisplayName("Withdrawing writes OFFER_WITHDRAWN, naming the amount that was pulled")
  void withdrawingIsNarratedIntoTheThread() {
    UserAccount seller = seller();
    UserAccount buyer = bidder();
    Auction auction = auction(seller, 100 * LEU, 10 * LEU, null);

    bidding.place(auction.getId(), 100 * LEU, Terms.CURRENT_VERSION, viewer(buyer));
    bidding.retract(auction.getId(), viewer(buyer));

    ThreadItemResponse card = newestEvent(auction, buyer);
    assertThat(card.eventType()).isEqualTo("OFFER_WITHDRAWN");
    assertThat(card.payload()).containsEntry("amount", String.valueOf(100 * LEU));
  }

  /* --- fixtures ------------------------------------------------------------- */

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
    auction.setStatus(AuctionStatus.LIVE);
    return auctions.save(auction);
  }

  /** The cards an offer wrote, newest first, read as the bidder who wrote them. */
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
