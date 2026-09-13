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
 * <p>It carries slim summaries of the auction, the two parties and the cause, because every screen
 * that draws an order needs to name them and a page holding only ids cannot. Each one is a subset,
 * not the whole object: the full auction carries the seller's reserve, and a full profile carries
 * things the other party has no business with.
 *
 * <p>This response was flat, and both order screens were written against a frontend type that
 * claimed otherwise — so they worked against the mock world and threw against this. If a field is
 * added to the type in `lib/types/order.ts`, it is added here in the same change.
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
    Instant releasedAt,
    OrderListingResponse auction,
    OrderPartyResponse buyer,
    OrderPartyResponse seller,
    OrderCauseResponse cause,
    boolean hasOpenDispute) {}
