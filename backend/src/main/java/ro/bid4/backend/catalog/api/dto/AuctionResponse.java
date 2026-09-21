package ro.bid4.backend.catalog.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import ro.bid4.backend.catalog.domain.AuctionStatus;
import ro.bid4.backend.catalog.domain.ItemCondition;
import ro.bid4.backend.cause.api.dto.CauseSummaryResponse;
import ro.bid4.backend.identity.api.dto.PublicUserResponse;

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
    Instant acceptedAt,
    Long acceptedAmount,
    Instant dispatchDeadline,
    AuctionStatus status,
    UUID winnerId,
    int bidCount,
    int watcherCount,
    Instant createdAt,
    PublicUserResponse seller,
    CauseSummaryResponse cause,
    boolean reserveMet,
    @JsonProperty("isWatched") Boolean isWatched,
    ViewerBidStatus viewerBidStatus,
    Long viewerBidAmount) {}
