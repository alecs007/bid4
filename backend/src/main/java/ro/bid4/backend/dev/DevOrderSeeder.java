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
import ro.bid4.backend.orders.domain.OrderStatus;
import ro.bid4.backend.orders.repo.OrderRepository;
import ro.bid4.backend.orders.service.OrderService;

/**
 * Sales for the demo accounts, one stopped at each stage.
 *
 * <p>Written by walking the real service rather than by inserting rows: every card in the thread,
 * every ledger entry and every status is produced by the code that produces them in production, so
 * the demo cannot drift from the thing it demonstrates. Insert the rows by hand and the first time
 * a step changes, the seed is a museum of how it used to work.
 *
 * <p>Maria is on both sides of it. She buys in half of these and sells in the other half, because
 * the two sides of a step read differently and a demo that only ever shows one of them hides half
 * of what was built.
 */
@Component
@Order(4)
@ConditionalOnProperty(name = "bid4.dev.seed", havingValue = "true")
public class DevOrderSeeder implements ApplicationRunner {

  private static final Logger log = LoggerFactory.getLogger(DevOrderSeeder.class);

  /** How far each seeded sale is walked. One per stage worth looking at. */
  private static final List<OrderStatus> STAGES =
      List.of(
          OrderStatus.AWAITING_CONFIRMATION,
          OrderStatus.AWAITING_PAYMENT,
          OrderStatus.PAID_HELD,
          OrderStatus.LABEL_GENERATED,
          OrderStatus.IN_TRANSIT,
          OrderStatus.DELIVERED,
          OrderStatus.COMPLETED,
          OrderStatus.DISPUTE_OPEN);

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
   * commit at the end quietly threw away all eight sales — which is exactly what it did.
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

    List<UserAccount> others =
        users.findAll().stream().filter(user -> !user.getId().equals(mariaId)).toList();
    if (others.isEmpty()) {
      return;
    }

    // Half where she buys, half where she sells.
    List<Auction> buying = listings(listing -> !listing.getSellerId().equals(mariaId));
    List<Auction> selling = listings(listing -> listing.getSellerId().equals(mariaId));

    int written = 0;
    Set<UUID> used = new HashSet<>();
    for (int index = 0; index < STAGES.size(); index++) {
      boolean asBuyer = index % 2 == 0;
      final List<Auction> pool = asBuyer ? buying : selling;

      // A listing carries one open sale at a time — a partial unique index says
      // so — and reusing one here handed a later stage the earlier stage's order
      // and then walked it from the wrong place.
      // The preferred side first, then whatever is left: running out of Maria's
      // own listings must not cost the demo its last two stages.
      Optional<Auction> free =
          pool.stream().filter(listing -> !used.contains(listing.getId())).findFirst();
      if (free.isEmpty()) {
        asBuyer = !asBuyer;
        free =
            (asBuyer ? buying : selling)
                .stream().filter(listing -> !used.contains(listing.getId())).findFirst();
      }
      if (free.isEmpty()) {
        continue;
      }
      Auction listing = free.get();
      UUID buyerId = asBuyer ? mariaId : others.get(index % others.size()).getId();
      if (buyerId.equals(listing.getSellerId())) {
        continue;
      }
      used.add(listing.getId());

      try {
        walk(listing, buyerId, STAGES.get(index));
        written++;
      } catch (RuntimeException failure) {
        // A seed is not worth a failed boot. One stage that cannot be reached —
        // a listing without a cause, an account without an address — should not
        // take the other seven with it.
        log.warn(
            "Development order seed: {} skipped ({})", STAGES.get(index), failure.getMessage());
      }
    }

    log.info("Development order seed: {} sales for the demo accounts", written);
  }

  private List<Auction> listings(java.util.function.Predicate<Auction> mine) {
    return auctions.findAll().stream()
        .filter(listing -> listing.getStatus() == AuctionStatus.LIVE)
        .filter(listing -> listing.getCauseId() != null)
        .filter(mine)
        .toList();
  }

  /** Opens a sale and moves it along until it is where it should stop. */
  private void walk(Auction listing, UUID buyerId, OrderStatus until) {
    Viewer buyer = Viewer.of(buyerId, false);
    Viewer seller = Viewer.of(listing.getSellerId(), false);

    var order = sales.open(listing, buyerId, listing.getCurrentPrice());
    UUID id = order.getId();
    if (until == OrderStatus.AWAITING_CONFIRMATION) {
      return;
    }

    DeliveryMethod address =
        deliveryMethods.findByUserIdOrderByCreatedAtAsc(buyerId).stream()
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("no delivery method for the buyer"));
    sales.chooseDelivery(id, address.getId(), buyer);
    if (until == OrderStatus.AWAITING_PAYMENT) {
      return;
    }

    sales.markPaid(id, buyer);
    if (until == OrderStatus.PAID_HELD) {
      return;
    }

    sales.generateLabel(id, seller);
    if (until == OrderStatus.LABEL_GENERATED) {
      return;
    }

    // From here the courier moves it, never a button — which is why these are
    // scans rather than calls the seller could make.
    sales.recordTracking(
        id, OrderStatus.DROPPED_OFF, "Colet preluat de curier", null, "seed-" + id);
    sales.recordTracking(
        id, OrderStatus.IN_TRANSIT, "Colet în tranzit", null, "seed-transit-" + id);
    if (until == OrderStatus.IN_TRANSIT) {
      return;
    }

    sales.recordTracking(id, OrderStatus.DELIVERED, "Colet livrat", null, "seed-delivered-" + id);
    if (until == OrderStatus.DELIVERED) {
      return;
    }

    if (until == OrderStatus.DISPUTE_OPEN) {
      sales.openDispute(id, "Produsul nu corespunde descrierii din anunț.", buyer);
      return;
    }

    sales.confirmReceipt(id, buyer);
  }
}
