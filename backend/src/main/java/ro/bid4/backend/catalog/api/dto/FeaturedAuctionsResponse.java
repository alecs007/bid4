package ro.bid4.backend.catalog.api.dto;

import java.util.List;

/**
 * The two homepage rows, in one call because the page needs both to render.
 *
 * <p>The first row was the listings closest to closing. Nothing closes, so it is now the listings
 * the most people are following — the same shape and the same place on the page, answering a
 * different question.
 */
public record FeaturedAuctionsResponse(
    List<AuctionResponse> mostWatched, List<AuctionResponse> popular) {}
