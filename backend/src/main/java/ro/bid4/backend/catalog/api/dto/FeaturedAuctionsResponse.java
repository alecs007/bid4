package ro.bid4.backend.catalog.api.dto;

import java.util.List;

/** The two homepage rows, in one call because the page needs both to render. */
public record FeaturedAuctionsResponse(
    List<AuctionResponse> endingSoon, List<AuctionResponse> popular) {}
