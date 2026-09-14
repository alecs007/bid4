package ro.bid4.backend.catalog.api.dto;

import java.util.List;

public record FeaturedAuctionsResponse(
    List<AuctionResponse> mostWatched, List<AuctionResponse> latest) {}
