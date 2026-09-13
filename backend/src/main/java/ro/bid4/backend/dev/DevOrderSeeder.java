package ro.bid4.backend.dev;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import ro.bid4.backend.catalog.domain.Auction;
import ro.bid4.backend.catalog.domain.AuctionStatus;
import ro.bid4.backend.catalog.repo.AuctionRepository;
import ro.bid4.backend.common.web.Viewer;
import ro.bid4.backend.identity.domain.DeliveryMethod;
import ro.bid4.backend.identity.domain.UserAccount;
import ro.bid4.backend.identity.repo.DeliveryMethodRepository;
import ro.bid4.backend.identity.repo.UserAccountRepository;
import ro.bid4.backend.orders.domain.DisputeOutcome;
import ro.bid4.backend.orders.domain.OrderStatus;
import ro.bid4.backend.orders.repo.OrderRepository;
import ro.bid4.backend.orders.service.OrderService;

/**
 * Sales for the demo accounts, one stopped at every case worth looking at.
 *
 * <p>Written by walking the real service rather than by inserting rows: every card in the thread,
 * every ledger entry, every document and every status is produced by the code that produces them in
 * production, so the demo cannot drift from the thing it demonstrates. Insert the rows by hand and
 * the first time a step changes, the seed is a museum of how it used to work.
 *
 * <p>Maria is on both sides of it. She buys in half of these and sells in the other half, because
 * the two sides of a step read differently and a demo that only ever shows one of them hides half
 * of what was built.
 *
 * <p>What it deliberately does not consume is all of her listings. Several stay open with standing
 * offers on them, so the acceptance itself — the one step that starts everything else, and the only
 * one with no order behind it yet — can be exercised from the seeded world rather than only read
 * about.
 */
@Component
@Order(4)
@ConditionalOnProperty(name = "bid4.dev.seed", havingValue = "true")
public class DevOrderSeeder implements ApplicationRunner {

  private static final Logger log = LoggerFactory.getLogger(DevOrderSeeder.class);

  /**
   * How far each seeded sale is walked.
   *
   * <p>Not {@code OrderStatus}: several of these end in the same status by different routes, and
   * the route is the thing worth seeing. A sale refunded after a dispute and one simply cancelled
   * are both endings, and they write different cards.
   */
  private enum Stage {
    DELIVERY_PENDING,
    PAYMENT_PENDING,
    PAYMENT_FAILED,
    PAID,
    LABEL_ISSUED,
    IN_TRANSIT,
    AT_LOCKER,
    DELIVERED,
    COMPLETED,
    DISPUTE_OPEN,
    DISPUTE_REFUNDED,
    DISPUTE_RELEASED,
    CANCELLED_BY_BUYER,
    CANCELLED_BY_SELLER
  }

  /** How many of Maria's open listings are left alone, so offers remain to accept. */
  private static final int LISTINGS_KEPT_OPEN = 3;

  private final UserAccountRepository users;
  private final AuctionRepository auctions;
  private final OrderRepository orders;
  private final DeliveryMethodRepository deliveryMethods;
  private final OrderService sales;

  public DevOrderSeeder(
      UserAccountRepository users,
      AuctionRepository auctions,
      OrderRepository orders,
      DeliveryMethodRepository deliveryMethods,
      OrderService sales) {
    this.users = users;
    this.auctions = auctions;
    this.orders = orders;
    this.deliveryMethods = deliveryMethods;
    this.sales = sales;
  }

  /**
   * Deliberately not {@code @Transactional}.
   *
   * <p>Every call below opens its own. Sharing one would mean a step the service refuses marks that
   * transaction rollback-only, and the {@code catch} here would swallow the exception while the
   * commit at the end quietly threw away every sale — which is exactly what it did.
   */
  @Override
  public void run(ApplicationArguments args) {
    if (orders.count() > 0) {
      log.info("Development order seed skipped: orders already exist");
      return;
    }

    Optional<UserAccount> maria = users.findByEmail("maria@bid4.ro");
    if (maria.isEmpty()) {
      log.info("Development order seed skipped: the demo accounts are not there");
      return;
    }
    UUID mariaId = maria.get().getId();

    // An operator, for the one transition only staff may make.
    Viewer staff =
        users
            .findByEmail("operator@bid4.ro")
            .map(account -> Viewer.of(account.getId(), true))
            .orElse(null);

    List<UserAccount> others =
        users.findAll().stream().filter(user -> !user.getId().equals(mariaId)).toList();
    if (others.isEmpty()) {
      return;
    }

    List<Auction> buying = listings(listing -> !listing.getSellerId().equals(mariaId));
    List<Auction> selling = listings(listing -> listing.getSellerId().equals(mariaId));

    // Held back, so the demo still has offers waiting on a decision. Taken off
    // the end rather than the start: the first of her listings are the ones the
    // shop window is composed from, and they are the better ones to walk.
    List<Auction> sellingPool =
        selling.size() > LISTINGS_KEPT_OPEN
            ? selling.subList(0, selling.size() - LISTINGS_KEPT_OPEN)
            : List.of();

    Stage[] stages = Stage.values();
    int written = 0;
    Set<UUID> used = new HashSet<>();

    for (int index = 0; index < stages.length; index++) {
      Stage stage = stages[index];
      boolean asBuyer = index % 2 == 0;

      // A listing carries one open sale at a time — a partial unique index says
      // so — and reusing one here handed a later stage the earlier stage's order
      // and then walked it from the wrong place.
      Optional<Auction> free = firstFree(asBuyer ? buying : sellingPool, used);
      if (free.isEmpty()) {
        asBuyer = !asBuyer;
        free = firstFree(asBuyer ? buying : sellingPool, used);
      }
      if (free.isEmpty()) {
        log.info("Development order seed: no listing left for {}", stage);
        continue;
      }

      Auction listing = free.get();
      UUID buyerId = asBuyer ? mariaId : others.get(index % others.size()).getId();
      if (buyerId.equals(listing.getSellerId())) {
        continue;
      }
      used.add(listing.getId());

      try {
        walk(listing, buyerId, stage, staff);
        written++;
      } catch (RuntimeException failure) {
        // A seed is not worth a failed boot. One case that cannot be reached —
        // a listing without a cause, an account without an address — should not
        // take the others with it.
        log.warn("Development order seed: {} skipped ({})", stage, failure.getMessage());
      }
    }

    log.info(
        "Development order seed: {} sales across {} cases, {} of Maria's listings left open",
        written,
        stages.length,
        selling.size() - sellingPool.size());
  }

  private static Optional<Auction> firstFree(List<Auction> pool, Set<UUID> used) {
    return pool.stream().filter(listing -> !used.contains(listing.getId())).findFirst();
  }

  private List<Auction> listings(java.util.function.Predicate<Auction> mine) {
    return auctions.findAll().stream()
        .filter(listing -> listing.getStatus() == AuctionStatus.LIVE)
        .filter(listing -> listing.getCauseId() != null)
        .filter(mine)
        .toList();
  }

  /** Opens a sale and moves it along until it is where it should stop. */
  private void walk(Auction listing, UUID buyerId, Stage until, Viewer staff) {
    Viewer buyer = Viewer.of(buyerId, false);
    Viewer seller = Viewer.of(listing.getSellerId(), false);

    var order = sales.open(listing, buyerId, listing.getCurrentPrice());
    UUID id = order.getId();
    if (until == Stage.DELIVERY_PENDING) {
      return;
    }

    if (until == Stage.CANCELLED_BY_SELLER) {
      sales.cancel(id, "Obiectul nu mai este disponibil.", seller);
      return;
    }

    DeliveryMethod address =
        deliveryMethods.findByUserIdOrderByCreatedAtAsc(buyerId).stream()
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("no delivery method for the buyer"));
    sales.chooseDelivery(id, address.getId(), buyer);
    if (until == Stage.PAYMENT_PENDING) {
      return;
    }

    if (until == Stage.CANCELLED_BY_BUYER) {
      sales.cancel(id, "Am găsit produsul la un preț mai bun.", buyer);
      return;
    }

    if (until == Stage.PAYMENT_FAILED) {
      failPayment(id);
      return;
    }

    sales.markPaid(id, buyer);
    if (until == Stage.PAID) {
      return;
    }

    sales.generateLabel(id, seller);
    if (until == Stage.LABEL_ISSUED) {
      return;
    }

    // From here the courier moves it, never a button — which is why these are
    // scans rather than calls either party could make. In production they
    // arrive at the webhook; here they are the same service call it makes.
    sales.recordTracking(
        id, OrderStatus.DROPPED_OFF, "Colet preluat de curier", "București", "seed-" + id);
    sales.recordTracking(
        id, OrderStatus.IN_TRANSIT, "Colet în tranzit", "Otopeni", "seed-transit-" + id);
    if (until == Stage.IN_TRANSIT) {
      return;
    }

    if (until == Stage.AT_LOCKER) {
      sales.recordTracking(
          id,
          OrderStatus.ARRIVED_AT_LOCKER,
          "Colet disponibil pentru ridicare",
          "București",
          "seed-locker-" + id);
      return;
    }

    sales.recordTracking(
        id, OrderStatus.DELIVERED, "Colet livrat", "București", "seed-delivered-" + id);
    if (until == Stage.DELIVERED) {
      return;
    }

    if (until == Stage.DISPUTE_OPEN
        || until == Stage.DISPUTE_REFUNDED
        || until == Stage.DISPUTE_RELEASED) {
      sales.openDispute(id, "Produsul nu corespunde descrierii din anunț.", buyer);
      if (until == Stage.DISPUTE_OPEN || staff == null) {
        return;
      }
      sales.resolveDispute(
          id,
          until == Stage.DISPUTE_REFUNDED ? DisputeOutcome.REFUND : DisputeOutcome.RELEASE,
          until == Stage.DISPUTE_REFUNDED
              ? "Diferențele față de anunț au fost confirmate de fotografiile trimise."
              : "Produsul corespunde descrierii din anunț.",
          staff);
      return;
    }

    sales.confirmReceipt(id, buyer);
  }

  /**
   * A payment the provider refused.
   *
   * <p>The one case the stub gateway cannot produce: it settles everything, so there is no route
   * through it to a declined card. The reference is planted the way a real provider's session would
   * have been and the transition itself goes through the service, which is what a webhook calls —
   * so the resulting order is shaped exactly like one that really failed.
   */
  private void failPayment(UUID orderId) {
    String reference = "seed-declined-" + orderId;
    orders
        .findById(orderId)
        .ifPresent(
            row -> {
              row.setPaymentReference(reference);
              row.setPaymentProvider("stub");
              orders.save(row);
            });
    sales.settlementFailed(reference, "Card refuzat de banca emitentă (fonduri insuficiente).");
  }
}
