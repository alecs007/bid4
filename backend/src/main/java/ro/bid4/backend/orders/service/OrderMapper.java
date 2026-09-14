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

  @Transactional(readOnly = true)
  public PaymentStartResponse toPaymentStart(OrderService.Settlement settlement) {
    return new PaymentStartResponse(map(settlement.order()), settlement.redirectUrl());
  }

  @Transactional(readOnly = true)
  public List<OrderResponse> toResponses(List<Order> orders) {
    return orders.stream().map(this::map).toList();
  }

  @Transactional(readOnly = true)
  public OrderResponse toResponse(Order order) {
    return map(order);
  }

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

  private OrderListingResponse listingOf(UUID auctionId) {
    if (auctionId == null) {
      return null;
    }
    return auctions
        .findById(auctionId)
        .map(
            listing ->
                new OrderListingResponse(
                    listing.getId(), listing.getTitle(), List.copyOf(listing.getImages())))
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

  public List<AgreementResponse> toAgreements(List<OrderAgreement> rows) {
    return rows.stream()
        .map(
            row -> new AgreementResponse(row.getKind(), row.getTermsVersion(), row.getAcceptedAt()))
        .toList();
  }
}
