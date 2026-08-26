package ro.bid4.backend.catalog.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import ro.bid4.backend.catalog.domain.AuctionStatus;
import ro.bid4.backend.catalog.domain.ItemCondition;
import ro.bid4.backend.cause.api.dto.CauseSummaryResponse;
import ro.bid4.backend.identity.api.dto.PublicUserResponse;

/**
 * Field-for-field the AuctionDetail interface in frontend/src/lib/types/auction.ts.
 *
 * <p>One shape for every read. The list, the detail page, the homepage rows and "more like this"
 * all render the same card, so returning a thinner type from some of them would only mean the
 * frontend held two types that drift.
 *
 * <p>Three fields are null unless they apply, and {@code default-property-inclusion: non_null}
 * drops them from the body rather than sending JSON nulls into optional TypeScript fields:
 *
 * <ul>
 *   <li>{@code reservePrice} — the seller's number and nobody else's. Every other caller is told
 *       {@code reserveMet} and nothing more, which is all the listing page ever shows.
 *   <li>{@code isWatched} and {@code viewerBidStatus} — meaningless without a viewer.
 * </ul>
 */
public record AuctionResponse(
    UUID id,
    UUID sellerId,
    UUID causeId,
    String title,
    String description,
    List<String> images,
    String category,
    ItemCondition condition,
    int weightGrams,
    int donationPercent,
    long startingPrice,
    long currentPrice,
    long bidIncrement,
    Long reservePrice,
    Long buyNowPrice,
    Instant startTime,
    Instant endTime,
    int antiSnipeSeconds,
    AuctionStatus status,
    UUID winnerId,
    int bidCount,
    int watcherCount,
    int extensionCount,
    Instant createdAt,
    PublicUserResponse seller,
    CauseSummaryResponse cause,
    boolean reserveMet,
    // Named explicitly: the frontend reads auction.isWatched, and the "is"
    // prefix is exactly the kind of thing a serialiser is entitled to strip.
    @JsonProperty("isWatched") Boolean isWatched,
    ViewerBidStatus viewerBidStatus) {}
