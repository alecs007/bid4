package ro.bid4.backend.inbox;

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
import ro.bid4.backend.catalog.domain.ItemCondition;
import ro.bid4.backend.catalog.repo.AuctionRepository;
import ro.bid4.backend.cause.domain.Cause;
import ro.bid4.backend.cause.domain.CauseStatus;
import ro.bid4.backend.cause.repo.CauseRepository;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.common.web.Viewer;
import ro.bid4.backend.identity.domain.AccountType;
import ro.bid4.backend.identity.domain.UserAccount;
import ro.bid4.backend.identity.domain.UserRole;
import ro.bid4.backend.identity.repo.UserAccountRepository;
import ro.bid4.backend.inbox.api.dto.OpenThreadRequest;
import ro.bid4.backend.inbox.api.dto.SendMessageRequest;
import ro.bid4.backend.inbox.api.dto.ThreadItemResponse;
import ro.bid4.backend.inbox.api.dto.ThreadResponse;
import ro.bid4.backend.inbox.domain.ThreadItemKind;
import ro.bid4.backend.inbox.service.InboxService;
import ro.bid4.backend.storage.domain.StoredFile;
import ro.bid4.backend.storage.domain.Visibility;
import ro.bid4.backend.storage.repo.StoredFileRepository;

/**
 * Who may read a thread, who may write in one, and what happens to the counts.
 *
 * <p>Driven through the service. Every question here is about which row ends up where and who was
 * allowed to put it there, and a status code answers none of them.
 */
@SpringBootTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@Import(TestcontainersConfiguration.class)
@TestPropertySource(properties = "bid4.rate-limit.enabled=false")
class InboxTest {

  private static final long LEU = 100;

  @Autowired private InboxService inbox;
  @Autowired private AuctionRepository auctions;
  @Autowired private CauseRepository causes;
  @Autowired private UserAccountRepository users;
  @Autowired private StoredFileRepository storedFiles;

  private UserAccount seller;
  private UserAccount buyer;
  private Cause approved;

  @BeforeAll
  void seedTheWorld() {
    seller = user("Vanzator Inbox");
    buyer = user("Cumparator Inbox");
    approved = cause(seller.getId());
  }

  /* --- opening ------------------------------------------------------------ */

  @Test
  @DisplayName("anybody may ask about a listing without having bid on it")
  void openingNeedsNoOffer() {
    Auction listing = liveListing();

    ThreadResponse thread =
        inbox.open(new OpenThreadRequest(listing.getId(), "Este încă disponibil?"), viewer(buyer));

    assertThat(thread.conversation().listingId()).isEqualTo(listing.getId());
    assertThat(thread.conversation().otherParty().id()).isEqualTo(seller.getId());
    assertThat(thread.items()).hasSize(1);
    assertThat(thread.items().getFirst().body()).isEqualTo("Este încă disponibil?");
  }

  @Test
  @DisplayName("asking a second time continues the first conversation")
  void openingIsIdempotent() {
    Auction listing = liveListing();

    ThreadResponse first =
        inbox.open(new OpenThreadRequest(listing.getId(), "Prima întrebare"), viewer(buyer));
    ThreadResponse second =
        inbox.open(new OpenThreadRequest(listing.getId(), "A doua"), viewer(buyer));

    assertThat(second.conversation().id()).isEqualTo(first.conversation().id());
    assertThat(second.items()).hasSize(2);
  }

  @Test
  @DisplayName("a seller cannot open a conversation against their own listing")
  void noTalkingToYourself() {
    Auction listing = liveListing();

    assertThatThrownBy(
            () -> inbox.open(new OpenThreadRequest(listing.getId(), "Salut"), viewer(seller)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("propriul anunț");
  }

  @Test
  @DisplayName("a listing still waiting for review cannot be written about")
  void draftsAreNotReachable() {
    Auction listing = liveListing();
    listing.setStatus(AuctionStatus.PENDING_REVIEW);
    auctions.save(listing);

    assertThatThrownBy(
            () -> inbox.open(new OpenThreadRequest(listing.getId(), "Salut"), viewer(buyer)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("nu a fost găsit");
  }

  /* --- who may read ------------------------------------------------------- */

  @Test
  @DisplayName("a thread is invisible to anybody who is not in it, and reads as missing")
  void strangersGetNothing() {
    Auction listing = liveListing();
    UUID conversationId =
        inbox
            .open(new OpenThreadRequest(listing.getId(), "Bună"), viewer(buyer))
            .conversation()
            .id();
    UserAccount stranger = user("Curios");

    // Not 403: a refusal that distinguishes "not yours" from "not there"
    // confirms the id names something real, and an id that can be probed will be.
    assertThatThrownBy(() -> inbox.thread(conversationId, viewer(stranger)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("nu a fost găsită");
    assertThatThrownBy(
            () -> inbox.send(conversationId, new SendMessageRequest("Hop", null), viewer(stranger)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("nu a fost găsită");
  }

  @Test
  @DisplayName("the seller sees the thread a buyer opened, and can answer in it")
  void theSellerIsInIt() {
    Auction listing = liveListing();
    UUID conversationId =
        inbox
            .open(new OpenThreadRequest(listing.getId(), "Ce stare are?"), viewer(buyer))
            .conversation()
            .id();

    ThreadItemResponse answer =
        inbox.send(conversationId, new SendMessageRequest("Ca nouă.", null), viewer(seller));

    assertThat(answer.kind()).isEqualTo(ThreadItemKind.TEXT);
    assertThat(answer.mine()).isTrue();
    assertThat(inbox.thread(conversationId, viewer(buyer)).items()).hasSize(2);
  }

  /* --- counts ------------------------------------------------------------- */

  @Test
  @DisplayName("an unread thread counts for the other side only, and clears when it is opened")
  void unreadCountsForTheOtherSide() {
    Auction listing = liveListing();
    UserAccount reader = user("Cititor Necitit");

    long sellerBefore = inbox.unread(viewer(seller)).messages();
    UUID conversationId =
        inbox
            .open(new OpenThreadRequest(listing.getId(), "Mai e?"), viewer(reader))
            .conversation()
            .id();

    assertThat(inbox.unread(viewer(seller)).messages()).isEqualTo(sellerBefore + 1);
    // The person who wrote it is not owed a badge for their own message.
    assertThat(inbox.unread(viewer(reader)).messages()).isZero();

    inbox.markRead(conversationId, viewer(seller));
    assertThat(inbox.unread(viewer(seller)).messages()).isEqualTo(sellerBefore);
  }

  @Test
  @DisplayName("the newest message is what the inbox row shows, and the thread rises to the top")
  void theListShowsTheLatest() {
    Auction listing = liveListing();
    UserAccount lister = user("Cititor Lista");
    UUID conversationId =
        inbox
            .open(new OpenThreadRequest(listing.getId(), "Prima"), viewer(lister))
            .conversation()
            .id();
    inbox.send(conversationId, new SendMessageRequest("Ultima", null), viewer(seller));

    var row = inbox.list(null, false, viewer(lister)).items().getFirst();

    assertThat(row.id()).isEqualTo(conversationId);
    assertThat(row.lastItem().body()).isEqualTo("Ultima");
    assertThat(row.listingTitle()).isEqualTo(listing.getTitle());
  }

  /* --- what may be sent --------------------------------------------------- */

  @Test
  @DisplayName("a message that hands over a phone number is delivered, and marked")
  void offPlatformIsFlaggedRatherThanDropped() {
    Auction listing = liveListing();
    UUID conversationId =
        inbox
            .open(new OpenThreadRequest(listing.getId(), "Bună ziua"), viewer(buyer))
            .conversation()
            .id();

    ThreadItemResponse sent =
        inbox.send(
            conversationId,
            new SendMessageRequest("Sună-mă la 0722 333 444", null),
            viewer(seller));

    // Delivered, because refusing it only teaches people to spell the number
    // out, and moves the same conversation somewhere nothing can see it.
    assertThat(sent.body()).isEqualTo("Sună-mă la 0722 333 444");
    assertThat(sent.flaggedReason()).isEqualTo("PHONE_NUMBER");
  }

  @Test
  @DisplayName("an empty message is not a message")
  void nothingToSay() {
    Auction listing = liveListing();
    UUID conversationId =
        inbox
            .open(new OpenThreadRequest(listing.getId(), "Salut"), viewer(buyer))
            .conversation()
            .id();

    assertThatThrownBy(
            () -> inbox.send(conversationId, new SendMessageRequest("   ", null), viewer(buyer)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("gol");
  }

  @Test
  @DisplayName("a picture has to be one this account uploaded")
  void imagesMustBelongToTheSender() {
    Auction listing = liveListing();
    UUID conversationId =
        inbox
            .open(new OpenThreadRequest(listing.getId(), "Salut"), viewer(buyer))
            .conversation()
            .id();
    UUID somebodyElses = photo(seller.getId());

    assertThatThrownBy(
            () ->
                inbox.send(
                    conversationId,
                    new SendMessageRequest(null, List.of(somebodyElses)),
                    viewer(buyer)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("Imaginile");
  }

  @Test
  @DisplayName("and one that is, arrives as a picture")
  void ownImagesGoThrough() {
    Auction listing = liveListing();
    UUID conversationId =
        inbox
            .open(new OpenThreadRequest(listing.getId(), "Salut"), viewer(buyer))
            .conversation()
            .id();

    ThreadItemResponse sent =
        inbox.send(
            conversationId,
            new SendMessageRequest(null, List.of(photo(buyer.getId()))),
            viewer(buyer));

    assertThat(sent.kind()).isEqualTo(ThreadItemKind.IMAGE);
    assertThat(sent.imageUrls()).hasSize(1);
  }

  /* --- fixtures ----------------------------------------------------------- */

  private Auction liveListing() {
    Auction auction = new Auction();
    auction.setSellerId(seller.getId());
    auction.setCauseId(approved.getId());
    auction.setTitle("Obiect de conversație " + UUID.randomUUID());
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

  private UUID photo(UUID ownerId) {
    StoredFile file = new StoredFile();
    file.setBucket("bid4-public");
    file.setObjectKey("threads/" + UUID.randomUUID() + ".webp");
    file.setVisibility(Visibility.PUBLIC);
    file.setOriginalName("photo.webp");
    file.setContentType("image/webp");
    file.setSizeBytes(1024);
    file.setChecksumSha256("a".repeat(64));
    file.setOwnerId(ownerId);
    return storedFiles.save(file).getId();
  }

  private static Viewer viewer(UserAccount account) {
    return Viewer.of(account.getId(), false);
  }

  private UserAccount user(String displayName) {
    String suffix = UUID.randomUUID().toString().substring(0, 8);
    UserAccount account = new UserAccount();
    account.setEmail("inbox-" + suffix + "@bid4.ro");
    account.setDisplayName(displayName);
    account.setUsername("inbox-" + suffix);
    account.setRole(UserRole.USER);
    account.setAccountType(AccountType.INDIVIDUAL);
    account.setEmailVerifiedAt(Instant.now());
    account.setAvatarUrl("");
    return users.save(account);
  }

  private Cause cause(UUID organizerId) {
    Cause cause = new Cause();
    cause.setOrganizerId(organizerId);
    cause.setName("Cauza pentru conversații");
    cause.setSlug("cauza-inbox-" + UUID.randomUUID().toString().substring(0, 8));
    cause.setShortDescription("Descriere scurtă pentru teste.");
    cause.setCategory("medical");
    cause.setStatus(CauseStatus.ACTIVE);
    cause.setGoalAmount(10_000 * LEU);
    cause.setRaisedAmount(0);
    return causes.save(cause);
  }
}
