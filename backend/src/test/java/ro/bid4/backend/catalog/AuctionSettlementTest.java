package ro.bid4.backend.catalog;

import static org.assertj.core.api.Assertions.assertThat;

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
import ro.bid4.backend.catalog.service.AuctionClock;
import ro.bid4.backend.catalog.service.AuctionSettlementService;
import ro.bid4.backend.cause.domain.Cause;
import ro.bid4.backend.cause.domain.CauseStatus;
import ro.bid4.backend.cause.repo.CauseRepository;
import ro.bid4.backend.identity.domain.AccountType;
import ro.bid4.backend.identity.domain.UserAccount;
import ro.bid4.backend.identity.domain.UserRole;
import ro.bid4.backend.identity.repo.UserAccountRepository;

/**
 * Closing an auction when its clock runs out.
 *
 * <p>Nothing did this before: the page said "Încheiată" because it compares the end time against
 * now, while the row stayed LIVE with no winner and no losing bids. Everything downstream — the
 * order, the escrow, the donation — is built from the transition these tests pin.
 *
 * <p>This is the one class that turns the scheduler back on, because the loop that picks work up is
 * part of what is being tested. It still drives the tick by hand rather than waiting for one.
 */
@SpringBootTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@Import(TestcontainersConfiguration.class)
@TestPropertySource(properties = "bid4.auctions.clock-enabled=true")
class AuctionSettlementTest {

  private static final long LEU = 100;

  @Autowired private UserAccountRepository users;
  @Autowired private CauseRepository causes;
  @Autowired private AuctionRepository auctions;
  @Autowired private BidRepository bids;
  @Autowired private AuctionSettlementService settlement;
  @Autowired private AuctionClock clock;

  private UserAccount seller;
  private Cause cause;

  @BeforeAll
  void seedTheWorld() {
    seller = user("Vanzator Inchidere");
    cause = cause(seller.getId());
  }

  @Test
  @DisplayName("an auction over its reserve sells to the highest bidder")
  void soldToHighestBidder() {
    Auction auction = endedAuction(400 * LEU, 250 * LEU);
    UUID loser = user("Licitator Pierdut").getId();
    UUID winner = user("Licitator Castigator").getId();
    bid(auction, loser, 420 * LEU, BidStatus.OUTBID);
    Bid top = bid(auction, winner, 500 * LEU, BidStatus.WINNING);
    priceAt(auction, 500 * LEU);

    assertThat(settlement.settle(auction.getId())).isTrue();

    Auction closed = auctions.findById(auction.getId()).orElseThrow();
    assertThat(closed.getStatus()).isEqualTo(AuctionStatus.SOLD);
    assertThat(closed.getWinnerId()).isEqualTo(winner);
    assertThat(statusOf(top)).isEqualTo(BidStatus.WON);
    assertThat(bids.findByAuctionIdOrderByAmountDesc(auction.getId()))
        .filteredOn(b -> b.getBidderId().equals(loser))
        .allMatch(b -> b.getStatus() == BidStatus.LOST);
  }

  @Test
  @DisplayName("bidding that never reaches the reserve sells to nobody")
  void reserveNotMetGoesUnsold() {
    Auction auction = endedAuction(900 * LEU, 250 * LEU);
    Bid only = bid(auction, user("Licitator Sub Rezerva").getId(), 300 * LEU, BidStatus.WINNING);
    priceAt(auction, 300 * LEU);

    assertThat(settlement.settle(auction.getId())).isTrue();

    Auction closed = auctions.findById(auction.getId()).orElseThrow();
    assertThat(closed.getStatus()).isEqualTo(AuctionStatus.UNSOLD);
    assertThat(closed.getWinnerId()).isNull();
    assertThat(statusOf(only)).isEqualTo(BidStatus.LOST);
  }

  @Test
  @DisplayName("an auction nobody bid on goes unsold, reserve or not")
  void noBidsGoesUnsold() {
    // No reserve at all, so the only thing that can keep this from "sold" is
    // noticing that the starting price is not an offer.
    Auction auction = endedAuction(null, 250 * LEU);

    assertThat(settlement.settle(auction.getId())).isTrue();

    Auction closed = auctions.findById(auction.getId()).orElseThrow();
    assertThat(closed.getStatus()).isEqualTo(AuctionStatus.UNSOLD);
    assertThat(closed.getWinnerId()).isNull();
  }

  @Test
  @DisplayName("a last-second bid that pushed the clock out is not settled anyway")
  void antiSnipeExtensionIsRespected() {
    // Chosen for closing, then extended before the lock was taken — the race the
    // re-read under the lock exists for.
    Auction auction = endedAuction(null, 250 * LEU);
    auction.setEndTime(Instant.now().plus(Duration.ofMinutes(2)));
    auctions.save(auction);

    assertThat(settlement.settle(auction.getId())).isFalse();
    assertThat(auctions.findById(auction.getId()).orElseThrow().getStatus())
        .isEqualTo(AuctionStatus.LIVE);
  }

  @Test
  @DisplayName("settling twice closes it once")
  void settlementIsIdempotent() {
    Auction auction = endedAuction(null, 250 * LEU);
    UUID winner = user("Licitator Idempotent").getId();
    bid(auction, winner, 300 * LEU, BidStatus.WINNING);
    priceAt(auction, 300 * LEU);

    assertThat(settlement.settle(auction.getId())).isTrue();
    assertThat(settlement.settle(auction.getId())).isFalse();

    assertThat(auctions.findById(auction.getId()).orElseThrow().getWinnerId()).isEqualTo(winner);
  }

  @Test
  @DisplayName("a scheduled auction opens once its start time arrives")
  void scheduledOpens() {
    Auction auction = auction(AuctionStatus.SCHEDULED, null, 250 * LEU);
    auction.setStartTime(Instant.now().minus(Duration.ofMinutes(1)));
    auction.setEndTime(Instant.now().plus(Duration.ofDays(1)));
    auctions.save(auction);

    assertThat(settlement.open(auction.getId())).isTrue();
    assertThat(auctions.findById(auction.getId()).orElseThrow().getStatus())
        .isEqualTo(AuctionStatus.LIVE);
  }

  @Test
  @DisplayName("a scheduled auction whose whole window elapsed closes instead of opening")
  void scheduledThatAlreadyExpiredNeverGoesLive() {
    // The state after downtime. Opening it would put a listing nobody can win
    // back on the shelf for a tick.
    Auction auction = auction(AuctionStatus.SCHEDULED, null, 250 * LEU);
    auction.setStartTime(Instant.now().minus(Duration.ofDays(3)));
    auction.setEndTime(Instant.now().minus(Duration.ofDays(1)));
    auctions.save(auction);

    assertThat(settlement.open(auction.getId())).isTrue();
    assertThat(auctions.findById(auction.getId()).orElseThrow().getStatus())
        .isEqualTo(AuctionStatus.UNSOLD);
  }

  @Test
  @DisplayName("one tick opens what is due and closes what is over")
  void tickMovesBothTransitions() {
    Auction closing = endedAuction(null, 250 * LEU);
    bid(closing, user("Licitator Tick").getId(), 300 * LEU, BidStatus.WINNING);
    priceAt(closing, 300 * LEU);

    Auction opening = auction(AuctionStatus.SCHEDULED, null, 250 * LEU);
    opening.setStartTime(Instant.now().minus(Duration.ofMinutes(1)));
    opening.setEndTime(Instant.now().plus(Duration.ofDays(1)));
    auctions.save(opening);

    clock.tick();

    assertThat(auctions.findById(closing.getId()).orElseThrow().getStatus())
        .isEqualTo(AuctionStatus.SOLD);
    assertThat(auctions.findById(opening.getId()).orElseThrow().getStatus())
        .isEqualTo(AuctionStatus.LIVE);
  }

  private Auction endedAuction(Long reservePrice, long startingPrice) {
    Auction auction = auction(AuctionStatus.LIVE, reservePrice, startingPrice);
    auction.setStartTime(Instant.now().minus(Duration.ofDays(2)));
    auction.setEndTime(Instant.now().minus(Duration.ofSeconds(5)));
    return auctions.save(auction);
  }

  private Auction auction(AuctionStatus status, Long reservePrice, long startingPrice) {
    Auction auction = new Auction();
    auction.setSellerId(seller.getId());
    auction.setCauseId(cause.getId());
    auction.setTitle("Obiect de test " + UUID.randomUUID());
    auction.setDescription("Descriere pentru testul de închidere.");
    auction.setImages(List.of("https://example.invalid/test.png"));
    auction.setCategory("electronice");
    auction.setCondition(ItemCondition.VERY_GOOD);
    auction.setWeightGrams(500);
    auction.setDonationPercent((short) 30);
    auction.setStartingPrice(startingPrice);
    auction.setCurrentPrice(startingPrice);
    auction.setBidIncrement(10 * LEU);
    auction.setReservePrice(reservePrice);
    auction.setStartTime(Instant.now().minus(Duration.ofDays(1)));
    auction.setEndTime(Instant.now().plus(Duration.ofDays(1)));
    auction.setStatus(status);
    return auctions.save(auction);
  }

  private Bid bid(Auction auction, UUID bidderId, long amount, BidStatus status) {
    Bid bid = new Bid();
    bid.setAuctionId(auction.getId());
    bid.setBidderId(bidderId);
    bid.setAmount(amount);
    bid.setStatus(status);
    return bids.save(bid);
  }

  private void priceAt(Auction auction, long price) {
    auction.setCurrentPrice(price);
    auctions.save(auction);
  }

  private UserAccount user(String displayName) {
    String suffix = UUID.randomUUID().toString().substring(0, 8);
    UserAccount account = new UserAccount();
    account.setEmail("settle-" + suffix + "@bid4.ro");
    account.setDisplayName(displayName);
    account.setUsername("settle-" + suffix);
    account.setRole(UserRole.USER);
    account.setAccountType(AccountType.INDIVIDUAL);
    account.setEmailVerifiedAt(Instant.now());
    account.setAvatarUrl("");
    return users.save(account);
  }

  private Cause cause(UUID organizerId) {
    Cause cause = new Cause();
    cause.setOrganizerId(organizerId);
    cause.setName("Cauza pentru inchidere");
    cause.setSlug("cauza-" + UUID.randomUUID().toString().substring(0, 8));
    cause.setShortDescription("Descriere scurtă pentru teste.");
    cause.setCategory("medical");
    cause.setStatus(CauseStatus.ACTIVE);
    cause.setGoalAmount(10_000 * LEU);
    cause.setRaisedAmount(0);
    return causes.save(cause);
  }

  private BidStatus statusOf(Bid bid) {
    return bids.findById(bid.getId()).orElseThrow().getStatus();
  }
}
