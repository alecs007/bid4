package ro.bid4.backend.catalog.api.dto;

import java.time.Instant;
import java.util.UUID;
import ro.bid4.backend.catalog.domain.BidStatus;

/**
 * One row of the public bid history — BidWithBidder in frontend/src/lib/types/auction.ts.
 *
 * <p>The history is pseudonymised: "Maria I.", never the full name. {@code bidderUsername} is left
 * empty for that reason — it is the handle the public profile route is built from, and returning it
 * beside a shortened name would undo the shortening. It stays in the shape because the frontend
 * type declares it; nothing renders it today.
 */
public record BidResponse(
    UUID id,
    UUID auctionId,
    UUID bidderId,
    long amount,
    Instant createdAt,
    BidStatus status,
    boolean triggeredExtension,
    String bidderDisplayName,
    String bidderAvatarUrl,
    String bidderUsername) {}
