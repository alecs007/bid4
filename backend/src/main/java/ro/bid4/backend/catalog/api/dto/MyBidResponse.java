package ro.bid4.backend.catalog.api.dto;

/**
 * The MyBidSummary interface in frontend/src/lib/api/bids.ts.
 *
 * <p>{@code isWinning} is computed rather than read off the bid's own status, because a bid can sit
 * at WINNING on an auction that has since closed, and "am I winning" is a question about now.
 */
public record MyBidResponse(AuctionResponse auction, BidResponse myTopBid, boolean isWinning) {}
