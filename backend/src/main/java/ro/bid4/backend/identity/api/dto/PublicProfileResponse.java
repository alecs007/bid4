package ro.bid4.backend.identity.api.dto;

/**
 * The PublicProfile interface in frontend/src/lib/api/users.ts.
 *
 * <p>The counters are what the profile header shows, and they are counted in the database rather
 * than by loading the listings to measure them.
 */
public record PublicProfileResponse(
    PublicUserResponse user, long activeAuctionCount, long completedSaleCount, long causeCount) {}
