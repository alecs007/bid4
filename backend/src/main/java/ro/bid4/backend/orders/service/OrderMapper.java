package ro.bid4.backend.orders.service;

import org.springframework.stereotype.Service;
import ro.bid4.backend.orders.api.dto.DeliverySnapshotResponse;
import ro.bid4.backend.orders.api.dto.OrderResponse;
import ro.bid4.backend.orders.api.dto.TrackingEventResponse;
import ro.bid4.backend.orders.domain.DeliverySnapshot;
import ro.bid4.backend.orders.domain.Order;
import ro.bid4.backend.orders.domain.OrderTrackingEvent;

/** Rows into the shape the thread and the order page are drawn from. */
@Service
public class OrderMapper {

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
}
