package ro.bid4.backend.dev;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.catalog.domain.Auction;
import ro.bid4.backend.catalog.domain.AuctionStatus;
import ro.bid4.backend.catalog.domain.Bid;
import ro.bid4.backend.catalog.domain.BidStatus;
import ro.bid4.backend.catalog.domain.ItemCondition;
import ro.bid4.backend.catalog.repo.AuctionRepository;
import ro.bid4.backend.catalog.repo.BidRepository;
import ro.bid4.backend.cause.domain.Cause;
import ro.bid4.backend.cause.domain.CauseStatus;
import ro.bid4.backend.cause.domain.VerificationStatus;
import ro.bid4.backend.cause.repo.CauseRepository;
import ro.bid4.backend.identity.domain.DeliveryMethod;
import ro.bid4.backend.identity.domain.DeliveryMethodType;
import ro.bid4.backend.identity.domain.PaymentMethodCard;
import ro.bid4.backend.identity.domain.UserAccount;
import ro.bid4.backend.identity.repo.DeliveryMethodRepository;
import ro.bid4.backend.identity.repo.PaymentMethodRepository;
import ro.bid4.backend.identity.repo.UserAccountRepository;

/**
 * Causes and listings for the four demo accounts, so /licitatii has something to show.
 *
 * <p>Runs after {@link DevDataSeeder}, under the same switch, and refuses a database that already
 * holds a cause. Everything is dated relative to startup rather than to fixed instants: a seeded
 * world where every auction has already closed teaches nothing, and one closing in four minutes
 * exercises the countdown and the anti-snipe window on the way past.
 *
 * <p>How much bidding there can be is set by the size of the demo cast. One offer per bidder per
 * auction is a unique index, and a seller may not bid on their own listing, so with four accounts
 * an auction tops out at three offers. The counters are the real number of rows rather than a
 * flattering one.
 */
@Component
@Order(2)
@ConditionalOnProperty(name = "bid4.dev.seed", havingValue = "true")
public class DevCatalogSeeder implements ApplicationRunner {

  private static final Logger log = LoggerFactory.getLogger(DevCatalogSeeder.class);

  private static final long LEU = 100;

  /** An auction and how much bidding it should have when the world starts. */
  private record Planned(Auction auction, int offers, boolean settled) {}

  private final UserAccountRepository users;
  private final CauseRepository causes;
  private final AuctionRepository auctions;
  private final BidRepository bids;
  private final DeliveryMethodRepository deliveryMethods;
  private final PaymentMethodRepository paymentMethods;

  public DevCatalogSeeder(
      UserAccountRepository users,
      CauseRepository causes,
      AuctionRepository auctions,
      BidRepository bids,
      DeliveryMethodRepository deliveryMethods,
      PaymentMethodRepository paymentMethods) {
    this.users = users;
    this.causes = causes;
    this.auctions = auctions;
    this.bids = bids;
    this.deliveryMethods = deliveryMethods;
    this.paymentMethods = paymentMethods;
  }

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    if (causes.count() > 0) {
      log.info("Development catalogue seed skipped: causes already exist");
      return;
    }

    Optional<UserAccount> maria = users.findByEmail("maria@bid4.ro");
    Optional<UserAccount> zambet = users.findByEmail("contact@zambet.ro");
    Optional<UserAccount> operator = users.findByEmail("operator@bid4.ro");
    Optional<UserAccount> admin = users.findByEmail("admin@bid4.ro");

    if (maria.isEmpty() || zambet.isEmpty() || operator.isEmpty() || admin.isEmpty()) {
      log.info("Development catalogue seed skipped: the demo accounts are not all present");
      return;
    }

    UUID mariaId = maria.get().getId();
    UUID zambetId = zambet.get().getId();
    List<UUID> cast = List.of(mariaId, zambetId, operator.get().getId(), admin.get().getId());

    // Bidding is gated on a card and a delivery method. Without both, every
    // demo account can browse and none can bid, which makes the seeded world
    // look broken rather than empty.
    List.of(maria.get(), zambet.get(), operator.get(), admin.get()).forEach(this::unlockBidding);

    Instant now = Instant.now();

    Map<String, Cause> seededCauses = new LinkedHashMap<>();
    seededCauses.put(
        "ana",
        cause(
            mariaId,
            "Operația Anei",
            "operatia-anei",
            "Ana are nouă ani și așteaptă o intervenție la inimă care nu se face în țară.",
            """
            Ana are nouă ani. S-a născut cu o malformație cardiacă pe care medicii             din țară o pot urmări, dar nu o pot opera. Intervenția se face la Viena,             iar familia a strâns până acum jumătate din sumă.

            Banii acoperă operația, transportul și cele trei săptămâni de recuperare             de după. Fiecare licitație de aici duce o parte din drum.""",
            "medical",
            45_000 * LEU,
            12_400 * LEU,
            187,
            "Ionescu Ana-Maria",
            "",
            "Maria Ionescu"));
    seededCauses.put(
        "ferentari",
        cause(
            zambetId,
            "Rechizite pentru copiii din Ferentari",
            "rechizite-pentru-ferentari",
            "Ghiozdane, caiete și rechizite pentru 120 de copii, înainte de începerea școlii.",
            """
            În Ferentari sunt 120 de copii care încep școala fără ghiozdan și fără             caiete. Asociația lucrează în cartier de șase ani și știe numele fiecăruia.

            Un pachet complet costă 165 de lei: ghiozdan, caiete, penar, rechizite și             o pereche de adidași. Restul sumei merge în programul de meditații de după ore.""",
            "educatie",
            20_000 * LEU,
            8_150 * LEU,
            243,
            "Asociația Zâmbet pentru Mâine",
            "RO38291045",
            "Elena Vasilescu"));
    seededCauses.put(
        "adapost",
        cause(
            zambetId,
            "Adăpostul de la marginea orașului",
            "adapostul-de-la-marginea-orasului",
            "Hrană și tratamente pentru cei 64 de câini din adăpostul de la marginea Clujului.",
            """
            Adăpostul ține 64 de câini pe un teren închiriat la marginea Clujului.             Iarna trecută a fost cea mai grea: patru dintre ei au avut nevoie de             operații pe care le-am plătit din donații lunare.

            Suma acoperă hrana pe un an, vaccinurile și sterilizările restante.""",
            "animale",
            30_000 * LEU,
            3_600 * LEU,
            58,
            "Asociația Zâmbet pentru Mâine",
            "RO38291045",
            "Elena Vasilescu"));

    // Saved first, because a listing carries the id of the cause it donates to.
    causes.saveAll(seededCauses.values());

    List<Planned> planned =
        List.of(
            new Planned(
                listing(
                    mariaId,
                    seededCauses.get("ana"),
                    "Aparat foto Canon AE-1 Program cu obiectiv 50mm f/1.8",
                    """
                    Aparat pe film din 1983, complet funcțional. Perdele de obturator schimbate \
                    anul trecut, fotometru calibrat. Vine cu curea originală și capac de obiectiv.""",
                    "electronice",
                    ItemCondition.VERY_GOOD,
                    850,
                    40,
                    250 * LEU,
                    10 * LEU,
                    400 * LEU,
                    // Reachable, so the "cumpără acum" path is one click away
                    // in a seeded world.
                    600 * LEU,
                    now.minus(Duration.ofDays(6)),
                    now.plus(Duration.ofMinutes(4)),
                    AuctionStatus.LIVE),
                3,
                false),
            new Planned(
                listing(
                    zambetId,
                    seededCauses.get("ferentari"),
                    "Tricou retro Steaua București, ediție aniversară",
                    "Replică oficială a echipamentului din 1986, mărimea L. Nepurtat, cu etichetă.",
                    "moda",
                    ItemCondition.NEW,
                    320,
                    65,
                    90 * LEU,
                    10 * LEU,
                    null,
                    250 * LEU,
                    now.minus(Duration.ofDays(2)),
                    now.plus(Duration.ofHours(3)),
                    AuctionStatus.LIVE),
                3,
                false),
            new Planned(
                listing(
                    mariaId,
                    seededCauses.get("ferentari"),
                    "Bicicletă de oraș Pegas Practic, cadru 54",
                    """
                    Rulată două veri, ținută în casă. Cauciucuri noi, frâne reglate, coș față \
                    inclus. Se ridică din București sau se expediază pe cheltuiala cumpărătorului.""",
                    "sport",
                    ItemCondition.GOOD,
                    14_000,
                    30,
                    400 * LEU,
                    25 * LEU,
                    null,
                    null,
                    now.minus(Duration.ofDays(1)),
                    now.plus(Duration.ofDays(2)),
                    AuctionStatus.LIVE),
                2,
                false),
            new Planned(
                listing(
                    zambetId,
                    seededCauses.get("adapost"),
                    "Set de acuarele profesionale Winsor & Newton, 24 de culori",
                    """
                    Cutie metalică, folosită de câteva ori. Toate pastilele întregi, pensulă \
                    inclusă. Întreaga sumă merge la adăpost.""",
                    "arta",
                    ItemCondition.LIKE_NEW,
                    900,
                    100,
                    120 * LEU,
                    10 * LEU,
                    null,
                    null,
                    now.minus(Duration.ofHours(10)),
                    now.plus(Duration.ofDays(5)),
                    AuctionStatus.LIVE),
                0,
                false),
            new Planned(
                listing(
                    mariaId,
                    seededCauses.get("adapost"),
                    "Colecție de cărți SF, 14 volume",
                    """
                    Herbert, Asimov, Le Guin și Strugațki, ediții din anii '90. Cotoare întregi, \
                    fără sublinieri. Se trimit împachetate în două colete.""",
                    "carti",
                    ItemCondition.GOOD,
                    5_200,
                    50,
                    80 * LEU,
                    5 * LEU,
                    null,
                    null,
                    now.minus(Duration.ofDays(3)),
                    now.plus(Duration.ofHours(20)),
                    AuctionStatus.LIVE),
                3,
                false),
            new Planned(
                listing(
                    zambetId,
                    seededCauses.get("ana"),
                    "Boxă portabilă JBL Charge 5",
                    """
                    Cumpărată anul trecut, folosită la două petreceri. Cutie și cablu incluse, \
                    bateria ține o zi întreagă.""",
                    "electronice",
                    ItemCondition.VERY_GOOD,
                    680,
                    25,
                    300 * LEU,
                    20 * LEU,
                    null,
                    null,
                    now.plus(Duration.ofDays(1)),
                    now.plus(Duration.ofDays(8)),
                    AuctionStatus.SCHEDULED),
                0,
                false),
            new Planned(
                listing(
                    mariaId,
                    seededCauses.get("ana"),
                    "Ceas de mână Certina DS Podium, quartz",
                    """
                    Cumpărat în 2016, purtat rar. Brățară de oțel scurtată cu două zale, zalele \
                    scoase vin odată cu ceasul. Baterie schimbată în primăvară.""",
                    "bijuterii",
                    ItemCondition.VERY_GOOD,
                    180,
                    75,
                    900 * LEU,
                    50 * LEU,
                    null,
                    null,
                    now.minus(Duration.ofDays(10)),
                    now.minus(Duration.ofDays(3)),
                    AuctionStatus.SOLD),
                3,
                true),
            // Unpublished on purpose: the visibility rules need something that
            // its seller can see and nobody else can.
            new Planned(
                listing(
                    zambetId,
                    seededCauses.get("ferentari"),
                    "Mașină de cusut Singer, model vintage",
                    """
                    Funcțională, revizuită de un service anul acesta. Masa de lemn originală, \
                    pedală mecanică. Se ridică personal — este grea.""",
                    "casa",
                    ItemCondition.GOOD,
                    11_000,
                    45,
                    350 * LEU,
                    25 * LEU,
                    null,
                    null,
                    now.minus(Duration.ofHours(4)),
                    now.plus(Duration.ofDays(7)),
                    AuctionStatus.PENDING_REVIEW),
                0,
                false));

    // The eight above are the shop window: real titles, real copy, and what the
    // homepage rows and the cause pages are composed from. The batch below is
    // volume — enough listings, in enough states, that filtering and paging on
    // the account pages are exercised by the seed rather than by hand.
    List<Planned> everything = new ArrayList<>(planned);
    everything.addAll(volume(mariaId, seededCauses.get("ana"), now));

    // Saved before the bids, because a bid carries the id of its auction.
    auctions.saveAll(everything.stream().map(Planned::auction).toList());

    List<Bid> offers = new ArrayList<>();
    for (Planned entry : everything) {
      place(entry, cast, now, offers);
    }
    bids.saveAll(offers);

    log.warn(
        "Development seed: {} causes, {} listings, {} bids. "
            + "Dev profile only, and only into a database with no causes.",
        seededCauses.size(),
        everything.size(),
        offers.size());
  }

  /**
   * A run of ordinary listings, so the account pages have something to page through.
   *
   * <p>One seller and every status, because that is what the two lists filter on: the seller's own
   * page needs listings in review, running and finished, and the bidder pages need one account to
   * have bid on more auctions than fit on a page. Written out rather than randomised — a seed that
   * differs run to run is one that cannot be described in a bug report.
   */
  private List<Planned> volume(UUID sellerId, Cause cause, Instant now) {
    record Item(String title, String category, ItemCondition condition, long price, int offers) {}

    List<Item> items =
        List.of(
            new Item("Boxă Bluetooth JBL Flip 5", "electronice", ItemCondition.VERY_GOOD, 220, 3),
            new Item("Aparat de cafea Delonghi Dedica", "casa", ItemCondition.GOOD, 380, 2),
            new Item("Trotinetă electrică Xiaomi Pro 2", "sport", ItemCondition.GOOD, 900, 3),
            new Item("Set LEGO Technic, 1.200 piese", "jucarii", ItemCondition.LIKE_NEW, 260, 1),
            new Item("Geacă de piele naturală, mărimea M", "moda", ItemCondition.VERY_GOOD, 340, 2),
            new Item(
                "Colecție de timbre românești interbelice", "colectii", ItemCondition.GOOD, 700, 3),
            new Item("Chitară clasică Yamaha C40", "arta", ItemCondition.VERY_GOOD, 450, 2),
            new Item("Rachetă de tenis Wilson Pro Staff", "sport", ItemCondition.GOOD, 280, 0),
            new Item("Lampă de birou din alamă, anii 60", "casa", ItemCondition.GOOD, 190, 1),
            new Item("Ceas de buzunar mecanic, argintat", "bijuterii", ItemCondition.GOOD, 620, 3),
            new Item("Enciclopedie ilustrată, 12 volume", "carti", ItemCondition.VERY_GOOD, 240, 2),
            new Item(
                "Cameră foto instant Fujifilm Instax",
                "electronice",
                ItemCondition.LIKE_NEW,
                300,
                1),
            new Item("Pătuț de lemn pentru copii", "jucarii", ItemCondition.GOOD, 350, 0),
            new Item("Rolă de patinaj, mărimea 42", "sport", ItemCondition.USED, 160, 2),
            new Item("Servietă din piele, model clasic", "moda", ItemCondition.VERY_GOOD, 410, 3),
            new Item("Vinil: colecție rock, 20 de discuri", "colectii", ItemCondition.GOOD, 540, 2),
            new Item("Tablou în ulei, peisaj de munte", "arta", ItemCondition.VERY_GOOD, 800, 1),
            new Item("Robot de bucătărie Bosch", "casa", ItemCondition.GOOD, 330, 0));

    // Cycled rather than random, so the same index is always the same status.
    AuctionStatus[] cycle = {
      AuctionStatus.LIVE,
      AuctionStatus.LIVE,
      AuctionStatus.SOLD,
      AuctionStatus.PENDING_REVIEW,
      AuctionStatus.LIVE,
      AuctionStatus.UNSOLD,
      AuctionStatus.SCHEDULED,
      AuctionStatus.CANCELLED
    };

    List<Planned> generated = new ArrayList<>(items.size());
    for (int index = 0; index < items.size(); index++) {
      Item item = items.get(index);
      AuctionStatus status = cycle[index % cycle.length];
      boolean finished =
          status == AuctionStatus.SOLD
              || status == AuctionStatus.UNSOLD
              || status == AuctionStatus.ENDED;

      // A finished listing closed in the past. Anything still open has to close in
      // the future measured from now, not from its own start: an auction that
      // opened five days ago and runs for two is already over, and the clock
      // would settle it on the first tick — leaving a seed that contradicts
      // itself twenty seconds after boot.
      Instant start =
          status == AuctionStatus.SCHEDULED
              ? now.plus(Duration.ofDays(1 + (index % 3)))
              : now.minus(Duration.ofDays(1 + (index % 5)));
      Instant end;
      if (finished) {
        end = now.minus(Duration.ofHours(2L + index));
      } else if (status == AuctionStatus.SCHEDULED) {
        end = start.plus(Duration.ofDays(2 + (index % 6)));
      } else {
        end = now.plus(Duration.ofDays(2 + (index % 6)));
      }

      generated.add(
          new Planned(
              listing(
                  sellerId,
                  cause,
                  item.title(),
                  "Stare bună, folosit cu grijă. Fotografiile sunt făcute în lumină naturală "
                      + "și arată exact ce primești.",
                  item.category(),
                  item.condition(),
                  1_000 + (index * 250),
                  10 + ((index * 5) % 60),
                  item.price() * LEU,
                  10 * LEU,
                  null,
                  null,
                  start,
                  end,
                  status),
              // Nothing that never opened has an offer on it: a listing still in
              // review, one withdrawn before it started, and one that has not
              // reached its start time have all had nobody able to bid.
              status == AuctionStatus.CANCELLED
                      || status == AuctionStatus.PENDING_REVIEW
                      || status == AuctionStatus.SCHEDULED
                  ? 0
                  : item.offers(),
              finished));
    }
    return generated;
  }

  /**
   * Gives one demo account the card and the locker that a bid requires.
   *
   * <p>Skips an account that already has either. At most one default delivery method per user is a
   * partial unique index, so a second run against a database whose catalogue was cleared but whose
   * accounts were not would otherwise fail on it — which is exactly what the index is for.
   */
  private void unlockBidding(UserAccount account) {
    if (!deliveryMethods.findByUserIdOrderByCreatedAtAsc(account.getId()).isEmpty()
        || !paymentMethods.findByUserIdOrderByCreatedAtAsc(account.getId()).isEmpty()) {
      return;
    }

    DeliveryMethod locker = new DeliveryMethod();
    locker.setUserId(account.getId());
    locker.setType(DeliveryMethodType.EASYBOX);
    locker.setLabel("Easybox lângă birou");
    locker.setEasyboxLockerId("CJ-0142");
    locker.setLockerName("Easybox Iulius Mall Cluj");
    locker.setLockerAddress("Str. Alexandru Vaida Voevod 53B, Cluj-Napoca");
    locker.setPhone("+40740123456");
    locker.setDefault(true);
    deliveryMethods.save(locker);

    PaymentMethodCard card = new PaymentMethodCard();
    card.setUserId(account.getId());
    // Not a card number and not a real Stripe id — a placeholder that looks
    // like one, so nothing downstream learns to expect a shape it will not get.
    card.setProviderMethodId("pm_dev_" + account.getId().toString().substring(0, 8));
    card.setBrand("VISA");
    card.setLast4("4242");
    card.setExpMonth((short) 11);
    card.setExpYear((short) 2030);
    card.setHolderName(account.getDisplayName());
    card.setDefault(true);
    paymentMethods.save(card);

    account.setDefaultDeliveryMethodId(locker.getId());
    users.save(account);
  }

  private static Cause cause(
      UUID organizerId,
      String name,
      String slug,
      String shortDescription,
      String story,
      String category,
      long goal,
      long raised,
      int supporters,
      String legalName,
      String registrationNumber,
      String representative) {

    Cause cause = new Cause();
    cause.setOrganizerId(organizerId);
    cause.setName(name);
    cause.setSlug(slug);
    cause.setShortDescription(shortDescription);
    cause.setCategory(category);
    cause.setImageUrl(banner(slug));
    cause.setCoverUrl(banner(slug + "-cover"));
    // Several photographs, in the order the organiser put them.
    cause.setGallery(List.of(photo(slug + "-1"), photo(slug + "-2"), photo(slug + "-3")));
    cause.setStory(story);
    cause.setStatus(CauseStatus.ACTIVE);
    cause.setGoalAmount(goal);
    cause.setRaisedAmount(raised);
    cause.setSupporterCount(supporters);

    cause.setLegalName(legalName);
    cause.setRegistrationNumber(registrationNumber);
    cause.setRepresentativeName(representative);
    cause.setContactEmail("contact@bid4.ro");
    cause.setContactPhone("+40740123456");
    cause.setPayoutAccountRef("RO49AAAA1B31007593840000");

    cause.setBeneficiaryFullName(representative);
    cause.setBeneficiaryContactEmail("contact@bid4.ro");
    cause.setBeneficiaryContactPhone("+40740123456");
    cause.setBeneficiaryCounty("București");
    cause.setBeneficiaryCity("București");

    cause.setVerificationStatus(VerificationStatus.APPROVED);
    cause.setConsentTruthfulness(true);
    cause.setConsentControlledRelease(true);
    cause.setConsentTerms(true);
    cause.setConsentsAcceptedAt(Instant.now());
    cause.setApprovedAt(Instant.now());
    return cause;
  }

  private static Auction listing(
      UUID sellerId,
      Cause cause,
      String title,
      String description,
      String category,
      ItemCondition condition,
      int weightGrams,
      int donationPercent,
      long startingPrice,
      long bidIncrement,
      Long reservePrice,
      Long buyNowPrice,
      Instant startTime,
      Instant endTime,
      AuctionStatus status) {

    Auction auction = new Auction();
    auction.setSellerId(sellerId);
    auction.setCauseId(cause.getId());
    auction.setTitle(title);
    auction.setDescription(description);
    auction.setImages(gallery(title));
    auction.setCategory(category);
    auction.setCondition(condition);
    auction.setWeightGrams(weightGrams);
    auction.setDonationPercent((short) donationPercent);
    auction.setStartingPrice(startingPrice);
    auction.setCurrentPrice(startingPrice);
    auction.setBidIncrement(bidIncrement);
    auction.setReservePrice(reservePrice);
    auction.setBuyNowPrice(buyNowPrice);
    auction.setStartTime(startTime);
    auction.setEndTime(endTime);
    auction.setStatus(status);
    auction.setCreatedAt(startTime);
    return auction;
  }

  /**
   * Bids the ladder up from the starting price.
   *
   * <p>A running auction has one leader and the rest outbid; a finished one has a winner and the
   * rest lost. Exactly one WINNING row per auction is a partial unique index, which is also what
   * the read path uses to answer who is ahead.
   */
  private static void place(Planned entry, List<UUID> cast, Instant now, List<Bid> sink) {
    if (entry.offers() == 0) {
      return;
    }
    Auction auction = entry.auction();

    List<UUID> bidders =
        cast.stream()
            .filter(id -> !id.equals(auction.getSellerId()))
            .limit(entry.offers())
            .toList();
    if (bidders.isEmpty()) {
      return;
    }

    List<Bid> placed = new ArrayList<>(bidders.size());
    long amount = auction.getStartingPrice();

    for (int index = 0; index < bidders.size(); index++) {
      Bid bid = new Bid();
      bid.setAuctionId(auction.getId());
      bid.setBidderId(bidders.get(index));
      bid.setAmount(amount);
      bid.setStatus(entry.settled() ? BidStatus.LOST : BidStatus.OUTBID);
      bid.setCreatedAt(now.minus(Duration.ofHours(bidders.size() - (long) index)));
      placed.add(bid);
      amount += auction.getBidIncrement();
    }

    // Finished and won are not the same thing, and the table knows it: a winner
    // is only legal on SOLD or ENDED, so an auction that missed its reserve is
    // over with every bid lost and nobody holding it. Read off the status rather
    // than off the flag, which cannot then disagree with the row it describes.
    boolean hasWinner =
        auction.getStatus() == AuctionStatus.SOLD || auction.getStatus() == AuctionStatus.ENDED;

    Bid leader = placed.getLast();
    leader.setStatus(
        entry.settled() ? (hasWinner ? BidStatus.WON : BidStatus.LOST) : BidStatus.WINNING);
    auction.setCurrentPrice(leader.getAmount());
    auction.setBidCount(placed.size());
    if (hasWinner) {
      auction.setWinnerId(leader.getBidderId());
    }

    sink.addAll(placed);
  }

  /* --- placeholder imagery -------------------------------------------------
   *
   * Real photographs from a public placeholder service, addressed by a seed so
   * a listing keeps the same picture across restarts. Emoji on a gradient made
   * the catalogue legible but not believable — a page of coloured squares reads
   * as a wireframe, and design decisions taken against it are decisions about a
   * wireframe.
   *
   * Development only, and it does mean a seeded database now wants a network
   * on first paint. Nothing else in the application fetches from here: a real
   * listing carries whatever its seller uploaded.
   */

  private static final String PHOTO = "https://picsum.photos/seed/%s/800/600";

  /**
   * The cover each listing actually deserves: a photograph of the thing itself,
   * served from the frontend's own `public/images/products`.
   *
   * <p>A random stock picture is believable as a photograph and useless as a
   * listing — a mountain range under "Ceas de mână Certina" tells you nothing
   * about how a real catalogue reads, and every judgement made against it is a
   * judgement about the wrong page. Only the first frame is pinned; the rest of
   * the gallery stays random, because what the carousel is being exercised with
   * past frame one is its own behaviour, not the photography.
   *
   * <p>Keyed by title. A listing whose title is not here falls back to the
   * placeholder service rather than to a broken image.
   *
   * <p>The slugs name files the frontend also seeds against, so a few of them
   * read like order states rather than products: the file is the photograph, and
   * both catalogues point at the same one instead of shipping it twice.
   */
  private static final Map<String, String> COVERS =
      Map.of(
          "Aparat foto Canon AE-1 Program cu obiectiv 50mm f/1.8", "canon",
          "Tricou retro Steaua București, ediție aniversară", "tricou-retro",
          "Bicicletă de oraș Pegas Practic, cadru 54", "bicicleta",
          "Set de acuarele profesionale Winsor & Newton, 24 de culori", "acuarele",
          "Colecție de cărți SF, 14 volume", "carti-sf",
          "Boxă portabilă JBL Charge 5", "sold-confirmare",
          "Ceas de mână Certina DS Podium, quartz", "ceas",
          "Mașină de cusut Singer, model vintage", "masina-cusut");

  /** The three frames for one listing: its own photograph, then two fillers. */
  private static List<String> gallery(String title) {
    String slug = COVERS.get(title);
    String cover = slug != null ? "/images/products/" + slug + ".webp" : photo(title + "-1");
    return List.of(cover, photo(title + "-2"), photo(title + "-3"));
  }

  /** A different seed per image, or a gallery is one picture repeated three times. */
  private static String photo(String seed) {
    return PHOTO.formatted(slugSeed(seed));
  }

  /** Wide, because a cause is read as a banner rather than a card. */
  private static String banner(String seed) {
    return "https://picsum.photos/seed/%s/1200/800".formatted(slugSeed(seed));
  }

  /**
   * A stable, url-safe token for a title that may carry diacritics and spaces. The hash rather than
   * the text, so "Aparat foto Canon AE-1" and its neighbour cannot collide into the same picture.
   */
  private static String slugSeed(String seed) {
    return "bid4" + Integer.toHexString(seed.hashCode());
  }
}
