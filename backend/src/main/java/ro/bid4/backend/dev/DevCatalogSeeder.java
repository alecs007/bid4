package ro.bid4.backend.dev;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
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

@Component
@Order(2)
@ConditionalOnProperty(name = "bid4.dev.seed", havingValue = "true")
public class DevCatalogSeeder implements ApplicationRunner {
  private static final Logger log = LoggerFactory.getLogger(DevCatalogSeeder.class);

  private static final long LEU = 100;

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
      varyGalleries();
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
                    AuctionStatus.LIVE),
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

    List<Planned> everything = new ArrayList<>(planned);
    everything.addAll(volume(mariaId, zambetId, seededCauses.get("ana"), now));

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
    varyGalleries();

    log.warn(
        "Development seed: {} causes, {} listings, {} bids. "
            + "Dev profile only, and only into a database with no causes.",
        seededCauses.size(),
        everything.size(),
        offers.size());
  }

  private List<Planned> volume(UUID sellerId, UUID otherSellerId, Cause cause, Instant now) {
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
            new Item("Robot de bucătărie Bosch", "casa", ItemCondition.GOOD, 330, 0),
            new Item("Drujbă electrică Bosch AKE 35", "casa", ItemCondition.GOOD, 290, 2),
            new Item("Bicicletă pentru copii, 20 inch", "sport", ItemCondition.VERY_GOOD, 240, 1),
            new Item("Set de acuarele profesionale", "arta", ItemCondition.LIKE_NEW, 180, 3),
            new Item("Monede de colecție, perioada regală", "colectii", ItemCondition.GOOD, 660, 2),
            new Item("Rochie de seară, mărimea S", "moda", ItemCondition.LIKE_NEW, 320, 1),
            new Item("Telescop astronomic 70/700", "electronice", ItemCondition.GOOD, 430, 2),
            new Item("Puzzle 5.000 de piese, sigilat", "jucarii", ItemCondition.LIKE_NEW, 150, 1),
            new Item(
                "Atlas geografic, ediție cartonată", "carti", ItemCondition.VERY_GOOD, 210, 2));

    AuctionStatus[] cycle = {
      AuctionStatus.LIVE,
      AuctionStatus.LIVE,
      AuctionStatus.SOLD,
      AuctionStatus.LIVE,
      AuctionStatus.PENDING_REVIEW,
      AuctionStatus.LIVE,
      AuctionStatus.LIVE,
      AuctionStatus.LIVE,
      AuctionStatus.DRAFT,
      AuctionStatus.LIVE,
      AuctionStatus.CANCELLED,
      AuctionStatus.LIVE
    };

    List<Planned> generated = new ArrayList<>(items.size());
    for (int index = 0; index < items.size(); index++) {
      Item item = items.get(index);
      AuctionStatus status = cycle[index % cycle.length];

      Instant start = now.minus(Duration.ofDays(1 + (index % 5)));

      generated.add(
          new Planned(
              listing(
                  index % 2 == 0 ? sellerId : otherSellerId,
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
              status.isPublic() && status != AuctionStatus.CANCELLED ? item.offers() : 0));
    }
    return generated;
  }

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
    auction.setBidIncrement(CatalogRules.bidStepFor(startingPrice));
    auction.setReservePrice(reservePrice);
    auction.setBuyNowPrice(buyNowPrice);
    auction.setStartTime(startTime);
    auction.setStatus(status);
    auction.setCreatedAt(startTime);
    return auction;
  }

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

  private static void settle(Planned entry, AuctionStatus outcome, List<Bid> placed, Instant now) {
    Auction auction = entry.auction();

    if (outcome == AuctionStatus.CANCELLED) {
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
      placed.forEach(bid -> bid.setStatus(BidStatus.LOST));
      accepted.setStatus(BidStatus.WON);
      auction.setDispatchDeadline(acceptedAt.plus(Duration.ofDays(CatalogRules.DISPATCH_DAYS)));
    } else {
      accepted.setStatus(BidStatus.ACCEPTED);
    }

    auction.setStatus(outcome);
    auction.setWinnerId(accepted.getBidderId());
    auction.setAcceptedBidId(accepted.getId());
    auction.setAcceptedAt(acceptedAt);
  }

  private static final String PHOTO = "https://picsum.photos/seed/%s/800/600";

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

  private static final int MOST_PHOTOS = 6;

  private void varyGalleries() {
    List<Auction> seeded =
        auctions.findAll().stream().sorted(Comparator.comparing(Auction::getTitle)).toList();
    List<Auction> changed = new ArrayList<>();
    for (int index = 0; index < seeded.size(); index++) {
      Auction auction = seeded.get(index);
      List<String> current = List.copyOf(auction.getImages());
      List<String> next = gallery(auction.getTitle(), 1 + index % MOST_PHOTOS);
      if (!current.equals(gallery(auction.getTitle())) || current.equals(next)) continue;
      auction.setImages(new ArrayList<>(next));
      changed.add(auction);
    }
    auctions.saveAll(changed);
    if (!changed.isEmpty()) {
      log.info("Development seed: {} galleries given 1 to {} photos", changed.size(), MOST_PHOTOS);
    }
  }

  private static List<String> gallery(String title) {
    return gallery(title, 3);
  }

  private static List<String> gallery(String title, int count) {
    String slug = COVERS.get(title);
    String cover = slug != null ? "/images/products/" + slug + ".webp" : photo(title + "-1");
    List<String> photos = new ArrayList<>(List.of(cover));
    for (int number = 2; number <= count; number++) {
      photos.add(photo(title + "-" + number));
    }
    return List.copyOf(photos);
  }

  private static String photo(String seed) {
    return PHOTO.formatted(slugSeed(seed));
  }

  private static String banner(String seed) {
    return "https://picsum.photos/seed/%s/1200/800".formatted(slugSeed(seed));
  }

  private static String slugSeed(String seed) {
    return "bid4" + Integer.toHexString(seed.hashCode());
  }
}
