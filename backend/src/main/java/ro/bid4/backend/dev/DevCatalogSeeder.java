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
import ro.bid4.backend.catalog.service.CatalogRules;
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
import ro.bid4.backend.orders.service.Terms;

/**
 * Causes and listings for the four demo accounts, so /licitatii has something to show.
 *
 * <p>Runs after {@link DevDataSeeder}, under the same switch, and refuses a database that already
 * holds a cause. Everything is dated relative to startup rather than to fixed instants, so a
 * listing put up "four days ago" is four days old whenever the seed is run.
 *
 * <p>Every status the model has appears at least once, the two that carry a buyer included. Those
 * are the ones worth looking at: a listing is reserved when its seller has taken an offer and is
 * waiting to be paid, and sold once the money has arrived.
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

  /**
   * An auction and how much bidding it should have when the world starts.
   *
   * <p>What becomes of those offers is not a field. It is read off the listing's status, so the
   * seed cannot describe a sold listing whose bids all still say they are running.
   */
  private record Planned(Auction auction, int offers) {}

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
                    400 * LEU,
                    // Reachable, so the "cumpără acum" path is one click away
                    // in a seeded world.
                    600 * LEU,
                    now.minus(Duration.ofDays(6)),
                    AuctionStatus.LIVE),
                3),
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
                    null,
                    250 * LEU,
                    now.minus(Duration.ofDays(2)),
                    AuctionStatus.LIVE),
                3),
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
                    null,
                    null,
                    now.minus(Duration.ofDays(1)),
                    AuctionStatus.LIVE),
                2),
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
                    null,
                    null,
                    now.minus(Duration.ofHours(10)),
                    AuctionStatus.LIVE),
                0),
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
                    null,
                    null,
                    now.minus(Duration.ofDays(3)),
                    AuctionStatus.LIVE),
                3),
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
                    null,
                    null,
                    now.minus(Duration.ofDays(4)),
                    // The shop window needs one listing caught between the
                    // acceptance and the payment: its seller has chosen, and
                    // chosen an offer that was not the highest.
                    AuctionStatus.RESERVED),
                3),
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
                    null,
                    null,
                    now.minus(Duration.ofDays(10)),
                    AuctionStatus.SOLD),
                3),
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
                    null,
                    null,
                    now.minus(Duration.ofHours(4)),
                    AuctionStatus.PENDING_REVIEW),
                0));

    // The eight above are the shop window: real titles, real copy, and what the
    // homepage rows and the cause pages are composed from. The batch below is
    // volume — enough listings, in enough states, that filtering and paging on
    // the account pages are exercised by the seed rather than by hand.
    List<Planned> everything = new ArrayList<>(planned);
    everything.addAll(volume(mariaId, seededCauses.get("ana"), now));

    // Three passes, in the order the real thing happens in.
    //
    // A bid carries the id of its auction, and an acceptance carries the id of
    // the bid it took, so a listing the seed describes as reserved or sold
    // cannot be inserted that way — it would name an offer that does not exist
    // yet, and the table checks. Every row goes in open, the offers are placed
    // on it, and the acceptance is replayed once they have ids. The flushes are
    // what make that ordering real rather than a hope about Hibernate's.
    List<AuctionStatus> outcomes =
        everything.stream().map(entry -> entry.auction().getStatus()).toList();
    for (Planned entry : everything) {
      if (entry.auction().getStatus().isCommitted()) {
        entry.auction().setStatus(AuctionStatus.LIVE);
      }
    }
    auctions.saveAll(everything.stream().map(Planned::auction).toList());
    auctions.flush();

    List<Bid> offers = new ArrayList<>();
    List<List<Bid>> byListing = new ArrayList<>(everything.size());
    for (Planned entry : everything) {
      List<Bid> placed = place(entry, cast, now);
      byListing.add(placed);
      offers.addAll(placed);
    }
    bids.saveAll(offers);
    bids.flush();

    for (int index = 0; index < everything.size(); index++) {
      settle(everything.get(index), outcomes.get(index), byListing.get(index), now);
    }
    auctions.saveAll(everything.stream().map(Planned::auction).toList());
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
   * page needs drafts, listings in review, listings running and listings sold, and the bidder pages
   * need one account to have bid on more auctions than fit on a page. Written out rather than
   * randomised — a seed that differs run to run is one that cannot be described in a bug report.
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

    // Cycled rather than random, so the same index is always the same status,
    // and every status the model still has appears at least twice.
    AuctionStatus[] cycle = {
      AuctionStatus.LIVE,
      AuctionStatus.LIVE,
      AuctionStatus.SOLD,
      AuctionStatus.PENDING_REVIEW,
      AuctionStatus.LIVE,
      AuctionStatus.RESERVED,
      AuctionStatus.DRAFT,
      AuctionStatus.CANCELLED
    };

    List<Planned> generated = new ArrayList<>(items.size());
    for (int index = 0; index < items.size(); index++) {
      Item item = items.get(index);
      AuctionStatus status = cycle[index % cycle.length];

      // Everything is already up. Nothing is published into the future any more,
      // and nothing has a closing time to be spread out between.
      Instant start = now.minus(Duration.ofDays(1 + (index % 5)));

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
                  null,
                  null,
                  start,
                  status),
              // Nothing that was never public has an offer on it: a draft, a
              // listing still in review and one withdrawn before it opened have
              // all had nobody able to bid.
              status.isPublic() && status != AuctionStatus.CANCELLED ? item.offers() : 0));
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
      Long reservePrice,
      Long buyNowPrice,
      Instant startTime,
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
    // Not a seeded choice either: the ladder decides, exactly as it does for a
    // listing a real seller writes.
    auction.setBidIncrement(CatalogRules.bidStepFor(startingPrice));
    auction.setReservePrice(reservePrice);
    auction.setBuyNowPrice(buyNowPrice);
    auction.setStartTime(startTime);
    auction.setStatus(status);
    auction.setCreatedAt(startTime);
    return auction;
  }

  /**
   * Bids the ladder up from the starting price.
   *
   * <p>Always as an open listing reads: one leader, the rest outbid. What the seller then did about
   * them is {@link #settle}'s business, and doing it in two passes is what lets the acceptance name
   * a bid that exists. Exactly one WINNING row per auction is a partial unique index, which is also
   * what the read path uses to answer who is ahead.
   */
  private static List<Bid> place(Planned entry, List<UUID> cast, Instant now) {
    if (entry.offers() == 0) {
      return List.of();
    }
    Auction auction = entry.auction();

    List<UUID> bidders =
        cast.stream()
            .filter(id -> !id.equals(auction.getSellerId()))
            .limit(entry.offers())
            .toList();
    if (bidders.isEmpty()) {
      return List.of();
    }

    List<Bid> placed = new ArrayList<>(bidders.size());
    long amount = auction.getStartingPrice();

    for (int index = 0; index < bidders.size(); index++) {
      Bid bid = new Bid();
      bid.setAuctionId(auction.getId());
      bid.setBidderId(bidders.get(index));
      bid.setAmount(amount);
      bid.setStatus(BidStatus.OUTBID);
      Instant at = now.minus(Duration.ofHours(bidders.size() - (long) index));
      bid.setCreatedAt(at);
      // As BidService would have written it. A seeded offer with no acceptance
      // beside it would make the demo the one place a bid can exist without one.
      bid.setTermsVersion(Terms.CURRENT_VERSION);
      bid.setTermsAcceptedAt(at);
      placed.add(bid);
      amount += auction.getBidIncrement();
    }

    Bid leader = placed.getLast();
    leader.setStatus(BidStatus.WINNING);
    auction.setCurrentPrice(leader.getAmount());
    auction.setBidCount(placed.size());
    return placed;
  }

  /**
   * Replays what the seller did once the offers were in, matching OfferService step for step.
   *
   * <p>Nothing settles itself here, because nothing settles itself anywhere any more. A reserved
   * listing is one whose seller has taken an offer and is waiting to be paid; a sold one has been
   * paid for and now owes a parcel.
   *
   * <p>The reserved listing deliberately takes an offer from the middle of the ladder. A seed where
   * the highest offer always wins is a seed that never shows the one thing the model is for.
   */
  private static void settle(Planned entry, AuctionStatus outcome, List<Bid> placed, Instant now) {
    Auction auction = entry.auction();

    if (outcome == AuctionStatus.CANCELLED) {
      // Withdrawing releases anyone still holding an offer, exactly as
      // ListingService does on the way out.
      placed.forEach(bid -> bid.setStatus(BidStatus.LOST));
      return;
    }
    if (!outcome.isCommitted()) {
      return;
    }
    if (placed.isEmpty()) {
      throw new IllegalStateException(
          "Seeded listing \""
              + auction.getTitle()
              + "\" is "
              + outcome
              + " with no offer to accept");
    }

    boolean paid = outcome == AuctionStatus.SOLD;
    Bid accepted = placed.get(paid ? placed.size() - 1 : placed.size() / 2);
    Instant acceptedAt = now.minus(Duration.ofDays(paid ? 2 : 0)).minus(Duration.ofHours(6));

    if (paid) {
      // markPaid: everything loses, then the accepted offer is lifted back out.
      placed.forEach(bid -> bid.setStatus(BidStatus.LOST));
      accepted.setStatus(BidStatus.WON);
      auction.setDispatchDeadline(acceptedAt.plus(Duration.ofDays(CatalogRules.DISPATCH_DAYS)));
    } else {
      // accept: the other offers are left standing, because the seller can still
      // hand this one back to the room.
      accepted.setStatus(BidStatus.ACCEPTED);
    }

    auction.setStatus(outcome);
    auction.setWinnerId(accepted.getBidderId());
    auction.setAcceptedBidId(accepted.getId());
    auction.setAcceptedAt(acceptedAt);
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
   * The cover each listing actually deserves: a photograph of the thing itself, served from the
   * frontend's own `public/images/products`.
   *
   * <p>A random stock picture is believable as a photograph and useless as a listing — a mountain
   * range under "Ceas de mână Certina" tells you nothing about how a real catalogue reads, and
   * every judgement made against it is a judgement about the wrong page. Only the first frame is
   * pinned; the rest of the gallery stays random, because what the carousel is being exercised with
   * past frame one is its own behaviour, not the photography.
   *
   * <p>Keyed by title. A listing whose title is not here falls back to the placeholder service
   * rather than to a broken image.
   *
   * <p>The slugs name files the frontend also seeds against, so a few of them read like order
   * states rather than products: the file is the photograph, and both catalogues point at the same
   * one instead of shipping it twice.
   */
  private static final Map<String, String> COVERS =
      Map.ofEntries(
          Map.entry("Aparat foto Canon AE-1 Program cu obiectiv 50mm f/1.8", "canon"),
          Map.entry("Tricou retro Steaua București, ediție aniversară", "tricou-retro"),
          Map.entry("Bicicletă de oraș Pegas Practic, cadru 54", "bicicleta"),
          Map.entry("Set de acuarele profesionale Winsor & Newton, 24 de culori", "acuarele"),
          Map.entry("Colecție de cărți SF, 14 volume", "carti-sf"),
          Map.entry("Boxă portabilă JBL Charge 5", "sold-confirmare"),
          Map.entry("Boxă Bluetooth JBL Flip 5", "sold-confirmare"),
          Map.entry("Ceas de mână Certina DS Podium, quartz", "ceas"),
          Map.entry("Mașină de cusut Singer, model vintage", "masina-cusut"),
          Map.entry("Chitară clasică Yamaha C40", "chitara"),
          Map.entry("Tablou în ulei, peisaj de munte", "tablou"),
          Map.entry("Enciclopedie ilustrată, 12 volume", "carti"),
          Map.entry("Aparat de cafea Delonghi Dedica", "espressor"),
          Map.entry("Rolă de patinaj, mărimea 42", "nevanduta-2"),
          Map.entry("Trotinetă electrică Xiaomi Pro 2", "sold-plata"),
          Map.entry("Ceas de buzunar mecanic, argintat", "ceas-buzunar"),
          Map.entry("Lampă de birou din alamă, anii 60", "lampa-birou"),
          Map.entry("Robot de bucătărie Bosch", "robot-bucatarie"),
          Map.entry("Colecție de timbre românești interbelice", "timbre"),
          Map.entry("Pătuț de lemn pentru copii", "patut-copii"),
          Map.entry("Geacă de piele naturală, mărimea M", "geaca-piele"),
          Map.entry("Servietă din piele, model clasic", "servieta"));

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
