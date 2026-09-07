package ro.bid4.backend.orders.api.dto;

import java.time.Instant;
import java.util.UUID;
import ro.bid4.backend.orders.domain.OrderStatus;

/**
 * One sale, as either party sees it — the Order type in frontend/src/lib/types/order.ts.
 *
 * <p>This is what the thread's live card is drawn from. The client works out which step is being
 * waited on by comparing an event item's frozen status against {@link #status} here, and who may
 * press it from {@link #buyerId} and {@link #sellerId} — so the answer always comes from the order
 * rather than from the item, and pressing anything is re-checked here anyway.
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
