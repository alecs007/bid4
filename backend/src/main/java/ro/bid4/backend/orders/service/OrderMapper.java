package ro.bid4.backend.orders.service;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.catalog.repo.AuctionRepository;
import ro.bid4.backend.cause.repo.CauseRepository;
import ro.bid4.backend.identity.repo.UserAccountRepository;
import ro.bid4.backend.orders.api.dto.AgreementResponse;
import ro.bid4.backend.orders.api.dto.DeliverySnapshotResponse;
import ro.bid4.backend.orders.api.dto.OrderCauseResponse;
import ro.bid4.backend.orders.api.dto.OrderListingResponse;
import ro.bid4.backend.orders.api.dto.OrderPartyResponse;
import ro.bid4.backend.orders.api.dto.OrderResponse;
import ro.bid4.backend.orders.api.dto.PaymentStartResponse;
import ro.bid4.backend.orders.api.dto.TrackingEventResponse;
import ro.bid4.backend.orders.domain.DeliverySnapshot;
import ro.bid4.backend.orders.domain.Order;
import ro.bid4.backend.orders.domain.OrderAgreement;
import ro.bid4.backend.orders.domain.OrderStatus;
import ro.bid4.backend.orders.domain.OrderTrackingEvent;

/**
 * Rows into the shape the thread and the order page are drawn from.
 *
 * <p>It reads three other features to fill the summaries an order response carries — the listing,
 * the two accounts and the cause. That is a read of four tables per order, and for a list of them
 * it is a read per row: fine at the size a person's own order list is, and the first thing to batch
 * if a page ever shows hundreds.
 */
@Service
public class OrderMapper {

  private final AuctionRepository auctions;
  private final UserAccountRepository users;
  private final CauseRepository causes;

  public OrderMapper(
      AuctionRepository auctions, UserAccountRepository users, CauseRepository causes) {
    this.auctions = auctions;
    this.users = users;
    this.causes = causes;
  }

  /**
   * The answer to a request to pay: the sale, and somewhere to send the buyer.
   *
   * <p>Mapped here rather than assembled in the controller so that nothing in the api layer has to
   * name an entity, which is a rule ArchUnit enforces.
   */
  @Transactional(readOnly = true)
  public PaymentStartResponse toPaymentStart(OrderService.Settlement settlement) {
    return new PaymentStartResponse(map(settlement.order()), settlement.redirectUrl());
  }

  /**
   * Every sale in one transaction, for a list.
   *
   * <p>The controller mapped row by row, which opened a transaction per order. One boundary around
   * the whole list is both correct and fewer round trips.
   */
  @Transactional(readOnly = true)
  public List<OrderResponse> toResponses(List<Order> orders) {
    return orders.stream().map(this::map).toList();
  }

  /**
   * One sale, with a transaction of its own.
   *
   * <p>Annotated because the mapper is called from the controller, after the service's transaction
   * has already committed. {@code Auction.images} is a lazy element collection, so reading it out
   * there threw LazyInitializationException while Jackson was already writing the response — a 500
   * on every order screen, and an empty page with nothing in it to read.
   */
  @Transactional(readOnly = true)
  public OrderResponse toResponse(Order order) {
    return map(order);
  }

  /**
   * The mapping itself, unannotated, so each entry point above chooses its own boundary.
   *
   * <p>Calling a {@code @Transactional} method on {@code this} goes straight past the proxy and so
   * past the transaction, which is precisely the bug this note exists to stop somebody
   * reintroducing.
   */
  private OrderResponse map(Order order) {
    return new OrderResponse(
        order.getId(),
        order.getReference(),
        order.getAuctionId(),
        order.getBuyerId(),
        order.getSellerId(),
        order.getCauseId(),
        order.getStatus(),
        order.getFinalPrice(),
        order.getPlatformTax(),
        order.getShipping(),
        order.getTotalPaid(),
        order.getDonationAmount(),
        order.getDonationPercent(),
        order.getSellerShare(),
        toDelivery(order.getDelivery()),
        order.getAwb(),
        order.getCourier(),
        order.getConfirmationDeadline(),
        order.getAutoReleaseAt(),
        order.getPaymentFailureReason(),
        order.getCreatedAt(),
        order.getPaidAt(),
        order.getDeliveredAt(),
        order.getReleasedAt(),
        listingOf(order.getAuctionId()),
        partyOf(order.getBuyerId()),
        partyOf(order.getSellerId()),
        causeOf(order.getCauseId()),
        order.getStatus() == OrderStatus.DISPUTE_OPEN);
  }

  /**
   * The three summaries, each degrading to null rather than throwing.
   *
   * <p>A listing or a cause can be withdrawn after a sale; an account can be closed. None of that
   * invalidates the order, which is exactly the record somebody would then be looking for, so a
   * missing join leaves a gap on the page instead of a 500.
   */
  private OrderListingResponse listingOf(UUID auctionId) {
    if (auctionId == null) {
      return null;
    }
    return auctions
        .findById(auctionId)
        .map(
            listing ->
                new OrderListingResponse(
                    listing.getId(),
                    listing.getTitle(),
                    // Copied, not handed over. The response outlives the
                    // transaction, and a Hibernate collection proxy that
                    // escapes one cannot be read: Jackson threw
                    // LazyInitializationException mid-write, which surfaced as
                    // a 500 on every order screen.
                    List.copyOf(listing.getImages())))
        .orElse(null);
  }

  private OrderPartyResponse partyOf(UUID userId) {
    if (userId == null) {
      return null;
    }
    return users
        .findById(userId)
        .map(
            account ->
                new OrderPartyResponse(
                    account.getId(),
                    account.getDisplayName(),
                    account.getUsername(),
                    account.getAvatarUrl(),
                    account.getAccountType(),
                    account.isVerified()))
        .orElse(null);
  }

  private OrderCauseResponse causeOf(UUID causeId) {
    if (causeId == null) {
      return null;
    }
    return causes
        .findById(causeId)
        .map(
            cause ->
                new OrderCauseResponse(
                    cause.getId(), cause.getName(), cause.getSlug(), cause.getImageUrl()))
        .orElse(null);
  }

  public TrackingEventResponse toTracking(OrderTrackingEvent event) {
    return new TrackingEventResponse(
        event.getId(), event.getStatus(), event.getLabel(), event.getLocation(), event.getAt());
  }

  /**
   * Null until the buyer has chosen.
   *
   * <p>An embeddable whose columns are all null still arrives as an object, so the type is what
   * says whether anything was ever set.
   */
  private DeliverySnapshotResponse toDelivery(DeliverySnapshot delivery) {
    if (delivery == null || delivery.getType() == null) {
      return null;
    }
    return new DeliverySnapshotResponse(
        delivery.getType(),
        delivery.getLabel(),
        delivery.getEasyboxLockerId(),
        delivery.getLockerName(),
        delivery.getLockerAddress(),
        delivery.getRecipientName(),
        delivery.getStreet(),
        delivery.getCity(),
        delivery.getCounty(),
        delivery.getPostalCode(),
        delivery.getAddressDetails(),
        delivery.getPhone());
  }

  /**
   * The acceptances, as the order page shows them.
   *
   * <p>Mapped here rather than in the controller: reading an entity's getters from {@code ..api} is
   * exactly what the architecture rule forbids, and the reason it forbids it is that a route which
   * knows the shape of a table row will eventually bind a request onto one.
   */
  public List<AgreementResponse> toAgreements(List<OrderAgreement> rows) {
    return rows.stream()
        .map(
            row -> new AgreementResponse(row.getKind(), row.getTermsVersion(), row.getAcceptedAt()))
        .toList();
  }
}
