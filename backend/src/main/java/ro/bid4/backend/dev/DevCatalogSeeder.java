package ro.bid4.backend.dev;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
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

    // Saved before the bids, because a bid carries the id of its auction.
    auctions.saveAll(planned.stream().map(Planned::auction).toList());

    List<Bid> offers = new ArrayList<>();
    for (Planned entry : planned) {
      place(entry, cast, now, offers);
    }
    bids.saveAll(offers);

    log.warn(
        "Development seed: {} causes, {} listings, {} bids. "
            + "Dev profile only, and only into a database with no causes.",
        seededCauses.size(),
        planned.size(),
        offers.size());
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

    String glyph = CAUSE_GLYPHS.getOrDefault(category, "💚");
    Cause cause = new Cause();
    cause.setOrganizerId(organizerId);
    cause.setName(name);
    cause.setSlug(slug);
    cause.setShortDescription(shortDescription);
    cause.setCategory(category);
    cause.setImageUrl(tile(slug, glyph));
    cause.setCoverUrl(tile(slug + "-cover", glyph));
    // Several photographs, in the order the organiser put them.
    cause.setGallery(
        List.of(tile(slug + "-1", glyph), tile(slug + "-2", glyph), tile(slug + "-3", glyph)));
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

    String glyph = AUCTION_GLYPHS.getOrDefault(category, "🎁");

    Auction auction = new Auction();
    auction.setSellerId(sellerId);
    auction.setCauseId(cause.getId());
    auction.setTitle(title);
    auction.setDescription(description);
    auction.setImages(
        List.of(tile(title + "-1", glyph), tile(title + "-2", glyph), tile(title + "-3", glyph)));
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

    Bid leader = placed.getLast();
    leader.setStatus(entry.settled() ? BidStatus.WON : BidStatus.WINNING);
    auction.setCurrentPrice(leader.getAmount());
    auction.setBidCount(placed.size());
    if (entry.settled()) {
      auction.setWinnerId(leader.getBidderId());
    }

    sink.addAll(placed);
  }

  /* --- placeholder imagery -------------------------------------------------
   *
   * Inline SVG, so a development database needs neither an image host nor an
   * upload pipeline to render a page. Deterministic in its seed, so a listing
   * keeps the same colours across restarts.
   */

  private static final String[][] PALETTE = {
    {"#e3f8cf", "#a6e772"},
    {"#ffe1d8", "#ffc3b2"},
    {"#d9f0fd", "#b3e2fb"},
    {"#fff3c6", "#ffe587"},
    {"#f3fcea", "#c8f1a4"}
  };

  private static final Map<String, String> AUCTION_GLYPHS =
      Map.of(
          "moda", "👗",
          "electronice", "📱",
          "casa", "🏡",
          "arta", "🎨",
          "carti", "📖",
          "sport", "⚽",
          "jucarii", "🧩",
          "colectii", "🏆",
          "bijuterii", "💍");

  private static final Map<String, String> CAUSE_GLYPHS =
      Map.of(
          "medical", "🩺",
          "educatie", "📚",
          "copii", "🧸",
          "animale", "🐾",
          "mediu", "🌱",
          "varstnici", "👵",
          "comunitate", "🏘️",
          "urgente", "🚨");

  private static String tile(String seed, String glyph) {
    int hash = Math.abs(seed.hashCode());
    String[] pair = PALETTE[hash % PALETTE.length];
    // The gradient is named after the seed, which is also what makes two tiles
    // from different seeds different strings. Without it a gallery whose images
    // land on the same palette is a list of identical URLs, and anything keying
    // off the URL — a React list, a lightbox — sees one image repeated.
    String gradientId = "g" + hash;
    int angle = hash % 60;

    String svg =
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'>"
            + "<defs><linearGradient id='"
            + gradientId
            + "' gradientTransform='rotate("
            + angle
            + ")'>"
            + "<stop offset='0' stop-color='"
            + pair[0]
            + "'/><stop offset='1' stop-color='"
            + pair[1]
            + "'/></linearGradient></defs>"
            + "<rect width='800' height='600' fill='url(#"
            + gradientId
            + ")'/>"
            + "<text x='400' y='390' font-size='220' text-anchor='middle'>"
            + glyph
            + "</text></svg>";

    return "data:image/svg+xml;charset=utf-8,"
        + URLEncoder.encode(svg, StandardCharsets.UTF_8).replace("+", "%20");
  }
}
