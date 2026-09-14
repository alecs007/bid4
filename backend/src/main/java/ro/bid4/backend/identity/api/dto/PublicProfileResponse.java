package ro.bid4.backend.identity.api.dto;

public record PublicProfileResponse(
    PublicUserResponse user, long activeAuctionCount, long completedSaleCount, long causeCount) {}
