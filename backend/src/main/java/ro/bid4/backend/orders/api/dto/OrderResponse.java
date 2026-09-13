package ro.bid4.backend.orders.api.dto;

import java.time.Instant;
import java.util.UUID;
import ro.bid4.backend.orders.domain.OrderStatus;

/**
 * One sale, as either party sees it — the Order type in frontend/src/lib/types/order.ts.
 *
 * <p>This is what the thread's pending step is drawn from, entirely: what is being waited on comes
 * from {@link #status} and who may act on it from {@link #buyerId} and {@link #sellerId}. The event
 * items above it are a record and carry no controls at all, so nothing a forged or replayed item
 * could say produces a button — and pressing one is re-checked here anyway.
 *
 * <p>Flat on purpose. There is no nested auction, buyer, seller or cause here, so anything the UI
 * wants to name rather than reference comes from an event's frozen payload instead.
 */
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
    Instant releasedAt) {}
