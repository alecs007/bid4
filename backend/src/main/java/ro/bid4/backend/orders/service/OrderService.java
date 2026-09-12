package ro.bid4.backend.orders.service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.catalog.domain.Auction;
import ro.bid4.backend.cause.repo.CauseRepository;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.common.error.ErrorCode;
import ro.bid4.backend.common.web.Viewer;
import ro.bid4.backend.identity.domain.DeliveryMethod;
import ro.bid4.backend.identity.repo.DeliveryMethodRepository;
import ro.bid4.backend.inbox.service.ThreadEvents;
import ro.bid4.backend.ledger.service.OrderLedger;
import ro.bid4.backend.orders.domain.AgreementKind;
import ro.bid4.backend.orders.domain.DeliverySnapshot;
import ro.bid4.backend.orders.domain.DisputeOutcome;
import ro.bid4.backend.orders.domain.Order;
import ro.bid4.backend.orders.domain.OrderAgreement;
import ro.bid4.backend.orders.domain.OrderEvent;
import ro.bid4.backend.orders.domain.OrderStatus;
import ro.bid4.backend.orders.domain.OrderTrackingEvent;
import ro.bid4.backend.orders.repo.OrderAgreementRepository;
import ro.bid4.backend.orders.repo.OrderRepository;
import ro.bid4.backend.orders.repo.OrderTrackingRepository;

/**
 * The sale, from acceptance to release.
 *
 * <p>Every method here does the same three things in the same order: check that the caller is the
 * party whose turn it is, move the row, then write the step into the thread. The check comes from
 * {@link Order#getStatus()} and from the caller's id, never from anything the request said and
 * never from an item in a conversation — which is what makes the thread safe to render as a set of
 * buttons.
 *
 * <p>Nothing here charges anybody. {@link #markPaid} is where a payment provider goes in phase
 * three; today it is an endpoint that says the money arrived, so the rest of the machine can be
 * built and tested without one.
 *
 * <p>The three statuses in the middle of the journey are not reachable from here at all.
 * IN_TRANSIT, ARRIVED_AT_LOCKER and DELIVERED come from the courier through {@link
 * #recordTracking}, because neither party should be able to claim a parcel moved.
 */
@Service
public class OrderService {

  /** How long a winner has to say where it goes before the seller may take it back. */
  private static final Duration CONFIRMATION_WINDOW = Duration.ofDays(3);

  /** How long a buyer has to complain after delivery before the money releases itself. */
  private static final Duration AUTO_RELEASE_WINDOW = Duration.ofDays(3);

  private final CauseRepository causes;
  private final OrderAgreementRepository agreements;
  private final OrderRepository orders;
  private final OrderTrackingRepository tracking;
  private final DeliveryMethodRepository deliveryMethods;
  private final ThreadEvents threads;
  private final OrderLedger books;

  public OrderService(
      CauseRepository causes,
      OrderAgreementRepository agreements,
      OrderRepository orders,
      OrderTrackingRepository tracking,
      DeliveryMethodRepository deliveryMethods,
      ThreadEvents threads,
      OrderLedger books) {
    this.causes = causes;
    this.agreements = agreements;
    this.orders = orders;
    this.tracking = tracking;
    this.deliveryMethods = deliveryMethods;
    this.threads = threads;
    this.books = books;
  }

  /**
   * Records that a party accepted the terms governing the step they are taking.
   *
   * <p>Written in the same transaction as the act itself, so there is no state in which somebody
   * has paid without having agreed to the terms of paying — and skipped silently if it is already
   * there, because a retried step is not a second promise.
   */
  private void agree(Order order, UUID userId, AgreementKind kind) {
    if (agreements.existsByOrderIdAndUserIdAndKind(order.getId(), userId, kind)) {
      return;
    }
    agreements.save(OrderAgreement.of(order.getId(), userId, kind, Terms.CURRENT_VERSION));
  }

  /** Everything a party agreed to on this sale, oldest first. */
  @Transactional(readOnly = true)
  public List<OrderAgreement> agreementsFor(UUID orderId, Viewer viewer) {
    get(orderId, viewer);
    return agreements.findByOrderIdOrderByAcceptedAtAsc(orderId);
  }

  /** The cause this sale gives to, by name. Empty rather than absent if it has gone. */
  private String causeName(UUID causeId) {
    return causeId == null ? "" : causes.findById(causeId).map(cause -> cause.getName()).orElse("");
  }

  // ---------------------------------------------------------------------------------------------
  // Opening
  // ---------------------------------------------------------------------------------------------

  /**
   * Called when a seller accepts an offer.
   *
   * <p>Not an endpoint. The acceptance is the catalogue's business and this is what falls out of
   * it, so the two are one transaction: an order without its acceptance, or an acceptance without
   * its order, is a listing nobody can act on.
   *
   * <p>Idempotent. A retry finds the open order and returns it rather than opening a second sale
   * for the same listing — and if it somehow got past that, a partial unique index refuses it.
   */
  @Transactional
  public Order open(Auction listing, UUID buyerId, long acceptedPrice) {
    return orders
        .findOpenForAuction(listing.getId())
        .orElseGet(() -> create(listing, buyerId, acceptedPrice));
  }

  private Order create(Auction listing, UUID buyerId, long acceptedPrice) {
    Fees.Breakdown fees = Fees.compute(acceptedPrice, listing.getDonationPercent(), 0);

    Order order = new Order();
    order.setReference(nextReference());
    order.setAuctionId(listing.getId());
    order.setBuyerId(buyerId);
    order.setSellerId(listing.getSellerId());
    order.setCauseId(listing.getCauseId());
    order.setStatus(OrderStatus.AWAITING_CONFIRMATION);

    order.setFinalPrice(fees.finalPrice());
    order.setPlatformTax(fees.buyerTax());
    order.setShipping(0);
    order.setTotalPaid(fees.buyerTotal());
    order.setDonationAmount(fees.donationAmount());
    order.setDonationPercent(fees.donationPercent());
    order.setSellerShare(fees.sellerShare());
    order.setConfirmationDeadline(Instant.now().plus(CONFIRMATION_WINDOW));

    Order saved = orders.save(order);

    UUID conversationId =
        threads.ensureThread(listing.getId(), buyerId, listing.getSellerId()).getId();
    threads.attachOrder(conversationId, saved.getId());
    post(
        conversationId,
        saved,
        OrderEvent.OFFER_ACCEPTED,
        "Oferta a fost acceptată.",
        Map.of(
            "price", String.valueOf(saved.getFinalPrice()),
            "donation", String.valueOf(saved.getDonationAmount()),
            "donationPercent", String.valueOf(saved.getDonationPercent()),
            // Named, not "către cauză". The cause is the reason the buyer paid
            // above the asking price, and it is the one figure in this card
            // worth being specific about.
            "cause", causeName(listing.getCauseId())));
    return saved;
  }

  // ---------------------------------------------------------------------------------------------
  // The buyer's turns
  // ---------------------------------------------------------------------------------------------

  /** Where it goes. Copied rather than referenced — see {@link DeliverySnapshot}. */
  @Transactional
  public Order chooseDelivery(UUID orderId, UUID deliveryMethodId, Viewer viewer) {
    Order order = load(orderId);
    requireBuyer(order, viewer);
    requireStatus(order, OrderStatus.AWAITING_CONFIRMATION);

    DeliveryMethod method =
        deliveryMethods
            .findById(deliveryMethodId)
            .filter(row -> row.getUserId().equals(order.getBuyerId()))
            .orElseThrow(
                () ->
                    new ApiException(
                        ErrorCode.VALIDATION_FAILED, "Adresa de livrare nu a fost găsită."));

    long shipping = ShippingPrices.forType(method.getType());
    order.setDelivery(DeliverySnapshot.of(method));
    order.setShipping(shipping);
    order.setTotalPaid(order.getFinalPrice() + order.getPlatformTax() + shipping);
    order.setStatus(OrderStatus.AWAITING_PAYMENT);
    order.setConfirmationDeadline(null);
    agree(order, order.getBuyerId(), AgreementKind.SALE);

    post(
        conversationOf(order),
        order,
        OrderEvent.DELIVERY_CHOSEN,
        "Livrarea a fost aleasă.",
        // The method, not the place. The seller has no business knowing which
        // locker a buyer collects from, and a card that names it puts a home
        // address or a neighbourhood into a conversation that both sides keep.
        Map.of(
            "method", method.getType().name(),
            "shipping", String.valueOf(shipping),
            "total", String.valueOf(order.getTotalPaid())));
    return order;
  }

  /**
   * The money has arrived and is held by bid4.
   *
   * <p>Phase three replaces the inside of this with a payment provider; the shape does not change,
   * because what the rest of the machine needs to know is that the funds are held and belong to
   * nobody yet.
   */
  @Transactional
  public Order markPaid(UUID orderId, Viewer viewer) {
    Order order = load(orderId);
    requireBuyer(order, viewer);
    requireStatus(order, OrderStatus.AWAITING_PAYMENT, OrderStatus.PAYMENT_FAILED);

    order.setStatus(OrderStatus.PAID_HELD);
    order.setPaidAt(Instant.now());
    order.setPaymentFailureReason(null);

    // Into escrow, whole. Not a leu of it belongs to anybody yet — which is what
    // the promise on the listing page actually means.
    books.recordPayment(order.getId(), order.getTotalPaid());

    agree(order, order.getBuyerId(), AgreementKind.PAYMENT);

    post(
        conversationOf(order),
        order,
        OrderEvent.PAYMENT_HELD,
        "Plata a fost primită și este ținută în siguranță.",
        Map.of("total", String.valueOf(order.getTotalPaid())));
    return order;
  }

  /** The parcel arrived and is what it was supposed to be. This is what releases the money. */
  @Transactional
  public Order confirmReceipt(UUID orderId, Viewer viewer) {
    Order order = load(orderId);
    requireBuyer(order, viewer);
    requireStatus(order, OrderStatus.DELIVERED, OrderStatus.ARRIVED_AT_LOCKER);
    return release(order);
  }

  /**
   * Something is wrong with what arrived.
   *
   * <p>The buyer's half of the protection: the money is already held by bid4 and this is what stops
   * it moving. Releasing needs a confirmation that never comes while a dispute is open, and the
   * deadline that would otherwise release it on the buyer's behalf is cleared here — so a parcel
   * somebody has objected to cannot pay itself out by running out of time.
   *
   * <p>Only between paying and completing. Before the money is in there is nothing to protect, and
   * after it is released there is nothing left to hold.
   */
  @Transactional
  public Order openDispute(UUID orderId, String reason, Viewer viewer) {
    Order order = load(orderId);
    requireBuyer(order, viewer);
    if (!order.getStatus().isPaid() || order.getStatus().isFinished()) {
      throw new ApiException(
          ErrorCode.CONFLICT, "Comanda nu se află într-o etapă în care poate fi contestată.");
    }
    if (order.getStatus() == OrderStatus.DISPUTE_OPEN) {
      return order;
    }

    order.setStatus(OrderStatus.DISPUTE_OPEN);
    // Nothing releases itself while this is open.
    order.setConfirmationDeadline(null);

    String note = reason == null ? "" : reason.strip();
    post(
        conversationOf(order),
        order,
        OrderEvent.DISPUTE_OPENED,
        "Cumpărătorul a semnalat o problemă cu această comandă.",
        note.isEmpty() ? Map.of() : Map.of("reason", note));
    return order;
  }

  /**
   * Either party walks away, before any money has been taken.
   *
   * <p>Only while the escrow is empty. Once it is funded, walking away is a dispute and an
   * operator's decision — a seller who could cancel a paid order at will could take a buyer's money
   * out of reach of the protection that was the point of holding it.
   */
  @Transactional
  public Order cancel(UUID orderId, String reason, Viewer viewer) {
    Order order = load(orderId);
    if (!order.isParty(viewer.id()) && !viewer.staff()) {
      throw new ApiException(ErrorCode.NOT_FOUND, "Comanda nu a fost găsită.");
    }
    if (order.getStatus() == OrderStatus.CANCELLED) {
      return order;
    }
    requireStatus(
        order,
        OrderStatus.AWAITING_CONFIRMATION,
        OrderStatus.AWAITING_PAYMENT,
        OrderStatus.PAYMENT_FAILED);

    order.setStatus(OrderStatus.CANCELLED);
    order.setConfirmationDeadline(null);
    orders.save(order);

    String note = reason == null ? "" : reason.strip();
    post(
        conversationOf(order),
        order,
        OrderEvent.CANCELLED,
        "Comanda a fost anulată.",
        note.isEmpty() ? Map.of() : Map.of("reason", note));
    return order;
  }

  /**
   * Orders nobody came back to, closed rather than left open forever.
   *
   * <p>The mirror of {@link #releaseWhatIsDue()}: one clock pays a seller whose buyer went quiet
   * after delivery, this one releases a listing whose buyer never said where to send it. Nothing
   * has been paid at this point, so there is no money to move — only a sale to close and a seller
   * to set free.
   */
  @Transactional
  public int cancelWhatHasLapsed() {
    List<Order> stale =
        orders.findByStatusAndConfirmationDeadlineBefore(
            OrderStatus.AWAITING_CONFIRMATION, Instant.now());

    for (Order order : stale) {
      order.setStatus(OrderStatus.CANCELLED);
      order.setConfirmationDeadline(null);
      orders.save(order);
      post(
          conversationOf(order),
          order,
          OrderEvent.CANCELLED,
          "Comanda a fost anulată automat.",
          Map.of("reason", "Termenul pentru alegerea livrării a expirat."));
    }
    return stale.size();
  }

  /**
   * An operator settles a dispute, one way or the other.
   *
   * <p>The only exit from {@link OrderStatus#DISPUTE_OPEN}, and deliberately not the buyer's or the
   * seller's — the whole point of freezing the money was that neither of them decides alone.
   *
   * <p>Two outcomes for now. A refund takes the whole amount back out of escrow the way it came in;
   * a release divides it exactly as a confirmed delivery would. Partial splits are a third case
   * that needs an operator screen to enter an amount into, and the ledger would need a release that
   * is not the standard four-way — so it is deliberately absent rather than half-built.
   */
  @Transactional
  public Order resolveDispute(UUID orderId, DisputeOutcome outcome, String note, Viewer viewer) {
    if (!viewer.staff()) {
      throw ApiException.forbidden("Doar echipa bid4 poate soluționa o sesizare.");
    }
    Order order = load(orderId);
    requireStatus(order, OrderStatus.DISPUTE_OPEN);

    String decision = note == null ? "" : note.strip();
    if (outcome == DisputeOutcome.REFUND) {
      books.recordRefund(order.getId(), order.getTotalPaid());
      order.setStatus(OrderStatus.REFUNDED);
      order.setAutoReleaseAt(null);
      // Saved rather than left to dirty checking: these paths load the order and
      // hand it straight back, and the change did not reach the database on its
      // own. Explicit is cheap and the money here is not worth the subtlety.
      orders.save(order);
      post(
          conversationOf(order),
          order,
          OrderEvent.DISPUTE_RESOLVED,
          "Sesizarea a fost soluționată cu returnarea sumei.",
          payload(
              "outcome",
              "REFUND",
              "total",
              String.valueOf(order.getTotalPaid()),
              "note",
              decision));
      return order;
    }

    Order released = orders.save(release(order));
    post(
        conversationOf(released),
        released,
        OrderEvent.DISPUTE_RESOLVED,
        "Sesizarea a fost soluționată în favoarea livrării.",
        payload(
            "outcome",
            "RELEASE",
            "sellerShare",
            String.valueOf(released.getSellerShare()),
            "note",
            decision));
    return released;
  }

  /** Drops the pairs whose value is empty, so a card never shows a label with nothing after it. */
  private static Map<String, String> payload(String... pairs) {
    Map<String, String> values = new LinkedHashMap<>();
    for (int index = 0; index + 1 < pairs.length; index += 2) {
      if (!pairs[index + 1].isEmpty()) {
        values.put(pairs[index], pairs[index + 1]);
      }
    }
    return values;
  }

  // ---------------------------------------------------------------------------------------------
  // The seller's turns
  // ---------------------------------------------------------------------------------------------

  /**
   * There is an AWB.
   *
   * <p>Phase four asks a courier for it. Until then the number is minted here, which is enough for
   * the thread and the label to be built and read.
   */
  @Transactional
  public Order generateLabel(UUID orderId, Viewer viewer) {
    Order order = load(orderId);
    requireSeller(order, viewer);
    requireStatus(order, OrderStatus.PAID_HELD);

    order.setAwb(nextAwb());
    order.setCourier("Sameday");
    order.setStatus(OrderStatus.LABEL_GENERATED);
    agree(order, order.getSellerId(), AgreementKind.SHIPPING);

    post(
        conversationOf(order),
        order,
        OrderEvent.LABEL_READY,
        "Eticheta de expediere este gata.",
        Map.of("awb", order.getAwb(), "courier", order.getCourier()));
    return order;
  }

  /** Handed to the courier. The last thing either party declares about the journey. */
  @Transactional
  public Order markDroppedOff(UUID orderId, Viewer viewer) {
    Order order = load(orderId);
    requireSeller(order, viewer);
    requireStatus(order, OrderStatus.LABEL_GENERATED);

    order.setStatus(OrderStatus.DROPPED_OFF);
    tracking.save(
        OrderTrackingEvent.of(order.getId(), OrderStatus.DROPPED_OFF, "Predat curierului"));

    post(
        conversationOf(order),
        order,
        OrderEvent.SHIPPED,
        "Coletul a fost predat curierului.",
        Map.of("awb", order.getAwb() == null ? "" : order.getAwb()));
    return order;
  }

  // ---------------------------------------------------------------------------------------------
  // The courier's turns
  // ---------------------------------------------------------------------------------------------

  /**
   * A scan.
   *
   * <p>Not reachable by either party, and idempotent on the courier's own id for the event, so a
   * webhook delivered twice moves the parcel once.
   */
  @Transactional
  public void recordTracking(
      UUID orderId, OrderStatus status, String label, String location, String externalId) {

    if (externalId != null && tracking.existsByExternalId(externalId)) {
      return;
    }
    Order order = load(orderId);

    OrderTrackingEvent event = OrderTrackingEvent.of(orderId, status, label);
    event.setLocation(location);
    event.setExternalId(externalId);
    tracking.save(event);

    // The journey may report out of order; the order's own status only ever
    // moves forward along it.
    if (JOURNEY.indexOf(status) <= JOURNEY.indexOf(order.getStatus())) {
      return;
    }
    order.setStatus(status);

    // The courier has it. This card used to be written by the seller pressing
    // "am predat coletul", which was never theirs to declare — so it is written
    // by the scan that actually proves it instead.
    if (status == OrderStatus.DROPPED_OFF) {
      post(
          conversationOf(order),
          order,
          OrderEvent.SHIPPED,
          "Coletul a fost preluat de curier.",
          Map.of("awb", order.getAwb() == null ? "" : order.getAwb()));
    }

    if (status == OrderStatus.DELIVERED) {
      order.setDeliveredAt(Instant.now());
      // The clock the buyer's silence runs down. Somebody who never comes back
      // must not leave a seller unpaid for ever.
      order.setAutoReleaseAt(Instant.now().plus(AUTO_RELEASE_WINDOW));
      post(
          conversationOf(order),
          order,
          OrderEvent.DELIVERED,
          "Coletul a ajuns. Confirmă că e în regulă.",
          Map.of("deliveredAt", order.getDeliveredAt().toString()));
    }
  }

  /** The buyer said nothing for long enough. Called by a scheduled job, never by a request. */
  @Transactional
  public int releaseWhatIsDue() {
    List<Order> due =
        orders.findByStatusAndAutoReleaseAtBefore(OrderStatus.DELIVERED, Instant.now());
    due.forEach(this::release);
    return due.size();
  }

  // ---------------------------------------------------------------------------------------------
  // Reading
  // ---------------------------------------------------------------------------------------------

  @Transactional(readOnly = true)
  public Order get(UUID orderId, Viewer viewer) {
    Order order = load(orderId);
    // 404 rather than 403, like the inbox: a refusal that tells them the id is
    // real is a refusal worth probing.
    if (!order.isParty(viewer.id()) && !viewer.staff()) {
      throw new ApiException(ErrorCode.NOT_FOUND, "Comanda nu a fost găsită.");
    }
    return order;
  }

  @Transactional(readOnly = true)
  public List<OrderTrackingEvent> trackingFor(UUID orderId, Viewer viewer) {
    get(orderId, viewer);
    return tracking.findByOrderIdOrderByAtDesc(orderId);
  }

  // ---------------------------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------------------------

  /** The order the journey runs in, so a late scan cannot walk a parcel backwards. */
  private static final List<OrderStatus> JOURNEY =
      List.of(
          OrderStatus.PAID_HELD,
          OrderStatus.LABEL_GENERATED,
          OrderStatus.DROPPED_OFF,
          OrderStatus.IN_TRANSIT,
          OrderStatus.ARRIVED_AT_LOCKER,
          OrderStatus.DELIVERED);

  private Order release(Order order) {
    order.setStatus(OrderStatus.COMPLETED);
    order.setReleasedAt(Instant.now());
    order.setAutoReleaseAt(null);

    // Escrow empties into four places at once, and the four add up to what was
    // paid. Idempotent on the order, so a retried release moves nothing twice.
    books.recordRelease(
        order.getId(),
        order.getSellerId(),
        order.getCauseId(),
        order.getTotalPaid(),
        order.getDonationAmount(),
        order.getSellerShare(),
        order.getPlatformTax(),
        order.getShipping());

    post(
        conversationOf(order),
        order,
        OrderEvent.RELEASED,
        "Comanda s-a încheiat. Donația pleacă spre cauză.",
        Map.of(
            "donation", String.valueOf(order.getDonationAmount()),
            "sellerShare", String.valueOf(order.getSellerShare())));
    return order;
  }

  private void post(
      UUID conversationId,
      Order order,
      OrderEvent event,
      String body,
      Map<String, String> payload) {
    threads.post(
        conversationId, order.getId(), event.name(), order.getStatus().name(), body, payload);
  }

  private UUID conversationOf(Order order) {
    return threads
        .ensureThread(order.getAuctionId(), order.getBuyerId(), order.getSellerId())
        .getId();
  }

  private Order load(UUID orderId) {
    return orders
        .findById(orderId)
        .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Comanda nu a fost găsită."));
  }

  private static void requireBuyer(Order order, Viewer viewer) {
    if (viewer.isAnonymous() || !order.isBuyer(viewer.id())) {
      throw new ApiException(ErrorCode.FORBIDDEN, "Doar cumpărătorul poate face asta.");
    }
  }

  private static void requireSeller(Order order, Viewer viewer) {
    if (viewer.isAnonymous() || !order.isSeller(viewer.id())) {
      throw new ApiException(ErrorCode.FORBIDDEN, "Doar vânzătorul poate face asta.");
    }
  }

  /**
   * Whose turn it is, and when.
   *
   * <p>A CONFLICT rather than a validation failure: the request was well formed and the caller was
   * entitled to make it — it simply arrived after somebody else had already moved the sale on.
   */
  private static void requireStatus(Order order, OrderStatus... allowed) {
    for (OrderStatus status : allowed) {
      if (order.getStatus() == status) {
        return;
      }
    }
    throw new ApiException(ErrorCode.CONFLICT, "Comanda nu mai este în acest pas.");
  }

  /** CMD-2026-0417, and unique. Retried rather than sequenced, because collisions are rare. */
  private String nextReference() {
    for (int attempt = 0; attempt < 8; attempt++) {
      String candidate =
          "CMD-%d-%04d"
              .formatted(
                  LocalDate.now(ZoneOffset.UTC).getYear(),
                  ThreadLocalRandom.current().nextInt(10_000));
      if (!orders.existsByReference(candidate)) {
        return candidate;
      }
    }
    throw new ApiException(ErrorCode.INTERNAL, "Comanda nu a putut fi creată.");
  }

  private static String nextAwb() {
    return "SMD%011d".formatted(ThreadLocalRandom.current().nextLong(100_000_000_000L));
  }
}
