package ro.bid4.backend.orders.service;

import java.util.List;
import org.springframework.stereotype.Service;
import ro.bid4.backend.orders.api.dto.AgreementResponse;
import ro.bid4.backend.orders.api.dto.DeliverySnapshotResponse;
import ro.bid4.backend.orders.api.dto.OrderResponse;
import ro.bid4.backend.orders.api.dto.PaymentStartResponse;
import ro.bid4.backend.orders.api.dto.TrackingEventResponse;
import ro.bid4.backend.orders.domain.DeliverySnapshot;
import ro.bid4.backend.orders.domain.Order;
import ro.bid4.backend.orders.domain.OrderAgreement;
import ro.bid4.backend.orders.domain.OrderTrackingEvent;

/** Rows into the shape the thread and the order page are drawn from. */
@Service
public class OrderMapper {

  /**
   * The answer to a request to pay: the sale, and somewhere to send the buyer.
   *
   * <p>Mapped here rather than assembled in the controller so that nothing in the api layer has to
   * name an entity, which is a rule ArchUnit enforces.
   */
  public PaymentStartResponse toPaymentStart(OrderService.Settlement settlement) {
    return new PaymentStartResponse(toResponse(settlement.order()), settlement.redirectUrl());
  }

  public OrderResponse toResponse(Order order) {
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
        order.getReleasedAt());
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
