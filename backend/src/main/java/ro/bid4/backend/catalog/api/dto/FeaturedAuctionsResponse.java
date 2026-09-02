package ro.bid4.backend.catalog.api.dto;

import java.util.List;

/**
 * The two homepage rows, in one call because the page needs both to render.
 *
 * <p>The first row was the listings closest to closing. Nothing closes, so it is now the listings
 * the most people are following — the same shape and the same place on the page, answering a
 * different question.
 *
 * <p>The second was a popularity score, which asked almost the same thing again. It is the newest
 * listings now, so the two rows between them cover what is doing well and what has just arrived.
 */
public record FeaturedAuctionsResponse(
    List<AuctionResponse> mostWatched, List<AuctionResponse> latest) {}
