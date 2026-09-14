package ro.bid4.backend.orders.api.dto;

import java.time.Instant;
import java.util.UUID;
import ro.bid4.backend.orders.domain.OrderStatus;

public record OrderResponse(
    UUID id,
    String reference,
    UUID auctionId,
    UUID buyerId,
    UUID sellerId,
    UUID causeId,
    OrderStatus status,
    long finalPrice,
    long platformTax,
    long shipping,
    long totalPaid,
    long donationAmount,
    short donationPercent,
    long sellerShare,
    DeliverySnapshotResponse deliveryMethod,
    String awb,
    String courier,
    Instant confirmationDeadline,
    Instant autoReleaseAt,
    String paymentFailureReason,
    Instant createdAt,
    Instant paidAt,
    Instant deliveredAt,
    Instant releasedAt,
    OrderListingResponse auction,
    OrderPartyResponse buyer,
    OrderPartyResponse seller,
    OrderCauseResponse cause,
    boolean hasOpenDispute) {}
