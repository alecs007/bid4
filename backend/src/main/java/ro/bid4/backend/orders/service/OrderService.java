package ro.bid4.backend.orders.service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.billing.domain.DocumentKind;
import ro.bid4.backend.billing.service.DocumentService;
import ro.bid4.backend.catalog.domain.Auction;
import ro.bid4.backend.cause.repo.CauseRepository;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.common.error.ErrorCode;
import ro.bid4.backend.common.web.Viewer;
import ro.bid4.backend.identity.domain.DeliveryMethod;
import ro.bid4.backend.identity.domain.DeliveryMethodType;
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
import ro.bid4.backend.payments.service.CheckoutSession;
import ro.bid4.backend.payments.service.PaymentGateway;
import ro.bid4.backend.payments.service.PaymentIntent;
import ro.bid4.backend.shipping.service.AwbIssued;
import ro.bid4.backend.shipping.service.CourierGateway;
import ro.bid4.backend.shipping.service.LabelDocument;
import ro.bid4.backend.shipping.service.Shipment;

@Service
public class OrderService {
  private static final Duration CONFIRMATION_WINDOW = Duration.ofDays(3);

  private static final Duration AUTO_RELEASE_WINDOW = Duration.ofDays(3);

  private static final int MAX_ORDERS_LISTED = 200;

  private final CauseRepository causes;
  private final OrderAgreementRepository agreements;
  private final OrderRepository orders;
  private final OrderTrackingRepository tracking;
  private final DeliveryMethodRepository deliveryMethods;
  private final ThreadEvents threads;
  private final OrderLedger books;
  private final CourierGateway courier;
  private final PaymentGateway payments;
  private final DocumentService files;

  public OrderService(
      CauseRepository causes,
      OrderAgreementRepository agreements,
      OrderRepository orders,
      OrderTrackingRepository tracking,
      DeliveryMethodRepository deliveryMethods,
      ThreadEvents threads,
      OrderLedger books,
      CourierGateway courier,
      PaymentGateway payments,
      DocumentService files) {
    this.causes = causes;
    this.agreements = agreements;
    this.orders = orders;
    this.tracking = tracking;
    this.deliveryMethods = deliveryMethods;
    this.threads = threads;
    this.books = books;
    this.courier = courier;
    this.payments = payments;
    this.files = files;
  }

  private void agree(Order order, UUID userId, AgreementKind kind) {
    if (agreements.existsByOrderIdAndUserIdAndKind(order.getId(), userId, kind)) {
      return;
    }
    agreements.save(OrderAgreement.of(order.getId(), userId, kind, Terms.CURRENT_VERSION));
  }

  @Transactional(readOnly = true)
  public List<OrderAgreement> agreementsFor(UUID orderId, Viewer viewer) {
    get(orderId, viewer);
    return agreements.findByOrderIdOrderByAcceptedAtAsc(orderId);
  }

  private String causeName(UUID causeId) {
    return causeId == null ? "" : causes.findById(causeId).map(cause -> cause.getName()).orElse("");
  }

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
            "cause", causeName(listing.getCauseId())));
    return saved;
  }

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
        Map.of(
            "method", method.getType().name(),
            "shipping", String.valueOf(shipping),
            "total", String.valueOf(order.getTotalPaid())));
    return order;
  }

  @Transactional
  public Settlement markPaid(UUID orderId, Viewer viewer) {
    Order order = load(orderId);
    requireBuyer(order, viewer);
    requireStatus(order, OrderStatus.AWAITING_PAYMENT, OrderStatus.PAYMENT_FAILED);

    CheckoutSession session =
        payments.open(
            new PaymentIntent(
                order.getReference(),
                order.getTotalPaid(),
                PaymentIntent.RON,
                "Comanda " + order.getReference(),
                null,
                null));
    order.setPaymentReference(session.providerReference());
    order.setPaymentProvider(payments.name());

    if (!payments.settlesImmediately()) {
      orders.save(order);
      return new Settlement(order, session.redirectUrl());
    }

    return new Settlement(settle(order), session.redirectUrl());
  }

  public record Settlement(Order order, String redirectUrl) {}

  @Transactional
  public Order settle(Order order) {
    if (order.getStatus() == OrderStatus.PAID_HELD) {
      return order;
    }
    requireStatus(order, OrderStatus.AWAITING_PAYMENT, OrderStatus.PAYMENT_FAILED);

    order.setStatus(OrderStatus.PAID_HELD);
    order.setPaidAt(Instant.now());
    order.setPaymentFailureReason(null);
    orders.save(order);

    books.recordPayment(order.getId(), order.getTotalPaid());

    agree(order, order.getBuyerId(), AgreementKind.PAYMENT);
    files.issue(order.getId(), DocumentKind.PROFORMA, order.getBuyerId(), order.getTotalPaid());

    post(
        conversationOf(order),
        order,
        OrderEvent.PAYMENT_HELD,
        "Plata a fost înregistrată și suma este păstrată de bid4.",
        Map.of("total", String.valueOf(order.getTotalPaid())));
    return order;
  }

  @Transactional
  public void settlementFailed(String paymentReference, String reason) {
    orders
        .findByPaymentReference(paymentReference)
        .ifPresent(
            order -> {
              if (order.getStatus() != OrderStatus.AWAITING_PAYMENT) {
                return;
              }
              order.setStatus(OrderStatus.PAYMENT_FAILED);
              order.setPaymentFailureReason(
                  reason == null || reason.isBlank() ? "Plata a fost refuzată." : reason);
              orders.save(order);
            });
  }

  @Transactional
  public Optional<Order> bySettlementReference(String paymentReference) {
    return orders.findByPaymentReference(paymentReference);
  }

  @Transactional
  public Order confirmReceipt(UUID orderId, Viewer viewer) {
    Order order = load(orderId);
    requireBuyer(order, viewer);
    requireStatus(order, OrderStatus.DELIVERED, OrderStatus.ARRIVED_AT_LOCKER);
    return release(order);
  }

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

    String by =
        viewer.is(order.getBuyerId())
            ? "BUYER"
            : viewer.is(order.getSellerId()) ? "SELLER" : "STAFF";

    String note = reason == null ? "" : reason.strip();
    Map<String, String> payload =
        note.isEmpty() ? Map.of("by", by) : Map.of("by", by, "reason", note);
    post(conversationOf(order), order, OrderEvent.CANCELLED, "Comanda a fost anulată.", payload);
    return order;
  }

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
          Map.of(
              "by", "SYSTEM",
              "reason", "Termenul pentru alegerea livrării a expirat."));
    }
    return stale.size();
  }

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

  private static Map<String, String> payload(String... pairs) {
    Map<String, String> values = new LinkedHashMap<>();
    for (int index = 0; index + 1 < pairs.length; index += 2) {
      if (!pairs[index + 1].isEmpty()) {
        values.put(pairs[index], pairs[index + 1]);
      }
    }
    return values;
  }

  @Transactional
  public Order generateLabel(UUID orderId, Viewer viewer) {
    Order order = load(orderId);
    requireSeller(order, viewer);
    requireStatus(order, OrderStatus.PAID_HELD);

    AwbIssued booked = courier.issue(shipmentFor(order));
    order.setAwb(booked.awb());
    order.setCourier(booked.courier());
    order.setStatus(OrderStatus.LABEL_GENERATED);
    agree(order, order.getSellerId(), AgreementKind.SHIPPING);
    files.issue(order.getId(), DocumentKind.SHIPPING_LABEL, order.getSellerId(), 0);

    post(
        conversationOf(order),
        order,
        OrderEvent.LABEL_READY,
        "Eticheta de expediere a fost emisă.",
        Map.of("awb", order.getAwb(), "courier", order.getCourier()));
    return order;
  }

  private Shipment shipmentFor(Order order) {
    DeliverySnapshot to = order.getDelivery();
    return new Shipment(
        order.getReference(),
        to == null ? DeliveryMethodType.EASYBOX : to.getType(),
        listingWeight(order),
        "",
        "",
        "",
        to == null ? "" : to.getRecipientName(),
        to == null ? "" : to.getPhone(),
        to == null ? null : to.getEasyboxLockerId(),
        to == null ? null : to.getStreet(),
        to == null ? null : to.getCity(),
        to == null ? null : to.getCounty(),
        to == null ? null : to.getPostalCode());
  }

  // TODO(shipping): read the listing's declared weight; this quotes the courier default.
  private int listingWeight(Order order) {
    return 500;
  }

  @Transactional
  public boolean applyCourierScan(
      String awb, OrderStatus status, String label, String location, String externalId) {
    Optional<Order> found = orders.findByAwb(awb);
    if (found.isEmpty()) {
      return false;
    }
    recordTracking(found.get().getId(), status, label, location, externalId);
    return true;
  }

  @Transactional(readOnly = true)
  public LabelDocument labelFor(UUID orderId, Viewer viewer) {
    Order order = get(orderId, viewer);
    if (!viewer.is(order.getSellerId()) && !viewer.staff()) {
      throw ApiException.forbidden("Eticheta este disponibilă vânzătorului.");
    }
    if (order.getAwb() == null) {
      throw new ApiException(ErrorCode.CONFLICT, "Eticheta nu a fost emisă încă.");
    }
    return courier.label(order.getAwb());
  }

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

    if (JOURNEY.indexOf(status) <= JOURNEY.indexOf(order.getStatus())) {
      return;
    }
    order.setStatus(status);

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
      order.setAutoReleaseAt(Instant.now().plus(AUTO_RELEASE_WINDOW));
      post(
          conversationOf(order),
          order,
          OrderEvent.DELIVERED,
          "Coletul a ajuns. Confirmă că e în regulă.",
          Map.of("deliveredAt", order.getDeliveredAt().toString()));
    }
  }

  @Transactional
  public int releaseWhatIsDue() {
    List<Order> due =
        orders.findByStatusAndAutoReleaseAtBefore(OrderStatus.DELIVERED, Instant.now());
    due.forEach(this::release);
    return due.size();
  }

  @Transactional(readOnly = true)
  public List<Order> forParty(String role, Viewer viewer) {
    if (viewer.isAnonymous()) {
      throw new ApiException(ErrorCode.UNAUTHENTICATED);
    }
    UUID me = viewer.id();
    return orders.findForParty(me, Limit.of(MAX_ORDERS_LISTED)).stream()
        .filter(
            order ->
                switch (role == null ? "" : role.toUpperCase()) {
                  case "BUYER" -> order.getBuyerId().equals(me);
                  case "SELLER" -> order.getSellerId().equals(me);
                  default -> true;
                })
        .toList();
  }

  @Transactional(readOnly = true)
  public Order get(UUID orderId, Viewer viewer) {
    Order order = load(orderId);
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

    books.recordRelease(
        order.getId(),
        order.getSellerId(),
        order.getCauseId(),
        order.getTotalPaid(),
        order.getDonationAmount(),
        order.getSellerShare(),
        order.getPlatformTax(),
        order.getShipping());

    files.issue(order.getId(), DocumentKind.INVOICE, order.getBuyerId(), order.getTotalPaid());
    files.issue(
        order.getId(), DocumentKind.PAYOUT_STATEMENT, order.getSellerId(), order.getSellerShare());

    post(
        conversationOf(order),
        order,
        OrderEvent.RELEASED,
        "Comanda s-a încheiat. Donația pleacă spre cauză.",
        Map.of(
            "donation", String.valueOf(order.getDonationAmount()),
            "sellerShare", String.valueOf(order.getSellerShare()),
            "cause", causeName(order.getCauseId())));
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

  private static void requireStatus(Order order, OrderStatus... allowed) {
    for (OrderStatus status : allowed) {
      if (order.getStatus() == status) {
        return;
      }
    }
    throw new ApiException(ErrorCode.CONFLICT, "Comanda nu mai este în acest pas.");
  }

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
}
