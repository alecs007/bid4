package ro.bid4.backend.catalog.api.dto;

import java.time.Instant;
import java.util.UUID;
import ro.bid4.backend.catalog.domain.BidStatus;

public record BidResponse(
    UUID id,
    UUID auctionId,
    UUID bidderId,
    long amount,
    Instant createdAt,
    BidStatus status,
    String bidderDisplayName,
    String bidderAvatarUrl,
    String bidderUsername) {}
